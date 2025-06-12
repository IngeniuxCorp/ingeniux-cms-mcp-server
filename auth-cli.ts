#!/usr/bin/env node
/**
 * CLI Authentication Tool Main Entry Point
 */

import readline from 'readline';
import { CLIConfig, CLIOptions, AuthResult } from './src/cli/types/cli-types.js';
import { OAuthFlowHandler } from './src/cli/oauth-flow-handler.js';
import { TokenDisplay } from './src/cli/token-display.js';
import { CLIConfigHandler } from './src/cli/cli-config.js';
import { logger } from './src/utils/logger.js';

export class CLIAuthTool {
    private config: CLIConfig | null = null;
    private oauthHandler: OAuthFlowHandler | null = null;
    private tokenDisplay: TokenDisplay;

    constructor() {
        this.tokenDisplay = new TokenDisplay();
    }

    public async main(): Promise<void> {
        try {
            // Parse command line arguments
            const options = this.parseArguments();

            // Load and validate configuration
            console.log('⏳ Loading configuration...');
            this.config = await this.loadConfiguration(options);
            console.log('✅ Configuration loaded');

            // Initialize OAuth handler
            this.oauthHandler = new OAuthFlowHandler(this.config);

            // Check existing authentication
            if (await this.checkExistingAuth()) {
                this.displayMessage('Already authenticated', 'success');
                const tokens = await this.oauthHandler.getCurrentTokens();
                if (tokens) {
                    this.tokenDisplay.display(tokens, options.format as any);
                }
                return;
            }

            // Execute OAuth flow
            const authResult = await this.executeOAuthFlow(options);

            // Display results
            this.displayAuthResult(authResult, options);

        } catch (error) {
            this.handleError(error);
            process.exit(1);
        }
    }

    private parseArguments(): CLIOptions {
        const args = process.argv.slice(2);
        const options: CLIOptions = {
            format: 'table',
            browser: true,
            timeout: '300',
            verbose: false
        };

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (arg === '--help' || arg === '-h') {
                this.showHelp();
                process.exit(0);
            } else if (arg === '--version' || arg === '-v') {
                console.log('CLI Auth Tool v1.0.0');
                process.exit(0);
            } else if (arg === '--format' || arg === '-f') {
                options.format = args[++i] || 'table';
            } else if (arg === '--no-browser') {
                options.browser = false;
            } else if (arg === '--timeout' || arg === '-t') {
                options.timeout = args[++i] || '300';
            } else if (arg === '--verbose') {
                options.verbose = true;
            }
        }

        return options;
    }

    private showHelp(): void {
        console.log(`
CLI OAuth Authentication Tool for CMS MCP Server

Usage: npx tsx auth-cli.ts [options]

Options:
  -f, --format <type>     Output format (json|table|minimal) [default: table]
  --no-browser           Skip automatic browser opening
  -t, --timeout <seconds> Authentication timeout [default: 300]
  --verbose              Enable verbose logging
  -h, --help             Display help information
  -v, --version          Display version information

Environment Variables Required:
  CMS_BASE_URL           Base URL for CMS server
  OAUTH_CLIENT_ID        OAuth client identifier
  OAUTH_CLIENT_SECRET    OAuth client secret
  OAUTH_REDIRECT_URI     OAuth redirect URI

Examples:
  npx tsx auth-cli.ts
  npx tsx auth-cli.ts --format json
  npx tsx auth-cli.ts --no-browser --timeout 600
		`);
    }

    private async loadConfiguration(options: CLIOptions): Promise<CLIConfig> {
        const configHandler = new CLIConfigHandler();
        return await configHandler.loadConfig(options);
    }

    private async checkExistingAuth(): Promise<boolean> {
        try {
            if (!this.oauthHandler) return false;
            return await this.oauthHandler.isAuthenticated();
        } catch {
            return false;
        }
    }

    private async executeOAuthFlow(options: CLIOptions): Promise<AuthResult> {
    	if (!this.oauthHandler) {
    		throw new Error('OAuth handler not initialized');
    	}
   
    	this.displayMessage('Starting OAuth authentication flow...', 'info');
   
    	// Use OAuthManager.getBearerToken() for the entire flow
    	const oauthManager = this.oauthHandler.getOAuthManager();
    	console.log('⏳ Performing complete OAuth flow...');
    	const tokenData = await oauthManager.getBearerToken();
    	console.log('✅ Access token obtained');
   
    	return {
    		success: true,
    		tokens: tokenData,
    		message: 'Authentication completed successfully'
    	};
    }

    private displayAuthInstructions(authUrl: string, openBrowser: boolean): void {
        console.log('\n📋 Authentication Required');
        console.log('Please complete the following steps:');
        console.log('1. Visit the authorization URL below');
        console.log('2. Complete the authentication process');
        console.log('3. Copy the authorization code from the callback');
        console.log('4. Paste the code when prompted\n');

        console.log('Authorization URL:');
        console.log(authUrl);
        console.log();

        if (openBrowser) {
            try {
                // Try to open browser using child_process
                const { spawn } = require('child_process');
                const platform = process.platform;

                let command: string;
                if (platform === 'win32') {
                    command = 'start';
                } else if (platform === 'darwin') {
                    command = 'open';
                } else {
                    command = 'xdg-open';
                }

                spawn(command, [authUrl], { detached: true, stdio: 'ignore' });
                console.log('✅ Browser opened automatically');
            } catch {
                console.log('⚠️ Could not open browser automatically');
            }
        }
    }

    private async promptForAuthCode(timeoutSeconds: string): Promise<string> {
        const timeout = parseInt(timeoutSeconds, 10) * 1000;

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                rl.close();
                reject(new Error('Authentication timeout'));
            }, timeout);

            rl.question('Enter authorization code: ', (code) => {
                clearTimeout(timeoutId);
                rl.close();

                if (!code.trim()) {
                    reject(new Error('Authorization code is required'));
                } else {
                    resolve(code.trim());
                }
            });
        });
    }

    private displayAuthResult(result: AuthResult, options: CLIOptions): void {
        if (result.success && result.tokens) {
            this.displayMessage(result.message, 'success');
            this.tokenDisplay.display(result.tokens, options.format as any);
        } else {
            this.displayMessage(result.message, 'error');
        }
    }

    private displayMessage(message: string, type: 'info' | 'success' | 'error'): void {
        switch (type) {
            case 'info':
                console.log('ℹ️ ' + message);
                break;
            case 'success':
                console.log('✅ ' + message);
                break;
            case 'error':
                console.log('❌ ' + message);
                break;
        }
    }

    private handleError(error: unknown): void {
        console.log('❌ Operation failed');

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('configuration')) {
            console.log('\n❌ Configuration Error:');
            console.log('Required environment variables:');
            console.log('- CMS_BASE_URL');
            console.log('- OAUTH_CLIENT_ID');
            console.log('- OAUTH_CLIENT_SECRET');
            console.log('- OAUTH_REDIRECT_URI');
        } else if (errorMessage.includes('timeout')) {
            console.log('\n❌ Authentication Timeout:');
            console.log('Please try again with --timeout option for more time');
        } else {
            console.log('\n❌ Error: ' + errorMessage);
        }

        logger.error('CLI Auth Tool Error', { error: errorMessage });
    }
}

// Main execution
const cliTool = new CLIAuthTool();
cliTool.main().catch(console.error);