export interface CursorDirectoryEntry {
	name: string;
	slug: string;
	description: string;
	repository: string;
	category: string;
	tags: string[];
	author: string;
	license: string;
	version: string;
	mcpVersion: string;
	installation: InstallationInfo;
	configuration: ConfigurationInfo;
	tools: string[];
}

export interface InstallationInfo {
	npm: string;
	npx: string;
	global?: string;
}

export interface ConfigurationInfo {
	required: string[];
	optional: string[];
	example?: object;
}

import { McpComplianceResult } from '../validators/mcp-compliance-validator.js';
import { PackageJsonStructure } from '../validators/repository-validator.js';

export class DirectoryEntryGenerator {
	private readonly categoryMap = {
		'cms': 'Content Management',
		'content': 'Content Management',
		'api': 'API Integration',
		'rest': 'API Integration',
		'auth': 'Authentication',
		'oauth': 'Authentication',
		'data': 'Data Management',
		'database': 'Data Management',
		'web': 'Web Development',
		'analytics': 'Analytics',
		'monitoring': 'Monitoring',
		'deployment': 'DevOps',
		'ci': 'DevOps',
		'testing': 'Testing',
		'documentation': 'Documentation'
	};

	private readonly commonTags = [
		'mcp', 'model-context-protocol', 'api', 'cms', 'oauth',
		'authentication', 'content', 'management', 'integration',
		'server', 'tool', 'automation', 'productivity'
	];

	/**
	 * Generates a complete Cursor Directory entry from package info and MCP validation
	 */
	public generateEntry(packageJson: PackageJsonStructure, mcpInfo: McpComplianceResult): CursorDirectoryEntry {
		try {
			const entry: CursorDirectoryEntry = {
				name: this.extractName(packageJson),
				slug: this.generateSlug(packageJson.name || ''),
				description: this.extractDescription(packageJson),
				repository: this.extractRepositoryUrl(packageJson),
				category: this.classifyCategory(packageJson.keywords || []),
				tags: this.filterRelevantTags(packageJson.keywords || []),
				author: this.extractAuthor(packageJson),
				license: packageJson.license || 'MIT',
				version: packageJson.version || '1.0.0',
				mcpVersion: mcpInfo.protocolVersion,
				installation: this.generateInstallationInfo(packageJson),
				configuration: this.extractConfigurationInfo(packageJson),
				tools: mcpInfo.toolsRegistered.map(tool => tool.name)
			};

			return entry;

		} catch (error) {
			throw new Error(`Failed to generate directory entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Extracts and validates package name
	 */
	private extractName(packageJson: PackageJsonStructure): string {
		if (!packageJson.name) {
			throw new Error('Package name is required');
		}

		return packageJson.name;
	}

	/**
	 * Generates URL-safe slug from package name
	 */
	private generateSlug(name: string): string {
		if (!name) {
			throw new Error('Name is required for slug generation');
		}

		let slug = name.toLowerCase();
		
		// Replace non-alphanumeric characters with hyphens
		slug = slug.replace(/[^a-z0-9-]/g, '-');
		
		// Replace multiple consecutive hyphens with single hyphen
		slug = slug.replace(/-+/g, '-');
		
		// Remove leading and trailing hyphens
		slug = slug.replace(/^-|-$/g, '');
		
		// Ensure slug is not empty
		if (slug.length === 0) {
			slug = 'mcp-server';
		}

		return slug;
	}

	/**
	 * Extracts and validates description
	 */
	private extractDescription(packageJson: PackageJsonStructure): string {
		if (!packageJson.description) {
			throw new Error('Package description is required');
		}

		let description = packageJson.description.trim();
		
		// Ensure description is descriptive enough
		if (description.length < 20) {
			description = `${description} - MCP server implementation`;
		}

		return description;
	}

	/**
	 * Extracts repository URL and validates format
	 */
	private extractRepositoryUrl(packageJson: PackageJsonStructure): string {
		if (!packageJson.repository?.url) {
			throw new Error('Repository URL is required');
		}

		let url = packageJson.repository.url;
		
		// Clean up git+https and .git suffixes
		url = url.replace(/^git\+/, '');
		url = url.replace(/\.git$/, '');
		
		// Validate GitHub URL format
		if (!url.includes('github.com')) {
			throw new Error('Repository must be hosted on GitHub');
		}

		return url;
	}

	/**
	 * Classifies package into appropriate category based on keywords
	 */
	private classifyCategory(keywords: string[]): string {
		const lowerKeywords = keywords.map(k => k.toLowerCase());
		
		// Check category mappings in priority order
		const priorityCategories = [
			{ keywords: ['cms', 'content'], category: 'Content Management' },
			{ keywords: ['auth', 'oauth'], category: 'Authentication' },
			{ keywords: ['api', 'rest'], category: 'API Integration' },
			{ keywords: ['data', 'database'], category: 'Data Management' },
			{ keywords: ['analytics'], category: 'Analytics' },
			{ keywords: ['monitoring'], category: 'Monitoring' },
			{ keywords: ['deployment', 'ci', 'devops'], category: 'DevOps' },
			{ keywords: ['web'], category: 'Web Development' },
			{ keywords: ['testing'], category: 'Testing' }
		];

		for (const { keywords: categoryKeywords, category } of priorityCategories) {
			if (categoryKeywords.some(keyword => lowerKeywords.includes(keyword))) {
				return category;
			}
		}

		// Default category for MCP servers
		return 'General';
	}

	/**
	 * Filters and prioritizes relevant tags from keywords
	 */
	private filterRelevantTags(keywords: string[]): string[] {
		const lowerKeywords = keywords.map(k => k.toLowerCase());
		const tags = new Set<string>();

		// Always include MCP-related tags
		tags.add('mcp');
		tags.add('model-context-protocol');

		// Add relevant keywords that are in common tags
		for (const keyword of lowerKeywords) {
			if (this.commonTags.includes(keyword) && keyword !== 'mcp') {
				tags.add(keyword);
			}
		}

		// Add category-specific tags
		for (const keyword of lowerKeywords) {
			if (this.categoryMap[keyword as keyof typeof this.categoryMap]) {
				tags.add(keyword);
			}
		}

		// Limit to reasonable number of tags
		const tagsArray = Array.from(tags).slice(0, 8);
		
		return tagsArray;
	}

	/**
	 * Extracts author information
	 */
	private extractAuthor(packageJson: PackageJsonStructure): string {
		if (packageJson.author) {
			if (typeof packageJson.author === 'string') {
				return packageJson.author;
			}
			// Handle author object format
			if (typeof packageJson.author === 'object' && packageJson.author !== null) {
				const authorObj = packageJson.author as any;
				return authorObj.name || authorObj.email || 'Unknown';
			}
		}

		// Default author for Ingeniux CMS servers
		return 'Ingeniux Corporation';
	}

	/**
	 * Generates installation information
	 */
	private generateInstallationInfo(packageJson: PackageJsonStructure): InstallationInfo {
		const packageName = packageJson.name || 'mcp-server';
		
		const installation: InstallationInfo = {
			npm: `npm install -g ${packageName}`,
			npx: `npx ${packageName}`
		};

		// Add global installation if package has binary
		if (packageJson.bin) {
			installation.global = `npm install -g ${packageName}`;
		}

		return installation;
	}

	/**
	 * Extracts configuration information from package.json and common patterns
	 */
	private extractConfigurationInfo(packageJson: PackageJsonStructure): ConfigurationInfo {
		const configuration: ConfigurationInfo = {
			required: [],
			optional: []
		};

		// Common required environment variables for Ingeniux CMS
		const commonRequired = [
			'CMS_BASE_URL',
			'OAUTH_CLIENT_ID',
			'OAUTH_CLIENT_SECRET'
		];

		const commonOptional = [
			'OAUTH_REDIRECT_URI',
			'API_TIMEOUT',
			'LOG_LEVEL',
			'CACHE_TTL',
			'DEBUG'
		];

		configuration.required = commonRequired;
		configuration.optional = commonOptional;

		// Add example configuration
		configuration.example = {
			CMS_BASE_URL: 'https://your-cms.com/api',
			OAUTH_CLIENT_ID: 'your_client_id',
			OAUTH_CLIENT_SECRET: 'your_client_secret',
			OAUTH_REDIRECT_URI: 'http://localhost:3000/callback',
			LOG_LEVEL: 'info'
		};

		return configuration;
	}

	/**
	 * Validates the generated entry for completeness
	 */
	public validateEntry(entry: CursorDirectoryEntry): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Required field validation
		if (!entry.name || entry.name.trim().length === 0) {
			errors.push('Entry name is required');
		}

		if (!entry.description || entry.description.trim().length < 20) {
			errors.push('Entry description must be at least 20 characters');
		}

		if (!entry.repository || !entry.repository.includes('github.com')) {
			errors.push('Valid GitHub repository URL is required');
		}

		if (!entry.license) {
			errors.push('License is required');
		}

		if (!entry.version || !/^\d+\.\d+\.\d+/.test(entry.version)) {
			errors.push('Valid semantic version is required');
		}

		if (entry.tools.length === 0) {
			errors.push('At least one tool must be registered');
		}

		if (entry.configuration.required.length === 0) {
			errors.push('At least one required configuration variable should be specified');
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * Generates a preview of the directory entry for review
	 */
	public generatePreview(entry: CursorDirectoryEntry): string {
		const preview = `
# ${entry.name}

**Description:** ${entry.description}
**Category:** ${entry.category}
**License:** ${entry.license}
**Version:** ${entry.version}

## Installation
\`\`\`bash
${entry.installation.npm}
\`\`\`

## Configuration
Required environment variables:
${entry.configuration.required.map(env => `- ${env}`).join('\n')}

## Tools Available
${entry.tools.map(tool => `- ${tool}`).join('\n')}

## Repository
${entry.repository}
		`.trim();

		return preview;
	}
}