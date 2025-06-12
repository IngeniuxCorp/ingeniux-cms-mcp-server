#!/usr/bin/env tsx
/**
 * Standalone TypeScript debug script for cms_list_pages tool
 * Tests cms_list_pages with various parameter combinations using OAuth authentication
 */

import { APIClient } from './src/api/api-client.js';
import { ContentTools } from './src/tools/content-tools.js';
import { OAuthManager } from './src/auth/oauth-manager.js';
import { authMiddleware } from './src/auth/auth-middleware.js';
import { configManager } from './src/utils/config-manager.js';
import { logger } from './src/utils/logger.js';
import { errorHandler } from './src/utils/error-handler.js';
import { ServerConfig } from './src/types/config-types.js';
import { ToolResult } from './src/types/mcp-types.js';

// Debug configuration interface
interface DebugConfig {
	scenarios: TestScenario[];
	outputFormat: 'json' | 'table' | 'detailed';
	maxRetries: number;
	timeoutMs: number;
}

interface TestScenario {
	name: string;
	description: string;
	parameters: any;
	expectedBehavior: 'success' | 'error' | 'empty';
}

interface TestResult {
	scenarioName: string;
	success: boolean;
	executionTimeMs: number;
	responseData?: any;
	errorDetails?: string;
	timestamp: Date;
}

/**
 * Debug configuration manager
 */
class DebugConfigManager {
	private config: DebugConfig;

	constructor() {
		this.config = this.loadDebugConfig();
	}

