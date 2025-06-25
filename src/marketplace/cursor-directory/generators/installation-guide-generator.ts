export interface InstallationGuide {
	quickStart: string;
	detailed: string;
	troubleshooting: string;
	examples: string;
}

export interface InstallationOptions {
	includePrerequisites?: boolean;
	includeAdvancedConfig?: boolean;
	includeDocker?: boolean;
	includeDevelopment?: boolean;
}

import { CursorDirectoryEntry } from './directory-entry-generator.js';

export class InstallationGuideGenerator {
	/**
	 * Generates comprehensive installation guide for MCP server
	 */
	public generateInstallationGuide(
		entry: CursorDirectoryEntry, 
		options: InstallationOptions = {}
	): InstallationGuide {
		try {
			const guide: InstallationGuide = {
				quickStart: this.generateQuickStart(entry),
				detailed: this.generateDetailedGuide(entry, options),
				troubleshooting: this.generateTroubleshooting(entry),
				examples: this.generateExamples(entry)
			};

			return guide;

		} catch (error) {
			throw new Error(`Failed to generate installation guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Generates quick start installation instructions
	 */
	private generateQuickStart(entry: CursorDirectoryEntry): string {
		const sections: string[] = [];

		sections.push(`# Quick Start: ${entry.name}`);
		sections.push('');
		sections.push(entry.description);
		sections.push('');

		sections.push('## 1. Install');
		sections.push('```bash');
		sections.push(entry.installation.npm);
		sections.push('```');
		sections.push('');

		sections.push('## 2. Configure Environment');
		sections.push('Create a `.env` file or set environment variables:');
		sections.push('```bash');
		entry.configuration.required.forEach(env => {
			sections.push(`export ${env}="your_${env.toLowerCase()}"`);
		});
		sections.push('```');
		sections.push('');

		sections.push('## 3. Add to Cursor');
		sections.push('Add this to your Cursor settings (`Settings > Extensions > MCP`):');
		sections.push('```json');
		sections.push(this.generateBasicCursorConfig(entry));
		sections.push('```');
		sections.push('');

		sections.push('## 4. Restart Cursor');
		sections.push('Restart Cursor to load the MCP server.');

		return sections.join('\n');
	}

	/**
	 * Generates detailed installation guide
	 */
	private generateDetailedGuide(entry: CursorDirectoryEntry, options: InstallationOptions): string {
		const sections: string[] = [];

		sections.push(`# Installation Guide: ${entry.name}`);
		sections.push('');

		// Prerequisites
		if (options.includePrerequisites) {
			sections.push('## Prerequisites');
			sections.push('- Node.js 18+ installed');
			sections.push('- npm or yarn package manager');
			sections.push('- Cursor editor with MCP support');
			sections.push('- Access to Ingeniux CMS instance');
			sections.push('- OAuth client credentials configured');
			sections.push('');
		}

		// Installation methods
		sections.push('## Installation Methods');
		sections.push('');

		sections.push('### Method 1: Global Installation (Recommended)');
		sections.push('```bash');
		sections.push(entry.installation.npm);
		sections.push('```');
		sections.push('');

		sections.push('### Method 2: Using npx (No Installation)');
		sections.push('```bash');
		sections.push(entry.installation.npx);
		sections.push('```');
		sections.push('');

		if (options.includeDocker) {
			sections.push('### Method 3: Docker (Advanced)');
			sections.push('```bash');
			sections.push('docker run -d \\');
			sections.push('  --name ingeniux-mcp \\');
			sections.push('  -e CMS_BASE_URL="your_cms_url" \\');
			sections.push('  -e OAUTH_CLIENT_ID="your_client_id" \\');
			sections.push('  -e OAUTH_CLIENT_SECRET="your_client_secret" \\');
			sections.push(`  ${entry.name}`);
			sections.push('```');
			sections.push('');
		}

		// Environment configuration
		sections.push('## Environment Configuration');
		sections.push('');

		sections.push('### Required Variables');
		entry.configuration.required.forEach(env => {
			sections.push(`#### \`${env}\``);
			sections.push(this.getEnvDescription(env));
			sections.push('');
		});

		if (entry.configuration.optional.length > 0) {
			sections.push('### Optional Variables');
			entry.configuration.optional.forEach(env => {
				sections.push(`#### \`${env}\``);
				sections.push(this.getEnvDescription(env));
				sections.push('');
			});
		}

		// Cursor configuration
		sections.push('## Cursor Configuration');
		sections.push('');
		sections.push('### Basic Configuration');
		sections.push('Add to your Cursor settings:');
		sections.push('```json');
		sections.push(this.generateBasicCursorConfig(entry));
		sections.push('```');
		sections.push('');

		if (options.includeAdvancedConfig) {
			sections.push('### Advanced Configuration');
			sections.push('```json');
			sections.push(this.generateAdvancedCursorConfig(entry));
			sections.push('```');
			sections.push('');
		}

		// Development setup
		if (options.includeDevelopment) {
			sections.push('## Development Setup');
			sections.push('For development and testing:');
			sections.push('');
			sections.push('```bash');
			sections.push('# Clone repository');
			sections.push(`git clone ${entry.repository}`);
			sections.push(`cd ${entry.name}`);
			sections.push('');
			sections.push('# Install dependencies');
			sections.push('npm install');
			sections.push('');
			sections.push('# Build project');
			sections.push('npm run build');
			sections.push('');
			sections.push('# Run in development mode');
			sections.push('npm run dev');
			sections.push('```');
			sections.push('');
		}

		// Verification
		sections.push('## Verification');
		sections.push('To verify the installation:');
		sections.push('');
		sections.push('1. Check server status:');
		sections.push('```bash');
		sections.push(`${entry.installation.npx} --health-check`);
		sections.push('```');
		sections.push('');
		sections.push('2. Test in Cursor:');
		sections.push('   - Open Cursor');
		sections.push('   - Check MCP server status in settings');
		sections.push('   - Try using one of the available tools');

		return sections.join('\n');
	}

	/**
	 * Generates troubleshooting guide
	 */
	private generateTroubleshooting(entry: CursorDirectoryEntry): string {
		const sections: string[] = [];

		sections.push(`# Troubleshooting: ${entry.name}`);
		sections.push('');

		sections.push('## Common Issues');
		sections.push('');

		sections.push('### Server Not Starting');
		sections.push('**Symptoms:** Server fails to start or connect');
		sections.push('');
		sections.push('**Solutions:**');
		sections.push('1. Check environment variables are set correctly');
		sections.push('2. Verify Node.js version (18+ required)');
		sections.push('3. Check network connectivity to CMS');
		sections.push('');
		sections.push('```bash');
		sections.push('# Debug mode');
		sections.push('DEBUG=* ' + entry.installation.npx);
		sections.push('```');
		sections.push('');

		sections.push('### Authentication Errors');
		sections.push('**Symptoms:** OAuth or API authentication failures');
		sections.push('');
		sections.push('**Solutions:**');
		sections.push('1. Verify OAuth client credentials');
		sections.push('2. Check CMS base URL is correct');
		sections.push('3. Ensure redirect URI is configured properly');
		sections.push('');
		sections.push('```bash');
		sections.push('# Test authentication');
		sections.push(`${entry.installation.npx} --test-auth`);
		sections.push('```');
		sections.push('');

		sections.push('### Tools Not Available');
		sections.push('**Symptoms:** MCP tools not showing in Cursor');
		sections.push('');
		sections.push('**Solutions:**');
		sections.push('1. Restart Cursor completely');
		sections.push('2. Check MCP server logs');
		sections.push('3. Verify Cursor configuration syntax');
		sections.push('');

		sections.push('### Performance Issues');
		sections.push('**Symptoms:** Slow response times or timeouts');
		sections.push('');
		sections.push('**Solutions:**');
		sections.push('1. Increase API timeout value');
		sections.push('2. Check network latency to CMS');
		sections.push('3. Enable caching if available');
		sections.push('');
		sections.push('```bash');
		sections.push('# Increase timeout');
		sections.push('export API_TIMEOUT=60000');
		sections.push('```');
		sections.push('');

		sections.push('## Debug Commands');
		sections.push('');
		sections.push('```bash');
		sections.push('# Check server health');
		sections.push(`${entry.installation.npx} --health`);
		sections.push('');
		sections.push('# View configuration');
		sections.push(`${entry.installation.npx} --config`);
		sections.push('');
		sections.push('# Test connection');
		sections.push(`${entry.installation.npx} --test-connection`);
		sections.push('');
		sections.push('# Enable verbose logging');
		sections.push('export LOG_LEVEL=debug');
		sections.push(entry.installation.npx);
		sections.push('```');
		sections.push('');

		sections.push('## Getting Help');
		sections.push('If you continue to experience issues:');
		sections.push('');
		sections.push(`1. Check the [repository issues](${entry.repository}/issues)`);
		sections.push('2. Review the server logs for error details');
		sections.push('3. Create a new issue with:');
		sections.push('   - Your environment details');
		sections.push('   - Complete error messages');
		sections.push('   - Steps to reproduce');
		sections.push('   - Your configuration (without credentials)');

		return sections.join('\n');
	}

	/**
	 * Generates usage examples
	 */
	private generateExamples(entry: CursorDirectoryEntry): string {
		const sections: string[] = [];

		sections.push(`# Usage Examples: ${entry.name}`);
		sections.push('');

		sections.push('## Basic Usage');
		sections.push('Once configured, you can use the following tools in Cursor:');
		sections.push('');

		// Generate examples for each tool
		entry.tools.forEach(tool => {
			sections.push(`### ${tool}`);
			sections.push(this.getToolExample(tool));
			sections.push('');
		});

		sections.push('## Configuration Examples');
		sections.push('');

		sections.push('### Development Environment');
		sections.push('```json');
		sections.push(this.generateDevConfig(entry));
		sections.push('```');
		sections.push('');

		sections.push('### Production Environment');
		sections.push('```json');
		sections.push(this.generateProdConfig(entry));
		sections.push('```');
		sections.push('');

		sections.push('## Environment Files');
		sections.push('');
		sections.push('### .env.development');
		sections.push('```bash');
		sections.push('CMS_BASE_URL=https://dev-cms.example.com/api');
		sections.push('OAUTH_CLIENT_ID=dev_client_id');
		sections.push('OAUTH_CLIENT_SECRET=dev_client_secret');
		sections.push('LOG_LEVEL=debug');
		sections.push('DEBUG=true');
		sections.push('```');
		sections.push('');

		sections.push('### .env.production');
		sections.push('```bash');
		sections.push('CMS_BASE_URL=https://cms.example.com/api');
		sections.push('OAUTH_CLIENT_ID=prod_client_id');
		sections.push('OAUTH_CLIENT_SECRET=prod_client_secret');
		sections.push('LOG_LEVEL=info');
		sections.push('API_TIMEOUT=30000');
		sections.push('CACHE_TTL=300');
		sections.push('```');

		return sections.join('\n');
	}

	/**
	 * Generates basic Cursor configuration
	 */
	private generateBasicCursorConfig(entry: CursorDirectoryEntry): string {
		const config = {
			mcpServers: {
				[entry.slug]: {
					command: 'npx',
					args: [entry.name],
					env: {} as Record<string, string>
				}
			}
		};

		// Add required environment variables
		entry.configuration.required.forEach(env => {
			config.mcpServers[entry.slug].env[env] = `your_${env.toLowerCase()}`;
		});

		return JSON.stringify(config, null, 2);
	}

	/**
	 * Generates advanced Cursor configuration
	 */
	private generateAdvancedCursorConfig(entry: CursorDirectoryEntry): string {
		const config = {
			mcpServers: {
				[entry.slug]: {
					command: 'npx',
					args: [entry.name],
					env: {} as Record<string, string>
				}
			}
		};

		// Add all environment variables
		[...entry.configuration.required, ...entry.configuration.optional].forEach(env => {
			config.mcpServers[entry.slug].env[env] = `your_${env.toLowerCase()}`;
		});

		return JSON.stringify(config, null, 2);
	}

	/**
	 * Generates development configuration
	 */
	private generateDevConfig(entry: CursorDirectoryEntry): string {
		const config = {
			mcpServers: {
				[entry.slug]: {
					command: 'npx',
					args: [entry.name],
					env: {
						CMS_BASE_URL: 'https://dev-cms.example.com/api',
						OAUTH_CLIENT_ID: 'dev_client_id',
						OAUTH_CLIENT_SECRET: 'dev_client_secret',
					} as Record<string, string>
				}
			}
		};

		// Add development-specific settings
		config.mcpServers[entry.slug].env.LOG_LEVEL = 'debug';
		config.mcpServers[entry.slug].env.DEBUG = 'true';

		return JSON.stringify(config, null, 2);
	}

	/**
	 * Generates production configuration
	 */
	private generateProdConfig(entry: CursorDirectoryEntry): string {
		const config = {
			mcpServers: {
				[entry.slug]: {
					command: entry.name,
					args: [],
					env: {
						CMS_BASE_URL: 'https://cms.example.com/api',
						OAUTH_CLIENT_ID: 'prod_client_id',
						OAUTH_CLIENT_SECRET: 'prod_client_secret',
					} as Record<string, string>
				}
			}
		};

		// Add production-specific settings
		config.mcpServers[entry.slug].env.LOG_LEVEL = 'info';
		config.mcpServers[entry.slug].env.API_TIMEOUT = '30000';
		config.mcpServers[entry.slug].env.CACHE_TTL = '300';

		return JSON.stringify(config, null, 2);
	}

	/**
	 * Gets description for environment variables
	 */
	private getEnvDescription(envVar: string): string {
		const descriptions: Record<string, string> = {
			'CMS_BASE_URL': 'The base URL for your Ingeniux CMS API endpoint (e.g., https://your-cms.com/api)',
			'OAUTH_CLIENT_ID': 'OAuth client ID obtained from your CMS OAuth configuration',
			'OAUTH_CLIENT_SECRET': 'OAuth client secret obtained from your CMS OAuth configuration',
			'OAUTH_REDIRECT_URI': 'OAuth redirect URI for authentication flow (default: http://localhost:3000/callback)',
			'API_TIMEOUT': 'API request timeout in milliseconds (default: 30000)',
			'LOG_LEVEL': 'Logging level: debug, info, warn, error (default: info)',
			'CACHE_TTL': 'Cache time-to-live in seconds (default: 300)',
			'DEBUG': 'Enable debug mode: true or false (default: false)'
		};

		return descriptions[envVar] || `Configuration value for ${envVar}`;
	}

	/**
	 * Gets usage example for tools
	 */
	private getToolExample(toolName: string): string {
		const examples: Record<string, string> = {
			'cms_endpoint_lister': 'Ask Cursor: "What CMS endpoints are available?" or "List all available CMS operations"',
			'cms_schema_provider': 'Ask Cursor: "Show me the schema for the pages endpoint" or "What parameters does the create page endpoint need?"',
			'cms_endpoint_executor': 'Ask Cursor: "Create a new page with title \'My Page\'" or "Get the page with ID 123"',
			'health_check': 'Ask Cursor: "Check the CMS server health" or "Is the MCP server working?"',
			'auth_status': 'Ask Cursor: "Check my authentication status" or "Am I logged in to the CMS?"',
			'initiate_oauth': 'Ask Cursor: "Start OAuth authentication" or "Log me in to the CMS"'
		};

		return examples[toolName] || `Use the ${toolName.replace(/_/g, ' ')} tool to perform related operations.`;
	}
}