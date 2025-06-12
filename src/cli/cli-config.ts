/**
 * CLI Configuration Management
 */

import { configManager } from '../utils/config-manager.js';
import { ServerConfig } from '../types/config-types.js';
import { CLIOptions, CLIConfig } from './types/cli-types.js';
import { logger } from '../utils/logger.js';

export class CLIConfigHandler {
	public async loadConfig(options: CLIOptions): Promise<CLIConfig> {
		try {
			// Load base server configuration
			const serverConfig = configManager.loadConfiguration();
			
			// Validate required environment variables
			this.validateEnvironment();
			
			// Merge with CLI options
			const cliConfig = this.mergeWithCLIOptions(serverConfig, options);
			
			// Validate final configuration
			this.validateCLIConfig(cliConfig);
			
			logger.info('CLI configuration loaded successfully', {
				format: cliConfig.format,
				timeout: cliConfig.timeoutSeconds,
				verbose: cliConfig.verbose
			});
			
			return cliConfig;
		} catch (error) {
			logger.error('Failed to load CLI configuration', { error });
			throw new Error(`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private validateEnvironment(): void {
		const validation = configManager.checkRequiredEnvVars();
		if (!validation.isValid) {
			throw new Error(`Missing required environment variables: ${validation.errors.join(', ')}`);
		}
	}

	private mergeWithCLIOptions(serverConfig: ServerConfig, options: CLIOptions): CLIConfig {
		return {
			// Server configuration
			oauth: serverConfig.oauth,
			cmsBaseUrl: serverConfig.cmsBaseUrl,
			apiTimeout: serverConfig.apiTimeout,
			
			// CLI-specific options
			format: this.validateFormat(options.format),
			openBrowser: options.browser !== false,
			timeoutSeconds: parseInt(options.timeout || '300', 10),
			verbose: options.verbose || false
		};
	}

	private validateFormat(format: string): 'json' | 'table' | 'minimal' {
		const validFormats = ['json', 'table', 'minimal'];
		if (!validFormats.includes(format)) {
			logger.warn(`Invalid format '${format}', using 'table'`);
			return 'table';
		}
		return format as 'json' | 'table' | 'minimal';
	}

	private validateCLIConfig(config: CLIConfig): void {
		// Validate timeout
		if (config.timeoutSeconds < 30 || config.timeoutSeconds > 1800) {
			throw new Error('Timeout must be between 30 and 1800 seconds');
		}
		
		// Validate OAuth configuration
		if (!config.oauth.clientId || !config.oauth.clientSecret) {
			throw new Error('OAuth client credentials are required');
		}
		
		// Validate URLs
		try {
			new URL(config.oauth.authorizationUrl);
			new URL(config.oauth.tokenUrl);
			new URL(config.oauth.redirectUri);
		} catch {
			throw new Error('Invalid OAuth URLs in configuration');
		}
	}

	public getDefaultConfig(): Partial<CLIConfig> {
		return {
			format: 'table',
			openBrowser: true,
			timeoutSeconds: 300,
			verbose: false
		};
	}
}