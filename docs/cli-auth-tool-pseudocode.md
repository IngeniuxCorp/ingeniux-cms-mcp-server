# CLI Authentication Tool Pseudocode

## Module 1: CLI Main Entry Point (`cli-auth.ts`)

```typescript
// CLI Authentication Tool Main Entry Point
// File: cli-auth.ts
// Dependencies: commander, chalk, ora

IMPORT { Command } from 'commander'
IMPORT chalk from 'chalk'
IMPORT ora from 'ora'
IMPORT { CLIConfig, CLIOptions, AuthResult } from './types/cli-types.js'
IMPORT { OAuthFlowHandler } from './oauth-flow-handler.js'
IMPORT { TokenDisplay } from './token-display.js'
IMPORT { CLIConfigHandler } from './cli-config.js'
IMPORT { logger } from '../src/utils/logger.js'

CLASS CLIAuthTool {
	PRIVATE config: CLIConfig
	PRIVATE oauthHandler: OAuthFlowHandler
	PRIVATE tokenDisplay: TokenDisplay
	PRIVATE spinner: ora.Ora

	CONSTRUCTOR() {
		// Initialize components
		SET this.spinner = ora()
		SET this.tokenDisplay = new TokenDisplay()
	}

	PUBLIC async main(): Promise<void> {
		TRY {
			// Parse command line arguments
			SET options = this.parseArguments()
			
			// Load and validate configuration
			this.spinner.start('Loading configuration...')
			SET this.config = await this.loadConfiguration(options)
			this.spinner.succeed('Configuration loaded')

			// Initialize OAuth handler
			SET this.oauthHandler = new OAuthFlowHandler(this.config)

			// Check existing authentication
			IF await this.checkExistingAuth() THEN {
				this.displayMessage('Already authenticated', 'success')
				SET tokens = await this.oauthHandler.getCurrentTokens()
				this.tokenDisplay.display(tokens, options.format)
				RETURN
			}

			// Execute OAuth flow
			SET authResult = await this.executeOAuthFlow(options)
			
			// Display results
			this.displayAuthResult(authResult, options)

		} CATCH error {
			this.handleError(error)
			process.exit(1)
		}
	}

	PRIVATE parseArguments(): CLIOptions {
		SET program = new Command()
		
		program
			.name('cli-auth')
			.description('CLI OAuth authentication tool for CMS MCP Server')
			.version('1.0.0')
			.option('-f, --format <type>', 'output format (json|table|minimal)', 'table')
			.option('--no-browser', 'skip automatic browser opening')
			.option('-t, --timeout <seconds>', 'authentication timeout', '300')
			.option('--verbose', 'enable verbose logging')
			.parse()

		RETURN program.opts() as CLIOptions
	}

	PRIVATE async loadConfiguration(options: CLIOptions): Promise<CLIConfig> {
		SET configHandler = new CLIConfigHandler()
		RETURN await configHandler.loadConfig(options)
	}

	PRIVATE async checkExistingAuth(): Promise<boolean> {
		TRY {
			RETURN await this.oauthHandler.isAuthenticated()
		} CATCH {
			RETURN false
		}
	}

	PRIVATE async executeOAuthFlow(options: CLIOptions): Promise<AuthResult> {
		this.displayMessage('Starting OAuth authentication flow...', 'info')
		
		// Step 1: Initiate OAuth flow
		this.spinner.start('Generating authorization URL...')
		SET authUrl = await this.oauthHandler.initiateFlow()
		this.spinner.succeed('Authorization URL generated')

		// Step 2: Display URL and instructions
		this.displayAuthInstructions(authUrl, options.browser)

		// Step 3: Wait for authorization code
		SET authCode = await this.promptForAuthCode(options.timeout)

		// Step 4: Exchange code for tokens
		this.spinner.start('Exchanging authorization code for tokens...')
		SET tokens = await this.oauthHandler.exchangeCodeForTokens(authCode)
		this.spinner.succeed('Tokens obtained successfully')

		RETURN {
			success: true,
			tokens: tokens,
			message: 'Authentication completed successfully'
		}
	}

	PRIVATE displayAuthInstructions(authUrl: string, openBrowser: boolean): void {
		console.log(chalk.blue('\n📋 Authentication Required'))
		console.log(chalk.white('Please complete the following steps:'))
		console.log(chalk.yellow('1. Visit the authorization URL below'))
		console.log(chalk.yellow('2. Complete the authentication process'))
		console.log(chalk.yellow('3. Copy the authorization code from the callback'))
		console.log(chalk.yellow('4. Paste the code when prompted\n'))
		
		console.log(chalk.cyan('Authorization URL:'))
		console.log(chalk.underline(authUrl))
		console.log()

		IF openBrowser THEN {
			TRY {
				IMPORT('open').then(open => open.default(authUrl))
				console.log(chalk.green('✓ Browser opened automatically'))
			} CATCH {
				console.log(chalk.yellow('⚠ Could not open browser automatically'))
			}
		}
	}

	PRIVATE async promptForAuthCode(timeoutSeconds: number): Promise<string> {
		IMPORT readline from 'readline'
		
		SET rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		})

		RETURN new Promise((resolve, reject) => {
			SET timeout = setTimeout(() => {
				rl.close()
				reject(new Error('Authentication timeout'))
			}, timeoutSeconds * 1000)

			rl.question(chalk.cyan('Enter authorization code: '), (code) => {
				clearTimeout(timeout)
				rl.close()
				
				IF !code.trim() THEN {
					reject(new Error('Authorization code is required'))
				} ELSE {
					resolve(code.trim())
				}
			})
		})
	}

	PRIVATE displayAuthResult(result: AuthResult, options: CLIOptions): void {
		IF result.success THEN {
			this.displayMessage(result.message, 'success')
			this.tokenDisplay.display(result.tokens, options.format)
		} ELSE {
			this.displayMessage(result.message, 'error')
		}
	}

	PRIVATE displayMessage(message: string, type: 'info' | 'success' | 'error'): void {
		SWITCH type {
			CASE 'info':
				console.log(chalk.blue('ℹ ' + message))
				BREAK
			CASE 'success':
				console.log(chalk.green('✓ ' + message))
				BREAK
			CASE 'error':
				console.log(chalk.red('✗ ' + message))
				BREAK
		}
	}

	PRIVATE handleError(error: unknown): void {
		this.spinner.fail('Operation failed')
		
		SET errorMessage = error instanceof Error ? error.message : 'Unknown error'
		
		IF errorMessage.includes('configuration') THEN {
			console.log(chalk.red('\n❌ Configuration Error:'))
			console.log(chalk.white('Required environment variables:'))
			console.log(chalk.yellow('- CMS_BASE_URL'))
			console.log(chalk.yellow('- OAUTH_CLIENT_ID'))
			console.log(chalk.yellow('- OAUTH_CLIENT_SECRET'))
			console.log(chalk.yellow('- OAUTH_REDIRECT_URI'))
		} ELSE IF errorMessage.includes('timeout') THEN {
			console.log(chalk.red('\n❌ Authentication Timeout:'))
			console.log(chalk.white('Please try again with --timeout option for more time'))
		} ELSE {
			console.log(chalk.red('\n❌ Error: ' + errorMessage))
		}
		
		logger.error('CLI Auth Tool Error', { error: errorMessage })
	}
}

// Main execution
IF import.meta.url === `file://${process.argv[1]}` THEN {
	SET cliTool = new CLIAuthTool()
	cliTool.main().catch(console.error)
}
```

## Module 2: OAuth Flow Handler (`oauth-flow-handler.ts`)

```typescript
// OAuth Flow Management
// File: oauth-flow-handler.ts
// Dependencies: OAuthManager, AuthMiddleware