	private loadDebugConfig(): DebugConfig {
		try {
			const outputFormat = (process.env.DEBUG_OUTPUT_FORMAT as any) || 'detailed';
			const maxRetries = parseInt(process.env.MAX_RETRIES || '3', 10);
			const timeoutMs = parseInt(process.env.API_TIMEOUT || '30000', 10);

			return {
				scenarios: this.createTestScenarios(),
				outputFormat,
				maxRetries,
				timeoutMs
			};
		} catch (error) {
			throw new Error(`Failed to load debug configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private createTestScenarios(): TestScenario[] {
		return [
			{
				name: 'basic_list_pages',
				description: 'Basic cms_list_pages call without parameters',
				parameters: {},
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_with_pagination',
				description: 'List pages with pagination parameters',
				parameters: { page: 1, limit: 10 },
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_with_parent',
				description: 'List pages with specific parentId',
				parameters: { parentId: 'test-parent-id' },
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_with_template',
				description: 'List pages filtered by template',
				parameters: { template: 'article' },
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_comprehensive',
				description: 'List pages with all parameters',
				parameters: {
					parentId: 'root',
					page: 1,
					limit: 5,
					template: 'page'
				},
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_large_limit',
				description: 'Test with large page limit',
				parameters: { page: 1, limit: 100 },
				expectedBehavior: 'success'
			},
			{
				name: 'list_pages_edge_case_pagination',
				description: 'Test edge case pagination values',
				parameters: { page: 999, limit: 1 },
				expectedBehavior: 'empty'
			}
		];
	}

	public getConfig(): DebugConfig {
		return this.config;
	}
}

/**
 * Authentication handler for debug script
 */
class AuthHandler {
	private oauthManager: OAuthManager;
	private isAuthenticated: boolean = false;

	constructor(config: ServerConfig) {
		this.oauthManager = OAuthManager.getInstance(config.oauth);
		authMiddleware.initialize(this.oauthManager);
	}

	public async initializeAuth(): Promise<boolean> {
		try {
			logger.info('Initializing authentication...');

			// Check if already authenticated
			if (this.oauthManager.isAuthenticated()) {
				logger.info('Already authenticated with valid token');
				this.isAuthenticated = true;
				return true;
			}

			// Try to refresh token if available
			try {
				const validToken = await this.oauthManager.getValidAccessToken();
				if (validToken) {
					logger.info('Token refreshed successfully');
					this.isAuthenticated = true;
					return true;
				}
			} catch (error) {
				logger.debug('Token refresh failed, initiating new OAuth flow');
			}

			// Initiate OAuth flow
			const authFlow = this.oauthManager.initiateFlow();
			logger.info('OAuth flow initiated');
			logger.info(`Please visit: ${authFlow.url}`);
			logger.info('Waiting for authorization...');

			// In a real implementation, this would wait for callback
			// For debug purposes, we'll simulate the flow
			throw new Error('OAuth flow requires manual intervention. Please complete authentication in browser.');

		} catch (error) {
			logger.error('Authentication initialization failed', { error });
			return false;
		}
	}

	public async ensureValidToken(): Promise<string | null> {
		try {
			if (!this.isAuthenticated) {
				const authResult = await this.initializeAuth();
				if (!authResult) {
					return null;
				}
			}

			return await this.oauthManager.getValidAccessToken();
		} catch (error) {
			logger.error('Failed to ensure valid token', { error });
			return null;
		}
	}

	public isAuthenticatedStatus(): boolean {
		return this.isAuthenticated && this.oauthManager.isAuthenticated();
	}
}

/**
 * Test executor for cms_list_pages scenarios
 */
class TestExecutor {
	private apiClient: APIClient;
	private contentTools: ContentTools;
	private authHandler: AuthHandler;
	private config: DebugConfig;

	constructor(apiClient: APIClient, authHandler: AuthHandler, config: DebugConfig) {
		this.apiClient = apiClient;
		this.authHandler = authHandler;
		this.config = config;
		this.contentTools = new ContentTools(apiClient);
	}

	public async executeTestScenario(scenario: TestScenario): Promise<TestResult> {
		const startTime = Date.now();
		logger.info(`Executing scenario: ${scenario.name}`);

		try {
			// Ensure valid authentication
			const token = await this.authHandler.ensureValidToken();
			if (!token) {
				throw new Error('Authentication failed - no valid token available');
			}

			// Get cms_list_pages tool
			const tools = this.contentTools.getTools();
			const listPagesTool = tools.find(tool => tool.name === 'cms_list_pages');
			
			if (!listPagesTool) {
				throw new Error('cms_list_pages tool not found');
			}

			// Execute tool with scenario parameters
			const result = await this.executeWithRetry(
				() => listPagesTool.handler(scenario.parameters)
			);

			const executionTime = Date.now() - startTime;
			logger.info(`Scenario ${scenario.name} completed successfully`, {
				executionTime,
				responseSize: JSON.stringify(result).length
			});

			return {
				scenarioName: scenario.name,
				success: true,
				executionTimeMs: executionTime,
				responseData: result,
				timestamp: new Date()
			};

		} catch (error) {
			const executionTime = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			logger.error(`Scenario ${scenario.name} failed`, {
				error: errorMessage,
				executionTime
			});

			return {
				scenarioName: scenario.name,
				success: false,
				executionTimeMs: executionTime,
				errorDetails: errorMessage,
				timestamp: new Date()
			};
		}
	}

	private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
			try {
				return await operation();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				
				if (attempt === this.config.maxRetries || !errorHandler.isRetryableError(error)) {
					throw lastError;
				}

				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
				logger.debug(`Retry attempt ${attempt} after ${delay}ms delay`);
				await this.sleep(delay);
			}
		}

		throw lastError || new Error('Max retries exceeded');
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	public async runAllScenarios(): Promise<TestResult[]> {
		const results: TestResult[] = [];
		const scenarios = this.config.scenarios;

		logger.info(`Starting execution of ${scenarios.length} test scenarios`);

		for (const scenario of scenarios) {
			try {
				const result = await this.executeTestScenario(scenario);
				results.push(result);

				// Wait between tests to respect rate limits
				await this.sleep(1000);
			} catch (error) {
				logger.error(`Failed to execute scenario ${scenario.name}`, { error });
				results.push({
					scenarioName: scenario.name,
					success: false,
					executionTimeMs: 0,
					errorDetails: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date()
				});
			}
		}

		return results;
	}
}

/**
 * Output formatter for test results
 */
class OutputFormatter {
	private format: 'json' | 'table' | 'detailed';

	constructor(format: 'json' | 'table' | 'detailed') {
		this.format = format;
	}

	public formatResults(results: TestResult[]): string {
		switch (this.format) {
			case 'json':
				return this.formatAsJSON(results);
			case 'table':
				return this.formatAsTable(results);
			case 'detailed':
				return this.formatDetailed(results);
			default:
				return this.formatDetailed(results);
		}
	}

	private formatAsJSON(results: TestResult[]): string {
		const summary = this.generateSummary(results);
		return JSON.stringify({ summary, results }, null, 2);
	}

	private formatAsTable(results: TestResult[]): string {
		const header = '┌─────────────────────────────┬─────────┬──────────┬─────────────┐\n' +
					  '│ Scenario                    │ Status  │ Time(ms) │ Result      │\n' +
					  '├─────────────────────────────┼─────────┼──────────┼─────────────┤';
		
		const rows = results.map(result => {
			const name = result.scenarioName.padEnd(27);
			const status = result.success ? '✓ PASS' : '✗ FAIL';
			const time = result.executionTimeMs.toString().padStart(8);
			const resultText = result.success ? 'Success' : 'Error';
			
			return `│ ${name} │ ${status.padEnd(7)} │ ${time} │ ${resultText.padEnd(11)} │`;
		});

		const footer = '└─────────────────────────────┴─────────┴──────────┴─────────────┘';
		
		return [header, ...rows, footer].join('\n');
	}

	private formatDetailed(results: TestResult[]): string {
		const summary = this.generateSummary(results);
		const lines: string[] = [];

		lines.push('='.repeat(60));
		lines.push('CMS LIST PAGES DEBUG RESULTS');
		lines.push('='.repeat(60));
		lines.push('');
		lines.push(`Total Scenarios: ${summary.totalScenarios}`);
		lines.push(`Successful: ${summary.successful}`);
		lines.push(`Failed: ${summary.failed}`);
		lines.push(`Total Execution Time: ${summary.executionTimeMs}ms`);
		lines.push('');

		for (const result of results) {
			lines.push('-'.repeat(40));
			lines.push(`Scenario: ${result.scenarioName}`);
			lines.push(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);
			lines.push(`Execution Time: ${result.executionTimeMs}ms`);
			lines.push(`Timestamp: ${result.timestamp.toISOString()}`);
			
			if (result.success && result.responseData) {
				lines.push('Response Data:');
				lines.push(JSON.stringify(result.responseData, null, 2));
			} else if (!result.success && result.errorDetails) {
				lines.push(`Error: ${result.errorDetails}`);
			}
			lines.push('');
		}

		return lines.join('\n');
	}

	private generateSummary(results: TestResult[]) {
		const successful = results.filter(r => r.success).length;
		const failed = results.length - successful;
		const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);

		return {
			totalScenarios: results.length,
			successful,
			failed,
			executionTimeMs: totalTime
		};
	}
}

/**
 * Main debug script orchestrator
 */
class Main {
	private config: ServerConfig;
	private debugConfig: DebugConfig;
	private authHandler: AuthHandler;
	private apiClient: APIClient;
	private testExecutor: TestExecutor;
	private outputFormatter: OutputFormatter;

	constructor() {
		try {
			// Load configurations
			this.config = configManager.loadConfiguration();
			const debugConfigManager = new DebugConfigManager();
			this.debugConfig = debugConfigManager.getConfig();

			// Initialize components
			this.authHandler = new AuthHandler(this.config);
			this.apiClient = APIClient.getInstance(this.config);
			this.testExecutor = new TestExecutor(this.apiClient, this.authHandler, this.debugConfig);
			this.outputFormatter = new OutputFormatter(this.debugConfig.outputFormat);

		} catch (error) {
			logger.error('Failed to initialize debug script', { error });
			throw error;
		}
	}

	public async run(): Promise<void> {
		try {
			logger.info('Starting CMS List Pages Debug Script');

			// Configuration validation
			await this.validateConfiguration();

			// Authentication phase
			await this.ensureAuthentication();

			// Testing phase
			const results = await this.executeTests();

			// Output phase
			this.displayResults(results);

			logger.info('Debug script completed successfully');

		} catch (error) {
			await this.handleError(error);
		}
	}

	private async validateConfiguration(): Promise<void> {
		logger.info('Validating configuration...');

		const envValidation = configManager.checkRequiredEnvVars();
		if (!envValidation.isValid) {
			throw new Error(`Configuration validation failed: ${envValidation.errors.join(', ')}`);
		}

		logger.info('Configuration validated successfully');
	}

	private async ensureAuthentication(): Promise<void> {
		logger.info('Ensuring authentication...');

		if (!this.authHandler.isAuthenticatedStatus()) {
			const authResult = await this.authHandler.initializeAuth();
			if (!authResult) {
				throw new Error('Authentication failed');
			}
		}

		logger.info('Authentication verified');
	}

	private async executeTests(): Promise<TestResult[]> {
		logger.info('Executing test scenarios...');
		return await this.testExecutor.runAllScenarios();
	}

	private displayResults(results: TestResult[]): void {
		const formattedResults = this.outputFormatter.formatResults(results);
		console.log('\n' + formattedResults);
	}

	private async handleError(error: unknown): Promise<void> {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		logger.error('Debug script failed', { error: errorMessage });

		if (errorMessage.includes('configuration')) {
			console.error('\n❌ Configuration Error:');
			console.error('Please ensure all required environment variables are set:');
			console.error('- CMS_BASE_URL');
			console.error('- OAUTH_CLIENT_ID');
			console.error('- OAUTH_CLIENT_SECRET');
			console.error('- OAUTH_REDIRECT_URI');
			process.exit(1);
		} else if (errorMessage.includes('authentication') || errorMessage.includes('OAuth')) {
			console.error('\n❌ Authentication Error:');
			console.error('Please complete OAuth authentication flow manually.');
			console.error('The script will display the authorization URL when run.');
			process.exit(2);
		} else if (errorMessage.includes('network') || errorMessage.includes('API')) {
			console.error('\n❌ API Connectivity Error:');
			console.error('Please check your network connection and CMS_BASE_URL configuration.');
			process.exit(3);
		} else {
			console.error('\n❌ Unexpected Error:', errorMessage);
			process.exit(99);
		}
	}
}

// Script execution
if (import.meta.url === `file://${process.argv[1]}`) {
	const main = new Main();
	main.run().catch(error => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}