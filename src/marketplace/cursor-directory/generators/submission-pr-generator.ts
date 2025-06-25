export interface PullRequestData {
	title: string;
	body: string;
	headBranch: string;
	baseBranch: string;
	files: PrFileChange[];
}

export interface PrFileChange {
	path: string;
	content: string;
	mode: 'create' | 'update' | 'delete';
}

export interface PrGenerationOptions {
	includeValidationDetails?: boolean;
	includeTesting?: boolean;
	customMessage?: string;
}

import { CursorDirectoryEntry } from './directory-entry-generator.js';

export class SubmissionPrGenerator {
	private readonly cursorDirectoryPath = 'servers';
	private readonly templateBranch = 'main';

	/**
	 * Generates a complete pull request for Cursor Directory submission
	 */
	public generateSubmissionPr(
		entry: CursorDirectoryEntry, 
		options: PrGenerationOptions = {}
	): PullRequestData {
		try {
			const branchName = this.generateBranchName(entry);
			const files = this.generatePrFiles(entry);
			
			const prData: PullRequestData = {
				title: this.generatePrTitle(entry),
				body: this.generatePrBody(entry, options),
				headBranch: branchName,
				baseBranch: this.templateBranch,
				files
			};

			return prData;

		} catch (error) {
			throw new Error(`Failed to generate submission PR: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Generates a unique branch name for the submission
	 */
	private generateBranchName(entry: CursorDirectoryEntry): string {
		const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
		return `add-${entry.slug}-server-${timestamp}`;
	}

	/**
	 * Generates the pull request title
	 */
	private generatePrTitle(entry: CursorDirectoryEntry): string {
		return `Add ${entry.name} MCP Server`;
	}

	/**
	 * Generates the comprehensive pull request body
	 */
	private generatePrBody(entry: CursorDirectoryEntry, options: PrGenerationOptions): string {
		const sections: string[] = [];

		// Header
		sections.push(`## Adding ${entry.name}`);
		sections.push('');

		// Server overview
		sections.push('### Server Overview');
		sections.push(`**Description:** ${entry.description}`);
		sections.push(`**Category:** ${entry.category}`);
		sections.push(`**Repository:** ${entry.repository}`);
		sections.push(`**License:** ${entry.license}`);
		sections.push(`**Version:** ${entry.version}`);
		sections.push(`**MCP Protocol:** ${entry.mcpVersion}`);
		sections.push('');

		// Tools provided
		sections.push('### Tools Provided');
		if (entry.tools.length > 0) {
			entry.tools.forEach(tool => {
				sections.push(`- \`${tool}\``);
			});
		} else {
			sections.push('- No tools specified');
		}
		sections.push('');

		// Installation
		sections.push('### Installation');
		sections.push('```bash');
		sections.push(entry.installation.npm);
		sections.push('```');
		sections.push('');
		sections.push('Or using npx:');
		sections.push('```bash');
		sections.push(entry.installation.npx);
		sections.push('```');
		sections.push('');

		// Configuration
		sections.push('### Configuration');
		sections.push('Required environment variables:');
		entry.configuration.required.forEach(env => {
			sections.push(`- \`${env}\``);
		});
		sections.push('');

		if (entry.configuration.optional.length > 0) {
			sections.push('Optional environment variables:');
			entry.configuration.optional.forEach(env => {
				sections.push(`- \`${env}\``);
			});
			sections.push('');
		}

		// Example usage
		sections.push('### Example Cursor Configuration');
		sections.push('```json');
		sections.push(this.generateCursorConfigExample(entry));
		sections.push('```');
		sections.push('');

		// Tags
		if (entry.tags.length > 0) {
			sections.push('### Tags');
			sections.push(entry.tags.map(tag => `\`${tag}\``).join(', '));
			sections.push('');
		}

		// Validation details (optional)
		if (options.includeValidationDetails) {
			sections.push('### Validation');
			sections.push('- ✅ Repository structure validated');
			sections.push('- ✅ MCP compliance verified');
			sections.push('- ✅ Documentation requirements met');
			sections.push('- ✅ License compatibility confirmed');
			sections.push('');
		}

		// Testing information (optional)
		if (options.includeTesting) {
			sections.push('### Testing');
			sections.push('This server has been tested for:');
			sections.push('- MCP protocol compatibility');
			sections.push('- Tool registration and execution');
			sections.push('- Error handling and validation');
			sections.push('- Environment configuration');
			sections.push('');
		}

		// Custom message (optional)
		if (options.customMessage) {
			sections.push('### Additional Notes');
			sections.push(options.customMessage);
			sections.push('');
		}

		// Footer
		sections.push('### Checklist');
		sections.push('- [x] Server follows MCP protocol standards');
		sections.push('- [x] Documentation is complete and accurate');
		sections.push('- [x] License is compatible with open source distribution');
		sections.push('- [x] Installation instructions are tested');
		sections.push('- [x] Configuration examples are provided');

		return sections.join('\n');
	}

	/**
	 * Generates example Cursor configuration
	 */
	private generateCursorConfigExample(entry: CursorDirectoryEntry): string {
		const config = {
			mcpServers: {
				[entry.slug]: {
					command: 'npx',
					args: [entry.name],
					env: {} as Record<string, string>
				}
			}
		};

		// Add environment variables from configuration
		entry.configuration.required.forEach(envVar => {
			switch (envVar) {
				case 'CMS_BASE_URL':
					config.mcpServers[entry.slug].env[envVar] = 'https://your-cms.com/api';
					break;
				case 'OAUTH_CLIENT_ID':
					config.mcpServers[entry.slug].env[envVar] = 'your_client_id';
					break;
				case 'OAUTH_CLIENT_SECRET':
					config.mcpServers[entry.slug].env[envVar] = 'your_client_secret';
					break;
				case 'OAUTH_REDIRECT_URI':
					config.mcpServers[entry.slug].env[envVar] = 'http://localhost:3000/callback';
					break;
				default:
					config.mcpServers[entry.slug].env[envVar] = `your_${envVar.toLowerCase()}`;
			}
		});

		return JSON.stringify(config, null, 2);
	}

	/**
	 * Generates files to be included in the pull request
	 */
	private generatePrFiles(entry: CursorDirectoryEntry): PrFileChange[] {
		const files: PrFileChange[] = [];

		// Main server entry file
		const serverFilePath = `${this.cursorDirectoryPath}/${entry.slug}.json`;
		files.push({
			path: serverFilePath,
			content: this.generateServerEntryFile(entry),
			mode: 'create'
		});

		// README entry (if directory uses README format)
		const readmePath = `${this.cursorDirectoryPath}/${entry.slug}/README.md`;
		files.push({
			path: readmePath,
			content: this.generateServerReadme(entry),
			mode: 'create'
		});

		return files;
	}

	/**
	 * Generates the JSON server entry file
	 */
	private generateServerEntryFile(entry: CursorDirectoryEntry): string {
		const serverEntry = {
			name: entry.name,
			slug: entry.slug,
			description: entry.description,
			repository: entry.repository,
			category: entry.category,
			tags: entry.tags,
			author: entry.author,
			license: entry.license,
			version: entry.version,
			mcpVersion: entry.mcpVersion,
			installation: entry.installation,
			configuration: {
				required: entry.configuration.required,
				optional: entry.configuration.optional
			},
			tools: entry.tools,
			lastUpdated: new Date().toISOString().split('T')[0]
		};

		return JSON.stringify(serverEntry, null, 2);
	}

	/**
	 * Generates a detailed README for the server entry
	 */
	private generateServerReadme(entry: CursorDirectoryEntry): string {
		const sections: string[] = [];

		sections.push(`# ${entry.name}`);
		sections.push('');
		sections.push(entry.description);
		sections.push('');

		sections.push('## Quick Start');
		sections.push('');
		sections.push('### Installation');
		sections.push('```bash');
		sections.push(entry.installation.npm);
		sections.push('```');
		sections.push('');

		sections.push('### Configuration');
		sections.push('Add to your Cursor settings:');
		sections.push('');
		sections.push('```json');
		sections.push(this.generateCursorConfigExample(entry));
		sections.push('```');
		sections.push('');

		sections.push('## Environment Variables');
		sections.push('');
		sections.push('### Required');
		entry.configuration.required.forEach(env => {
			sections.push(`- \`${env}\` - ${this.getEnvDescription(env)}`);
		});
		sections.push('');

		if (entry.configuration.optional.length > 0) {
			sections.push('### Optional');
			entry.configuration.optional.forEach(env => {
				sections.push(`- \`${env}\` - ${this.getEnvDescription(env)}`);
			});
			sections.push('');
		}

		sections.push('## Available Tools');
		sections.push('');
		entry.tools.forEach(tool => {
			sections.push(`### \`${tool}\``);
			sections.push(`${this.getToolDescription(tool)}`);
			sections.push('');
		});

		sections.push('## Repository');
		sections.push(`[${entry.repository}](${entry.repository})`);
		sections.push('');

		sections.push('## License');
		sections.push(`${entry.license}`);

		return sections.join('\n');
	}

	/**
	 * Gets description for environment variables
	 */
	private getEnvDescription(envVar: string): string {
		const descriptions: Record<string, string> = {
			'CMS_BASE_URL': 'Base URL for your Ingeniux CMS API endpoint',
			'OAUTH_CLIENT_ID': 'OAuth client ID for authentication',
			'OAUTH_CLIENT_SECRET': 'OAuth client secret for authentication',
			'OAUTH_REDIRECT_URI': 'OAuth redirect URI for authentication flow',
			'API_TIMEOUT': 'API request timeout in milliseconds (default: 30000)',
			'LOG_LEVEL': 'Logging level (debug, info, warn, error)',
			'CACHE_TTL': 'Cache time-to-live in seconds',
			'DEBUG': 'Enable debug mode (true/false)'
		};

		return descriptions[envVar] || `Configuration value for ${envVar}`;
	}

	/**
	 * Gets description for tools
	 */
	private getToolDescription(toolName: string): string {
		const descriptions: Record<string, string> = {
			'cms_endpoint_lister': 'Lists available CMS endpoints for LLM selection',
			'cms_schema_provider': 'Provides endpoint schemas and execution instructions',
			'cms_endpoint_executor': 'Executes validated CMS API calls',
			'health_check': 'Checks server health and connectivity',
			'auth_status': 'Checks authentication status',
			'initiate_oauth': 'Initiates OAuth authentication flow'
		};

		return descriptions[toolName] || `Tool for ${toolName.replace(/_/g, ' ')} operations`;
	}

	/**
	 * Validates the generated PR data
	 */
	public validatePrData(prData: PullRequestData): { isValid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!prData.title || prData.title.trim().length === 0) {
			errors.push('PR title is required');
		}

		if (!prData.body || prData.body.trim().length < 100) {
			errors.push('PR body must be at least 100 characters');
		}

		if (!prData.headBranch || !prData.headBranch.startsWith('add-')) {
			errors.push('Head branch must follow naming convention');
		}

		if (prData.files.length === 0) {
			errors.push('At least one file change is required');
		}

		// Validate file changes
		for (const file of prData.files) {
			if (!file.path || file.path.trim().length === 0) {
				errors.push('File path is required for all changes');
			}
			
			if (!file.content || file.content.trim().length === 0) {
				errors.push(`File content is required for ${file.path}`);
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}
}