IMPORT { OAuthManager } from '../src/auth/oauth-manager.js'
IMPORT { authMiddleware } from '../src/auth/auth-middleware.js'
IMPORT { TokenData } from '../src/types/api-types.js'
IMPORT { CLIConfig, AuthFlowResult } from './types/cli-types.js'
IMPORT { logger } from '../src/utils/logger.js'

CLASS OAuthFlowHandler {
	PRIVATE oauthManager: OAuthManager
	PRIVATE config: CLIConfig
	PRIVATE currentState: string | null = null

	CONSTRUCTOR(config: CLIConfig) {
		SET this.config = config
		SET this.oauthManager = OAuthManager.getInstance(config.oauth)
		authMiddleware.initialize(this.oauthManager)
	}

	PUBLIC async isAuthenticated(): Promise<boolean> {
		TRY {
			RETURN await authMiddleware.isAuthenticated()
		} CATCH error {
			logger.debug('Authentication check failed', { error })
			RETURN false
		}
	}

	PUBLIC async getCurrentTokens(): Promise<TokenData | null> {
		TRY {
			SET token = await this.oauthManager.getValidAccessToken()
			IF !token THEN RETURN null
			
			// Get token details from token store
			SET tokenStore = require('../src/auth/token-store.js').tokenStore
			RETURN {
				accessToken: token,
				refreshToken: tokenStore.getRefreshToken() || '',
				expiresAt: tokenStore.getExpirationTime() || new Date(),
				tokenType: 'Bearer',
				scope: undefined
			}
		} CATCH error {
			logger.debug('Failed to get current tokens', { error })
			RETURN null
		}
	}

	PUBLIC async initiateFlow(): Promise<string> {
		TRY {
			logger.info('Initiating OAuth flow')
			
			// Generate authorization URL with PKCE
			SET authFlow = this.oauthManager.getAuthorizationCode()
			
			// Store state for validation
			SET this.currentState = authFlow.state
			
			logger.debug('OAuth flow initiated', {
				hasUrl: !!authFlow.url,
				hasState: !!authFlow.state,
				hasCodeVerifier: !!authFlow.codeVerifier
			})
			
			RETURN authFlow.url
		} CATCH error {
			logger.error('Failed to initiate OAuth flow', { error })
			THROW new Error(`OAuth flow initiation failed: ${error.message}`)
		}
	}

	PUBLIC async exchangeCodeForTokens(authCode: string): Promise<TokenData> {
		TRY {
			IF !this.currentState THEN {
				THROW new Error('No active OAuth flow found')
			}
			
			logger.info('Exchanging authorization code for tokens')
			
			// Exchange code for tokens
			SET tokenData = await this.oauthManager.exchangeCodeForToken(
				authCode, 
				this.currentState
			)
			
			// Clear state after successful exchange
			SET this.currentState = null
			
			logger.info('Token exchange completed successfully', {
				hasAccessToken: !!tokenData.accessToken,
				hasRefreshToken: !!tokenData.refreshToken,
				expiresAt: tokenData.expiresAt
			})
			
			RETURN tokenData
		} CATCH error {
			logger.error('Token exchange failed', { error })
			SET this.currentState = null // Clear state on error
			THROW new Error(`Token exchange failed: ${error.message}`)
		}
	}

	PUBLIC async refreshTokens(): Promise<TokenData> {
		TRY {
			logger.info('Refreshing tokens')
			RETURN await this.oauthManager.refreshToken()
		} CATCH error {
			logger.error('Token refresh failed', { error })
			THROW new Error(`Token refresh failed: ${error.message}`)
		}
	}

	PUBLIC logout(): void {
		TRY {
			this.oauthManager.logout()
			SET this.currentState = null
			logger.info('Logout completed')
		} CATCH error {
			logger.error('Logout failed', { error })
		}
	}

	PUBLIC getOAuthConfig(): any {
		RETURN this.oauthManager.getConfig()
	}
}
```

## Module 3: Token Display (`token-display.ts`)

```typescript
// Token Display and Formatting
// File: token-display.ts
// Dependencies: chalk

