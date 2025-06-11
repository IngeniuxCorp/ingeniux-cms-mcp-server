/**
 * Main MCP server implementation for Ingeniux CMS
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { configManager } from '../utils/config-manager.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/error-handler.js';
import { toolRegistry } from './tool-registry.js';
import { RequestHandler } from './request-handler.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { OAuthManager } from '../auth/oauth-manager.js';
import { APIClient } from '../api/api-client.js';

export class MCPServer {
	private static instance: MCPServer;
	private server: Server;
	private requestHandler: RequestHandler;
	private oauthManager: OAuthManager | null = null;
	private apiClient: APIClient | null = null;
	private isRunning = false;

	private constructor() {
		this.server = new Server(
			{
				name: 'ingeniux-cms-mcp-server',
				version: '1.0.0'
			},
			{
				capabilities: {
					tools: {},
					resources: {}
				}
			}
		);

		this.requestHandler = RequestHandler.getInstance(authMiddleware, toolRegistry);
		this.setupServerHandlers();
	}

	public static getInstance(): MCPServer {
		if (!MCPServer.instance) {
			MCPServer.instance = new MCPServer();
		}
		return MCPServer.instance;
	}

	/**
	 * Start the MCP server
	 */
	public async start(): Promise<void> {
		try {
			if (this.isRunning) {
				logger.warn('Server is already running');
				return;
			}

			// Load and validate configuration
			const config = configManager.loadConfiguration();
			logger.info('Configuration loaded successfully');

			// Initialize OAuth manager
			this.oauthManager = OAuthManager.getInstance(config.oauth);
			authMiddleware.initialize(this.oauthManager);
			logger.info('OAuth manager initialized');

			// Initialize API client
			this.apiClient = APIClient.getInstance(config);
			logger.info('API client initialized');

			// Register tools
			await this.registerTools();
			logger.info(`Registered ${toolRegistry.getToolCount()} tools`);

			// Start server transport
			const transport = new StdioServerTransport();
			await this.server.connect(transport);

			this.isRunning = true;
			logger.info('MCP server started successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('Failed to start MCP server', { error: errorMessage });
			throw new Error(`Server startup failed: ${errorMessage}`);
		}
	}

	/**
	 * Stop the MCP server
	 */
	public async stop(): Promise<void> {
		try {
			if (!this.isRunning) {
				logger.warn('Server is not running');
				return;
			}

			// Cleanup resources
			await this.cleanup();

			this.isRunning = false;
			logger.info('MCP server stopped successfully');
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.error('Error stopping MCP server', { error: errorMessage });
			throw new Error(`Server shutdown failed: ${errorMessage}`);
		}
	}

	/**
	 * Setup server request handlers
	 */
	private setupServerHandlers(): void {
		try {
			// Handle tool listing
			this.server.setRequestHandler(ListToolsRequestSchema, async () => {
				try {
					const result = await this.requestHandler.processRequest({
						method: 'tools/list'
					});
					return result.result;
				} catch (error) {
					throw errorHandler.handleError(error);
				}
			});

			// Handle tool calls
			this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
				try {
					const result = await this.requestHandler.processRequest({
						method: 'tools/call',
						params: {
							name: request.params.name,
							arguments: request.params.arguments
						}
					});
					return result.result;
				} catch (error) {
					throw errorHandler.handleError(error);
				}
			});

			logger.info('Server handlers configured');
		} catch (error) {
			throw new Error(`Failed to setup server handlers: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Register MCP tools
	 */
	private async registerTools(): Promise<void> {
		try {
			// Register basic tools
			await this.registerBasicTools();

			// Register CMS-specific tools (would be loaded from tool modules)
			// This is where content-tools, analytics-tools, etc. would be registered
			
			logger.info('Tools registered successfully');
		} catch (error) {
			throw new Error(`Tool registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Register basic server tools
	 */
	private async registerBasicTools(): Promise<void> {
		try {
			// Health check tool
			toolRegistry.registerTool({
				name: 'health_check',
				description: 'Check server health and authentication status',
				inputSchema: {
					type: 'object',
					properties: {},
					additionalProperties: false
				},
				handler: async () => {
					const health = await this.requestHandler.healthCheck();
					return {
						content: [{
							type: 'text',
							text: JSON.stringify(health, null, 2)
						}]
					};
				}
			});

			// Authentication status tool
			toolRegistry.registerTool({
				name: 'auth_status',
				description: 'Get current authentication status',
				inputSchema: {
					type: 'object',
					properties: {},
					additionalProperties: false
				},
				handler: async () => {
					const authStatus = authMiddleware.getAuthStatus();
					return {
						content: [{
							type: 'text',
							text: JSON.stringify(authStatus, null, 2)
						}]
					};
				}
			});

			// OAuth flow initiation tool
			toolRegistry.registerTool({
				name: 'initiate_oauth',
				description: 'Initiate OAuth authentication flow',
				inputSchema: {
					type: 'object',
					properties: {},
					additionalProperties: false
				},
				handler: async () => {
					if (!this.oauthManager) {
						throw new Error('OAuth manager not initialized');
					}

					const authFlow = this.oauthManager.initiateFlow();
					return {
						content: [{
							type: 'text',
							text: `Please visit the following URL to authenticate:\n${authFlow.url}\n\nState: ${authFlow.state}`
						}]
					};
				}
			});

			logger.info('Basic tools registered');
		} catch (error) {
			throw new Error(`Basic tool registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Cleanup server resources
	 */
	private async cleanup(): Promise<void> {
		try {
			// Clear tools
			toolRegistry.clearTools();

			// Logout OAuth
			if (this.oauthManager) {
				this.oauthManager.logout();
			}

			// Close logger
			await logger.close();

			logger.info('Server cleanup completed');
		} catch (error) {
			logger.error('Error during cleanup', { error: error instanceof Error ? error.message : 'Unknown error' });
		}
	}

	/**
	 * Get server status
	 */
	public getStatus(): { isRunning: boolean; toolCount: number; authenticated: boolean } {
		try {
			return {
				isRunning: this.isRunning,
				toolCount: toolRegistry.getToolCount(),
				authenticated: authMiddleware.isAuthenticated()
			};
		} catch {
			return {
				isRunning: false,
				toolCount: 0,
				authenticated: false
			};
		}
	}

	/**
	 * Handle OAuth callback
	 */
	public async handleOAuthCallback(code: string, state: string): Promise<boolean> {
		try {
			return await authMiddleware.processCallback(code, state);
		} catch (error) {
			logger.error('OAuth callback failed', { error: error instanceof Error ? error.message : 'Unknown error' });
			return false;
		}
	}

	/**
	 * Refresh authentication if needed
	 */
	public async refreshAuth(): Promise<boolean> {
		try {
			return await authMiddleware.refreshIfNeeded();
		} catch (error) {
			logger.error('Auth refresh failed', { error: error instanceof Error ? error.message : 'Unknown error' });
			return false;
		}
	}

	/**
	 * Get OAuth manager instance
	 */
	public getOAuthManager(): OAuthManager | null {
		return this.oauthManager;
	}

	/**
	 * Get API client instance
	 */
	public getAPIClient(): APIClient | null {
		return this.apiClient;
	}

	/**
	 * Update server configuration
	 */
	public async updateConfiguration(): Promise<void> {
		try {
			const newConfig = configManager.loadConfiguration();
			
			// Update API client
			if (this.apiClient) {
				this.apiClient.updateConfig(newConfig);
			}

			// Update OAuth manager
			if (this.oauthManager) {
				this.oauthManager.updateConfig(newConfig.oauth);
			}

			logger.info('Configuration updated successfully');
		} catch (error) {
			throw new Error(`Configuration update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}

// Export singleton instance
export const mcpServer = MCPServer.getInstance();