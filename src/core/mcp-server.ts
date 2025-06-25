/**
 * Main MCP server implementation for Ingeniux CMS
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { configManager } from '../utils/config-manager.js';
import { logger } from '../utils/logger.js';
import { errorHandler } from '../utils/error-handler.js';
import { toolRegistry } from './tool-registry.js';
import { RequestHandler } from './request-handler.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { OAuthManager } from '../auth/oauth-manager.js';
import { APIClient } from '../api/api-client.js';
import { getSwaggerMcpTools } from '../tools/swagger-mcp-tools.js';

const MCP_TOOLS_GEN_DIR = path.resolve(__dirname, '../../mcp-tools-generated');
function ensureMcpToolsGeneratedDir() {
	try {
		if (!fs.existsSync(MCP_TOOLS_GEN_DIR)) {
			fs.mkdirSync(MCP_TOOLS_GEN_DIR, { recursive: true });
		}
	} catch (e) {
		console.error('Failed to ensure mcp-tools-generated directory:', e);
		throw new Error('Startup failed: cannot create mcp-tools-generated directory');
	}
}

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
			// Ensure mcp-tools-generated directory exists before any access
			ensureMcpToolsGeneratedDir();

			if (this.isRunning) {
				logger.warn('Server is already running');
				return;
			}

			// Load and validate configuration
			const config = configManager.loadConfiguration();
			logger.info('Configuration loaded successfully', { config });

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
					return {
						tools: toolRegistry.exportToolDefinitions()
					};
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
					// return {
                    //     jsonrpc: '2.0',
                    //     result: result.result,
                    //     id: result.id,
                    //     tools: toolRegistry.exportToolDefinitions()
                    // };

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

			// Register CMS-specific tools
			await this.registerContentTools();
			
			logger.info('Tools registered successfully');
		} catch (error) {
			throw new Error(`Tool registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Register basic server tools (non-auth tools only)
	 */
	private async registerBasicTools(): Promise<void> {
		try {
			// Note: Auth tools have been removed - authentication is now handled
			// entirely through ContentTools.wrapToolWithAuth method
			
			logger.info('Basic tools registered (auth tools removed)');
		} catch (error) {
			throw new Error(`Basic tool registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
		* Register content management tools with duplicate prevention
		*/
	private async registerContentTools(): Promise<void> {
		try {
			if (!this.apiClient) {
				throw new Error('API client not initialized');
			}

			// Register Swagger-generated MCP tools
			const swaggerTools = getSwaggerMcpTools(this.apiClient);
			const swaggerResult = toolRegistry.registerToolsSafe(swaggerTools, false);

            console.log(`Registered ${swaggerTools.length} Swagger MCP tools`, swaggerTools, swaggerResult);

			// Log registration results

			if (swaggerResult.registered.length > 0) {
				logger.info(`Registered ${swaggerResult.registered.length} Swagger MCP tools: ${swaggerResult.registered.join(', ')}`);
			}

			const allErrors = [...swaggerResult.errors];
			if (allErrors.length > 0) {
				logger.error(`Failed to register ${allErrors.length} tools: ${allErrors.join('; ')}`);
				throw new Error(`Some tools failed to register: ${allErrors.join('; ')}`);
			}
		} catch (error) {
			throw new Error(`Content tools registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
				authenticated: authMiddleware.isAuthenticatedSync()
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