IMPORT chalk from 'chalk'
IMPORT { TokenData } from '../src/types/api-types.js'

TYPE DisplayFormat = 'json' | 'table' | 'minimal'

CLASS TokenDisplay {
	PUBLIC display(tokens: TokenData, format: DisplayFormat = 'table'): void {
		console.log() // Empty line for spacing
		
		SWITCH format {
			CASE 'json':
				this.displayAsJSON(tokens)
				BREAK
			CASE 'table':
				this.displayAsTable(tokens)
				BREAK
			CASE 'minimal':
				this.displayAsMinimal(tokens)
				BREAK
			DEFAULT:
				this.displayAsTable(tokens)
		}
		
		console.log() // Empty line for spacing
		this.displayUsageInstructions(tokens)
	}

	PRIVATE displayAsJSON(tokens: TokenData): void {
		console.log(chalk.cyan('🔑 Authentication Tokens (JSON Format):'))
		console.log(chalk.white('─'.repeat(50)))
		
		SET output = {
			access_token: tokens.accessToken,
			refresh_token: tokens.refreshToken,
			token_type: tokens.tokenType || 'Bearer',
			expires_at: tokens.expiresAt.toISOString(),
			expires_in: this.calculateExpiresIn(tokens.expiresAt),
			scope: tokens.scope || 'read write'
		}
		
		console.log(JSON.stringify(output, null, 2))
	}

	PRIVATE displayAsTable(tokens: TokenData): void {
		console.log(chalk.cyan('🔑 Authentication Tokens:'))
		console.log(chalk.white('─'.repeat(70)))
		
		SET tableData = [
			['Access Token', this.truncateToken(tokens.accessToken)],
			['Refresh Token', this.truncateToken(tokens.refreshToken)],
			['Token Type', tokens.tokenType || 'Bearer'],
			['Expires At', tokens.expiresAt.toISOString()],
			['Expires In', this.calculateExpiresIn(tokens.expiresAt) + ' seconds'],
			['Scope', tokens.scope || 'read write']
		]
		
		FOR EACH [label, value] IN tableData {
			console.log(
				chalk.yellow(label.padEnd(15)) + 
				chalk.white('│ ') + 
				chalk.green(value)
			)
		}
	}

	PRIVATE displayAsMinimal(tokens: TokenData): void {
		console.log(chalk.cyan('# Environment Variables:'))
		console.log(`ACCESS_TOKEN=${tokens.accessToken}`)
		console.log(`REFRESH_TOKEN=${tokens.refreshToken}`)
		console.log(`TOKEN_TYPE=${tokens.tokenType || 'Bearer'}`)
		console.log(`EXPIRES_AT=${tokens.expiresAt.toISOString()}`)
		console.log(`EXPIRES_IN=${this.calculateExpiresIn(tokens.expiresAt)}`)
		console.log(`SCOPE=${tokens.scope || 'read write'}`)
	}

	PRIVATE displayUsageInstructions(tokens: TokenData): void {
		console.log(chalk.blue('📋 Usage Instructions:'))
		console.log(chalk.white('─'.repeat(50)))
		console.log(chalk.yellow('• Use the access token for API requests'))
		console.log(chalk.yellow('• Include as Authorization: Bearer <access_token>'))
		console.log(chalk.yellow('• Token expires at: ' + tokens.expiresAt.toLocaleString()))
		
		SET expiresIn = this.calculateExpiresIn(tokens.expiresAt)
		IF expiresIn < 300 THEN { // Less than 5 minutes
			console.log(chalk.red('⚠ Token expires soon! Consider refreshing.'))
		}
	}

	PRIVATE truncateToken(token: string): string {
		IF !token THEN RETURN 'N/A'
		IF token.length <= 20 THEN RETURN token
		RETURN token.substring(0, 10) + '...' + token.substring(token.length - 10)
	}

	PRIVATE calculateExpiresIn(expiresAt: Date): number {
		RETURN Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
	}

	PUBLIC maskTokenForLogging(token: string): string {
		IF !token || token.length <= 8 THEN RETURN '****'
		RETURN token.substring(0, 4) + '...' + token.substring(token.length - 4)
	}
}
```

## Module 4: CLI Configuration Handler (`cli-config.ts`)

```typescript
// CLI Configuration Management
// File: cli-config.ts
// Dependencies: ConfigManager

IMPORT { configManager } from '../src/utils/config-manager.js'
IMPORT { ServerConfig } from '../src/types/config-types.js'
IMPORT { CLIOptions, CLIConfig } from './types/cli-types.js'
IMPORT { logger } from '../src/utils/logger.js'

CLASS CLIConfigHandler {
	PUBLIC async loadConfig(options: CLIOptions): Promise<CLIConfig> {
		TRY {
			// Load base server configuration
			SET serverConfig = configManager.loadConfiguration()
			
			// Validate required environment variables
			this.validateEnvironment()
			
			// Merge with CLI options
			SET cliConfig = this.mergeWithCLIOptions(serverConfig, options)
			
			// Validate final configuration
			this.validateCLIConfig(cliConfig)
			
			logger.info('CLI configuration loaded successfully', {
				format: cliConfig.format,
				timeout: cliConfig.timeoutSeconds,
				verbose: cliConfig.verbose
			})
			
			RETURN cliConfig
		} CATCH error {
			logger.error('Failed to load CLI configuration', { error })
			THROW new Error(`Configuration loading failed: ${error.message}`)
		}
	}

	PRIVATE validateEnvironment(): void {
		SET validation = configManager.checkRequiredEnvVars()
		IF !validation.isValid THEN {
			THROW new Error(`Missing required environment variables: ${validation.errors.join(', ')}`)
		}
	}

	PRIVATE mergeWithCLIOptions(serverConfig: ServerConfig, options: CLIOptions): CLIConfig {
		RETURN {
			// Server configuration
			oauth: serverConfig.oauth,
			cmsBaseUrl: serverConfig.cmsBaseUrl,
			apiTimeout: serverConfig.apiTimeout,
			
			// CLI-specific options
			format: this.validateFormat(options.format),
			openBrowser: options.browser !== false,
			timeoutSeconds: parseInt(options.timeout || '300', 10),
			verbose: options.verbose || false
		}
	}

	PRIVATE validateFormat(format: string): 'json' | 'table' | 'minimal' {
		SET validFormats = ['json', 'table', 'minimal']
		IF !validFormats.includes(format) THEN {
			logger.warn(`Invalid format '${format}', using 'table'`)
			RETURN 'table'
		}
		RETURN format as 'json' | 'table' | 'minimal'
	}

	PRIVATE validateCLIConfig(config: CLIConfig): void {
		// Validate timeout
		IF config.timeoutSeconds < 30 || config.timeoutSeconds > 1800 THEN {
			THROW new Error('Timeout must be between 30 and 1800 seconds')
		}
		
		// Validate OAuth configuration
		IF !config.oauth.clientId || !config.oauth.clientSecret THEN {
			THROW new Error('OAuth client credentials are required')
		}
		
		// Validate URLs
		TRY {
			new URL(config.oauth.authorizationUrl)
			new URL(config.oauth.tokenUrl)
			new URL(config.oauth.redirectUri)
		} CATCH {
			THROW new Error('Invalid OAuth URLs in configuration')
		}
	}

	PUBLIC getDefaultConfig(): Partial<CLIConfig> {
		RETURN {
			format: 'table',
			openBrowser: true,
			timeoutSeconds: 300,
			verbose: false
		}
	}
}
```

## Module 5: CLI Type Definitions (`types/cli-types.ts`)

```typescript
// CLI Type Definitions
// File: types/cli-types.ts

IMPORT { OAuthConfig } from '../../src/types/config-types.js'
IMPORT { TokenData } from '../../src/types/api-types.js'

EXPORT INTERFACE CLIOptions {
	format: string
	browser: boolean
	timeout: string
	verbose: boolean
	help?: boolean
	version?: boolean
}

EXPORT INTERFACE CLIConfig {
	// OAuth configuration
	oauth: OAuthConfig
	cmsBaseUrl: string
	apiTimeout: number
	
	// CLI-specific settings
	format: 'json' | 'table' | 'minimal'
	openBrowser: boolean
	timeoutSeconds: number
	verbose: boolean
}

EXPORT INTERFACE AuthResult {
	success: boolean
	tokens?: TokenData
	message: string
	error?: string
}

EXPORT INTERFACE AuthFlowResult {
	authUrl: string
	state: string
	codeVerifier: string
}

EXPORT INTERFACE TokenDisplayOptions {
	format: 'json' | 'table' | 'minimal'
	maskSensitive: boolean
	includeInstructions: boolean
}

EXPORT INTERFACE CLIError {
	code: string
	message: string
	suggestions: string[]
	recoverable: boolean
}
```

## Test Anchors (TDD Structure)

### Unit Test Structure

```typescript
// Test file: cli-auth.test.ts
DESCRIBE 'CLIAuthTool' {
	DESCRIBE 'parseArguments' {
		TEST 'should parse format option correctly'
		TEST 'should handle invalid format gracefully'
		TEST 'should set default values'
	}
	
	DESCRIBE 'loadConfiguration' {
		TEST 'should load configuration successfully'
		TEST 'should throw error for missing env vars'
		TEST 'should merge CLI options with server config'
	}
	
	DESCRIBE 'executeOAuthFlow' {
		TEST 'should complete OAuth flow successfully'
		TEST 'should handle timeout errors'
		TEST 'should handle invalid auth codes'
	}
}

// Test file: oauth-flow-handler.test.ts
DESCRIBE 'OAuthFlowHandler' {
	DESCRIBE 'initiateFlow' {
		TEST 'should generate authorization URL'
		TEST 'should store state for validation'
		TEST 'should handle OAuth manager errors'
	}
	
	DESCRIBE 'exchangeCodeForTokens' {
		TEST 'should exchange code for tokens successfully'
		TEST 'should validate state parameter'
		TEST 'should clear state after exchange'
	}
}

// Test file: token-display.test.ts
DESCRIBE 'TokenDisplay' {
	DESCRIBE 'display' {
		TEST 'should format tokens as JSON'
		TEST 'should format tokens as table'
		TEST 'should format tokens as minimal'
	}
	
	DESCRIBE 'truncateToken' {
		TEST 'should truncate long tokens'
		TEST 'should handle short tokens'
		TEST 'should handle null tokens'
	}
}
```

### Integration Test Structure

```typescript
// Test file: cli-integration.test.ts
DESCRIBE 'CLI Integration Tests' {
	DESCRIBE 'End-to-End OAuth Flow' {
		TEST 'should complete full authentication flow'
		TEST 'should handle existing authentication'
		TEST 'should recover from network errors'
	}
	
	DESCRIBE 'Configuration Loading' {
		TEST 'should load from environment variables'
		TEST 'should validate required variables'
		TEST 'should merge CLI options correctly'
	}
}