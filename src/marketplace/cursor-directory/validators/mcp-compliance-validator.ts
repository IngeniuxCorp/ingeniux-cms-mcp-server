export interface ToolInfo {
	name: string;
	description: string;
	hasInputSchema: boolean;
	inputSchema?: object;
}

export interface McpComplianceResult {
	isCompliant: boolean;
	protocolVersion: string;
	toolsRegistered: ToolInfo[];
	errors: string[];
	warnings: string[];
}

export interface McpServer {
	getProtocolVersion?(): string;
	getRegisteredTools?(): ToolInfo[];
	listTools?(): Promise<{ tools: ToolInfo[] }>;
	handleRequest?(request: any): Promise<any>;
}

import * as fs from 'fs';
import * as path from 'path';

export class McpComplianceValidator {
	private readonly requiredMethods = [
		'listTools',
		'callTool'
	];

	/**
	 * Validates MCP server compliance for Cursor Directory requirements
	 */
	public async validateMcpCompliance(entryPoint: string): Promise<McpComplianceResult> {
		const result: McpComplianceResult = {
			isCompliant: false,
			protocolVersion: '',
			toolsRegistered: [],
			errors: [],
			warnings: []
		};

		try {
			// Check if entry point exists
			if (!fs.existsSync(entryPoint)) {
				result.errors.push(`Entry point does not exist: ${entryPoint}`);
				return result;
			}

			// Basic file structure validation
			await this.validateEntryPointStructure(entryPoint, result);

			// Try to analyze server implementation
			await this.analyzeServerImplementation(entryPoint, result);

			// Set compliance status
			result.isCompliant = result.errors.length === 0;

		} catch (error) {
			result.errors.push(`MCP compliance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}

		return result;
	}

	/**
	 * Validates the basic structure of the entry point file
	 */
	private async validateEntryPointStructure(entryPoint: string, result: McpComplianceResult): Promise<void> {
		try {
			const content = fs.readFileSync(entryPoint, 'utf-8');

			// Check for shebang
			if (!content.startsWith('#!/usr/bin/env node')) {
				result.warnings.push('Entry point should include shebang for CLI execution');
			}

			// Check for MCP-related imports/patterns
			const mcpPatterns = [
				'@modelcontextprotocol',
				'mcp-server',
				'Server',
				'listTools',
				'callTool'
			];

			let foundMcpPatterns = 0;
			for (const pattern of mcpPatterns) {
				if (content.includes(pattern)) {
					foundMcpPatterns++;
				}
			}

			if (foundMcpPatterns === 0) {
				result.errors.push('Entry point does not appear to contain MCP server implementation');
				return;
			}

			// Check for tool registration patterns
			if (!content.includes('listTools') && !content.includes('tools')) {
				result.warnings.push('No tool registration patterns found in entry point');
			}

			// Check for error handling
			if (!content.includes('try') && !content.includes('catch')) {
				result.warnings.push('No error handling patterns found in entry point');
			}

			// Estimate protocol version (default to 1.0.0 if not detectable)
			result.protocolVersion = this.extractProtocolVersion(content);

		} catch (error) {
			result.errors.push(`Failed to read entry point: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Analyzes server implementation for MCP compliance
	 */
	private async analyzeServerImplementation(entryPoint: string, result: McpComplianceResult): Promise<void> {
		try {
			const content = fs.readFileSync(entryPoint, 'utf-8');

			// Extract tool information from the file content
			const tools = this.extractToolsFromContent(content);
			result.toolsRegistered = tools;

			if (tools.length === 0) {
				result.warnings.push('No tools detected in server implementation');
			}

			// Validate tool structure
			for (const tool of tools) {
				this.validateToolStructure(tool, result);
			}

			// Check for standard MCP server patterns
			this.validateMcpServerPatterns(content, result);

		} catch (error) {
			result.errors.push(`Failed to analyze server implementation: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Extracts protocol version from content
	 */
	private extractProtocolVersion(content: string): string {
		// Look for version patterns in imports or configuration
		const versionPatterns = [
			/version:\s*["']([^"']+)["']/,
			/@modelcontextprotocol\/sdk@([^\s'"]+)/,
			/protocolVersion:\s*["']([^"']+)["']/
		];

		for (const pattern of versionPatterns) {
			const match = content.match(pattern);
			if (match && match[1]) {
				return match[1];
			}
		}

		// Default to 1.0.0 if not found
		return '1.0.0';
	}

	/**
	 * Extracts tool information from server content
	 */
	private extractToolsFromContent(content: string): ToolInfo[] {
		const tools: ToolInfo[] = [];

		try {
			// Look for tool registration patterns
			const toolPatterns = [
				/name:\s*["']([^"']+)["'],?\s*description:\s*["']([^"']+)["']/g,
				/{\s*name:\s*["']([^"']+)["'],.*?description:\s*["']([^"']+)["']/gs,
				/addTool\(\s*["']([^"']+)["'],\s*["']([^"']+)["']/g
			];

			for (const pattern of toolPatterns) {
				let match;
				while ((match = pattern.exec(content)) !== null) {
					const tool: ToolInfo = {
						name: match[1],
						description: match[2],
						hasInputSchema: this.hasInputSchemaForTool(content, match[1])
					};
					tools.push(tool);
				}
			}

			// Remove duplicates
			const uniqueTools = tools.filter((tool, index, self) => 
				index === self.findIndex(t => t.name === tool.name)
			);

			return uniqueTools;

		} catch (error) {
			// Return empty array if extraction fails
			return [];
		}
	}

	/**
	 * Checks if a tool has an input schema defined
	 */
	private hasInputSchemaForTool(content: string, toolName: string): boolean {
		const schemaPatterns = [
			new RegExp(`${toolName}.*?inputSchema`, 's'),
			new RegExp(`inputSchema.*?${toolName}`, 's'),
			/inputSchema:\s*{/,
			/schema:\s*{/
		];

		return schemaPatterns.some(pattern => pattern.test(content));
	}

	/**
	 * Validates individual tool structure
	 */
	private validateToolStructure(tool: ToolInfo, result: McpComplianceResult): void {
		if (!tool.name || tool.name.trim().length === 0) {
			result.errors.push('Tool missing required name property');
		}

		if (!tool.description || tool.description.trim().length === 0) {
			result.errors.push(`Tool '${tool.name}' missing required description property`);
		}

		// Check tool name format
		if (tool.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(tool.name)) {
			result.warnings.push(`Tool name '${tool.name}' should follow naming conventions (alphanumeric, underscore, hyphen)`);
		}

		// Check description length
		if (tool.description && tool.description.length < 10) {
			result.warnings.push(`Tool '${tool.name}' description should be more descriptive`);
		}
	}

	/**
	 * Validates MCP server patterns and standards
	 */
	private validateMcpServerPatterns(content: string, result: McpComplianceResult): void {
		// Check for server instantiation
		if (!content.includes('Server') && !content.includes('server')) {
			result.warnings.push('No server instantiation patterns found');
		}

		// Check for stdio transport (common for MCP servers)
		if (!content.includes('stdio') && !content.includes('transport')) {
			result.warnings.push('No transport configuration found');
		}

		// Check for proper error handling
		const errorPatterns = [
			/try\s*{[\s\S]*?}\s*catch/,
			/\.catch\(/,
			/throw\s+new\s+Error/
		];

		if (!errorPatterns.some(pattern => pattern.test(content))) {
			result.warnings.push('Insufficient error handling patterns detected');
		}

		// Check for environment configuration
		if (!content.includes('process.env') && !content.includes('config')) {
			result.warnings.push('No environment configuration patterns found');
		}

		// Check for request validation
		if (!content.includes('validate') && !content.includes('schema')) {
			result.warnings.push('No input validation patterns found');
		}
	}

	/**
	 * Validates JSON schema structure
	 */
	public validateJsonSchema(schema: any): boolean {
		if (!schema || typeof schema !== 'object') {
			return false;
		}

		// Basic JSON Schema validation
		if (schema.type && typeof schema.type !== 'string') {
			return false;
		}

		if (schema.properties && typeof schema.properties !== 'object') {
			return false;
		}

		if (schema.required && !Array.isArray(schema.required)) {
			return false;
		}

		return true;
	}
}