/**
 * Tool registration and management for MCP server
 */

import { MCPTool, ToolResult } from '../types/mcp-types.js';
import { errorHandler } from '../utils/error-handler.js';

export class ToolRegistry {
	private static instance: ToolRegistry;
	private tools: Map<string, MCPTool> = new Map();

	private constructor() {}

	public static getInstance(): ToolRegistry {
		if (!ToolRegistry.instance) {
			ToolRegistry.instance = new ToolRegistry();
		}
		return ToolRegistry.instance;
	}

	/**
	 * Register a new tool
	 */
	public registerTool(tool: MCPTool): void {
		try {
			if (!tool) {
				throw new Error('Tool is required');
			}

			this.validateTool(tool);
			this.tools.set(tool.name, tool);
		} catch (error) {
			throw new Error(`Failed to register tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Register multiple tools
	 */
	public registerTools(tools: MCPTool[]): void {
		try {
			if (!Array.isArray(tools)) {
				throw new Error('Tools must be an array');
			}

			for (const tool of tools) {
				this.registerTool(tool);
			}
		} catch (error) {
			throw new Error(`Failed to register tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get tool by name
	 */
	public getTool(name: string): MCPTool | undefined {
		try {
			if (!name || typeof name !== 'string') {
				return undefined;
			}
			return this.tools.get(name);
		} catch {
			return undefined;
		}
	}

	/**
	 * Check if tool exists
	 */
	public hasTool(name: string): boolean {
		try {
			return this.tools.has(name);
		} catch {
			return false;
		}
	}

	/**
	 * List all registered tools
	 */
	public listTools(): MCPTool[] {
		try {
			return Array.from(this.tools.values());
		} catch {
			return [];
		}
	}

	/**
	 * Get tool names
	 */
	public getToolNames(): string[] {
		try {
			return Array.from(this.tools.keys());
		} catch {
			return [];
		}
	}

	/**
	 * Execute tool by name
	 */
	public async executeTool(name: string, params: any): Promise<ToolResult> {
		const startTime = Date.now();
		
		try {
			// Get tool
			const tool = this.getTool(name);
			if (!tool) {
				throw new Error(`Tool '${name}' not found`);
			}

			// Validate parameters if schema is provided
			if (tool.inputSchema) {
				this.validateToolParameters(params, tool.inputSchema);
			}

			// Execute tool handler
			const result = await tool.handler(params);
			
			// Log successful execution
			const duration = Date.now() - startTime;
			this.logToolExecution(name, duration, true);
			
			return result;
		} catch (error) {
			// Log failed execution
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			this.logToolExecution(name, duration, false, errorMessage);
			
			// Return error result
			return errorHandler.createErrorResult(error, {
				operation: 'tool_execution',
				toolName: name,
				timestamp: new Date()
			});
		}
	}

	/**
	 * Remove tool by name
	 */
	public removeTool(name: string): boolean {
		try {
			return this.tools.delete(name);
		} catch {
			return false;
		}
	}

	/**
	 * Clear all tools
	 */
	public clearTools(): void {
		try {
			this.tools.clear();
		} catch {
			// Silent fail
		}
	}

	/**
	 * Get tool count
	 */
	public getToolCount(): number {
		try {
			return this.tools.size;
		} catch {
			return 0;
		}
	}

	/**
	 * Get tools by category (based on name prefix)
	 */
	public getToolsByCategory(category: string): MCPTool[] {
		try {
			if (!category || typeof category !== 'string') {
				return [];
			}

			const tools: MCPTool[] = [];
			for (const tool of this.tools.values()) {
				if (tool.name.startsWith(category)) {
					tools.push(tool);
				}
			}
			return tools;
		} catch {
			return [];
		}
	}

	/**
	 * Search tools by description
	 */
	public searchTools(query: string): MCPTool[] {
		try {
			if (!query || typeof query !== 'string') {
				return [];
			}

			const searchTerm = query.toLowerCase();
			const tools: MCPTool[] = [];

			for (const tool of this.tools.values()) {
				if (tool.name.toLowerCase().includes(searchTerm) ||
					tool.description.toLowerCase().includes(searchTerm)) {
					tools.push(tool);
				}
			}

			return tools;
		} catch {
			return [];
		}
	}

	/**
	 * Validate tool structure
	 */
	private validateTool(tool: MCPTool): void {
		if (!tool.name || typeof tool.name !== 'string') {
			throw new Error('Tool name is required and must be a string');
		}

		if (!tool.description || typeof tool.description !== 'string') {
			throw new Error('Tool description is required and must be a string');
		}

		if (!tool.handler || typeof tool.handler !== 'function') {
			throw new Error('Tool handler is required and must be a function');
		}

		if (tool.inputSchema && typeof tool.inputSchema !== 'object') {
			throw new Error('Tool input schema must be an object');
		}

		// Check for duplicate tool names
		if (this.tools.has(tool.name)) {
			throw new Error(`Tool '${tool.name}' is already registered`);
		}
	}

	/**
	 * Validate tool parameters against schema
	 */
	private validateToolParameters(params: any, schema: any): void {
		try {
			// Basic validation - check required properties
			if (schema.required && Array.isArray(schema.required)) {
				for (const requiredField of schema.required) {
					if (!params || !(requiredField in params)) {
						throw new Error(`Missing required parameter: ${requiredField}`);
					}
				}
			}

			// Additional validation could be added here using a schema validator
		} catch (error) {
			throw new Error(`Parameter validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Log tool execution
	 */
	private logToolExecution(toolName: string, duration: number, success: boolean, error?: string): void {
		try {
			// In a real implementation, this would use the logger
			// For now, we'll use console as fallback
			if (typeof console !== 'undefined') {
				const logData = {
					toolName,
					duration,
					success,
					error,
					timestamp: new Date().toISOString()
				};
				console.log('Tool execution:', logData);
			}
		} catch {
			// Silent fail for logging
		}
	}

	/**
	 * Get tool statistics
	 */
	public getToolStats(): { totalTools: number; categories: Record<string, number> } {
		try {
			const stats = {
				totalTools: this.tools.size,
				categories: {} as Record<string, number>
			};

			// Count tools by category (based on name prefix)
			for (const tool of this.tools.values()) {
				const category = tool.name.split('_')[0] || 'uncategorized';
				stats.categories[category] = (stats.categories[category] || 0) + 1;
			}

			return stats;
		} catch {
			return { totalTools: 0, categories: {} };
		}
	}

	/**
	 * Export tool definitions for MCP protocol
	 */
	public exportToolDefinitions(): any[] {
		try {
			const definitions: any[] = [];

			for (const tool of this.tools.values()) {
				definitions.push({
					name: tool.name,
					description: tool.description,
					inputSchema: tool.inputSchema || {
						type: 'object',
						properties: {},
						additionalProperties: true
					}
				});
			}

			return definitions;
		} catch {
			return [];
		}
	}

	/**
	 * Validate all registered tools
	 */
	public validateAllTools(): { valid: string[]; invalid: string[] } {
		const result = { valid: [] as string[], invalid: [] as string[] };

		try {
			for (const [name, tool] of this.tools.entries()) {
				try {
					this.validateTool(tool);
					result.valid.push(name);
				} catch {
					result.invalid.push(name);
				}
			}
		} catch {
			// Return partial results on error
		}

		return result;
	}
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance();