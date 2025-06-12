/**
 * Authentication tools for OAuth integration
 */

import { MCPTool, ToolResult } from '../types/mcp-types.js';
import { errorHandler } from '../utils/error-handler.js';
import { authMiddleware } from '../auth/auth-middleware.js';

export class AuthTools {
	/**
	 * Get authentication tools
	 */
	public getTools(): MCPTool[] {
		return [
			this.createHealthCheckTool(),
			this.createAuthStatusTool(),
			this.createInitiateOAuthTool()
		];
	}

	/**
	 * Create health check tool
	 */
	private createHealthCheckTool(): MCPTool {
		return {
			name: 'health_check',
			description: 'Check server health and authentication status',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			handler: async (_params: any): Promise<ToolResult> => {
				try {
					const authStatus = await authMiddleware.isAuthenticated();
					const healthData = {
						status: 'healthy',
						timestamp: new Date().toISOString(),
						authentication: {
							isAuthenticated: authStatus,
							tokenExpiry: authMiddleware.getAuthStatus().tokenExpiry?.toISOString()
						}
					};

					return {
						content: [{
							type: 'text',
							text: JSON.stringify(healthData, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'health_check',
						toolName: 'health_check',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create auth status tool
	 */
	private createAuthStatusTool(): MCPTool {
		return {
			name: 'auth_status',
			description: 'Get current authentication status',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			handler: async (_params: any): Promise<ToolResult> => {
				try {
					const authStatus = authMiddleware.getAuthStatus();
					
					return {
						content: [{
							type: 'text',
							text: JSON.stringify(authStatus, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'auth_status',
						toolName: 'auth_status',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create initiate OAuth tool
	 */
	private createInitiateOAuthTool(): MCPTool {
		return {
			name: 'initiate_oauth',
			description: 'Initiate OAuth authentication flow',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false
			},
			handler: async (_params: any): Promise<ToolResult> => {
				try {
					const authChallenge = authMiddleware.createAuthChallenge();
					
					return {
						content: [{
							type: 'text',
							text: JSON.stringify({
								message: 'OAuth flow initiated',
								authUrl: authChallenge.authUrl,
								instructions: 'Please visit the authorization URL to complete authentication'
							}, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'initiate_oauth',
						toolName: 'initiate_oauth',
						timestamp: new Date()
					});
				}
			}
		};
	}
}