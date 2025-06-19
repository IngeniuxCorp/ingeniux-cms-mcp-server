/**
 * Request processing pipeline for MCP server
 */

import { MCPRequest, MCPResponse, RequestContext } from '../types/mcp-types.js';
import { AuthMiddleware } from '../auth/auth-middleware.js';
import { ToolRegistry } from './tool-registry.js';
import { errorHandler } from '../utils/error-handler.js';
import { Validators } from '../utils/validators.js';
import { logger } from '../utils/logger.js';

export class RequestHandler {
	private static instance: RequestHandler;
	private authMiddleware: AuthMiddleware;
	private toolRegistry: ToolRegistry;

	private constructor(authMiddleware: AuthMiddleware, toolRegistry: ToolRegistry) {
		this.authMiddleware = authMiddleware;
		this.toolRegistry = toolRegistry;
	}

	public static getInstance(authMiddleware: AuthMiddleware, toolRegistry: ToolRegistry): RequestHandler {
		if (!RequestHandler.instance) {
			RequestHandler.instance = new RequestHandler(authMiddleware, toolRegistry);
		}
		return RequestHandler.instance;
	}

	/**
	 * Process incoming MCP request
	 */
	public async processRequest(request: MCPRequest): Promise<MCPResponse> {
		const context: RequestContext = {
			requestId: this.generateRequestId(),
			timestamp: new Date()
		};

		try {
			// Validate request structure
			this.validateRequest(request);

			// Route request based on method
			const result = await this.routeRequest(request, context);

			return {
				result,
				id: request.id
			};
		} catch (error) {
			// Handle and format error
			const mcpError = errorHandler.handleError(error, context);
			
			return {
				error: mcpError,
				id: request.id
			};
		}
	}

	/**
	 * Route request to appropriate handler
	 */
	private async routeRequest(request: MCPRequest, context: RequestContext): Promise<any> {
		try {
			switch (request.method) {
				case 'initialize':
					return this.handleInitialize(request.params);

				case 'tools/list':
					return this.handleToolsList();

				case 'tools/call':
					return this.handleToolCall(request.params, context);

				case 'resources/list':
					return this.handleResourcesList();

				case 'ping':
					return this.handlePing();

				default:
					throw new Error(`Unknown method: ${request.method}`);
			}
		} catch (error) {
			throw new Error(`Request routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle initialize request
	 */
	private async handleInitialize(params: any): Promise<any> {
		try {
			// Validate initialization parameters
			if (params && typeof params === 'object') {
				// Check protocol version compatibility
				const protocolVersion = params.protocolVersion;
				if (protocolVersion && !this.isCompatibleProtocolVersion(protocolVersion)) {
					throw new Error(`Unsupported protocol version: ${protocolVersion}`);
				}
			}

			return {
				protocolVersion: '2024-11-05',
				capabilities: {
					tools: {
						listChanged: false
					},
					resources: {
						subscribe: false,
						listChanged: false
					},
					logging: {}
				},
				serverInfo: {
					name: 'ingeniux-cms-mcp-server',
					version: '1.0.0'
				}
			};
		} catch (error) {
			throw new Error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle tools list request
	 */
	private async handleToolsList(): Promise<any> {
		try {
			const tools = this.toolRegistry.exportToolDefinitions();

            logger.info(`Get tool list ${tools.map(t => t.name).join(', ')}`);
			
			return {
				tools
			};
		} catch (error) {
			throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle tool call request
	 */
	private async handleToolCall(params: any, context: RequestContext): Promise<any> {
		try {
			// Validate tool call parameters
			this.validateToolCallParams(params);

			const { name, arguments: toolArgs } = params;
			context.toolName = name;


			// Execute tool
			const result = await this.toolRegistry.executeTool(name, toolArgs);

			return result;
		} catch (error) {
			throw new Error(`Tool call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle resources list request
	 */
	private async handleResourcesList(): Promise<any> {
		try {
			// For now, return empty resources list
			// This can be extended to include CMS resources
			return {
				resources: []
			};
		} catch (error) {
			throw new Error(`Failed to list resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Handle ping request
	 */
	private async handlePing(): Promise<any> {
		try {
			return {
				status: 'ok',
				timestamp: new Date().toISOString(),
				authenticated: this.authMiddleware.isAuthenticated()
			};
		} catch (error) {
			throw new Error(`Ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Validate MCP request structure
	 */
	private validateRequest(request: MCPRequest): void {
		if (!request) {
			throw new Error('Request is required');
		}

		if (!request.method || typeof request.method !== 'string') {
			throw new Error('Request method is required and must be a string');
		}

		// Validate method name format
		if (!Validators.isValidString(request.method, 1)) {
			throw new Error('Invalid request method format');
		}
	}

	/**
	 * Validate tool call parameters
	 */
	private validateToolCallParams(params: any): void {
		if (!params || typeof params !== 'object') {
			throw new Error('Tool call parameters are required');
		}

		if (!params.name || typeof params.name !== 'string') {
			throw new Error('Tool name is required and must be a string');
		}

		// Check if tool exists
		if (!this.toolRegistry.hasTool(params.name)) {
			throw new Error(`Tool '${params.name}' not found`);
		}
	}

	/**
	 * Check protocol version compatibility
	 */
	private isCompatibleProtocolVersion(version: string): boolean {
		try {
			// Support current protocol version
			const supportedVersions = ['2024-11-05'];
			return supportedVersions.includes(version);
		} catch {
			return false;
		}
	}

	/**
	 * Generate unique request ID
	 */
	private generateRequestId(): string {
		try {
			return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
		} catch {
			return `req_${Date.now()}`;
		}
	}

	/**
	 * Get request statistics
	 */
	public getRequestStats(): { totalRequests: number; methodCounts: Record<string, number> } {
		// This would be implemented with actual tracking in a real system
		return {
			totalRequests: 0,
			methodCounts: {}
		};
	}

	/**
	 * Health check
	 */
	public async healthCheck(): Promise<{ status: string; details: any }> {
		try {
			const details = {
				timestamp: new Date().toISOString(),
				authenticated: this.authMiddleware.isAuthenticated(),
				toolCount: this.toolRegistry.getToolCount(),
				authStatus: this.authMiddleware.getAuthStatus()
			};

			return {
				status: 'healthy',
				details
			};
		} catch (error) {
			return {
				status: 'unhealthy',
				details: {
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}
			};
		}
	}

	/**
	 * Process batch requests
	 */
	public async processBatchRequests(requests: MCPRequest[]): Promise<MCPResponse[]> {
		try {
			if (!Array.isArray(requests)) {
				throw new Error('Batch requests must be an array');
			}

			const responses: MCPResponse[] = [];

			// Process requests sequentially to maintain order
			for (const request of requests) {
				try {
					const response = await this.processRequest(request);
					responses.push(response);
				} catch (error) {
					// Add error response for failed request
					const mcpError = errorHandler.handleError(error);
					responses.push({
						error: mcpError,
						id: request.id
					});
				}
			}

			return responses;
		} catch (error) {
			throw new Error(`Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Update dependencies
	 */
	public updateDependencies(authMiddleware: AuthMiddleware, toolRegistry: ToolRegistry): void {
		try {
			this.authMiddleware = authMiddleware;
			this.toolRegistry = toolRegistry;
		} catch (error) {
			throw new Error(`Failed to update dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
}