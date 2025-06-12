/**
 * Authentication middleware for MCP requests
 */

import { OAuthManager } from './oauth-manager.js';
import { AuthenticatedRequest, MCPRequest } from '../types/mcp-types.js';
import { errorHandler } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';

export class AuthMiddleware {
	private static instance: AuthMiddleware;
	private oauthManager: OAuthManager | null = null;

	private constructor() {}

	/**
	 * Mask sensitive token data for logging
	 */
	private maskToken(token: string | null | undefined): string {
		if (!token || typeof token !== 'string') {
			return 'null';
		}
		if (token.length <= 8) {
			return '****';
		}
		return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`;
	}

	public static getInstance(): AuthMiddleware {
		if (!AuthMiddleware.instance) {
			AuthMiddleware.instance = new AuthMiddleware();
		}
		return AuthMiddleware.instance;
	}

	/**
	 * Initialize middleware with OAuth manager
	 */
	public initialize(oauthManager: OAuthManager): void {
		this.oauthManager = oauthManager;
	}

	/**
	 * Authenticate MCP request with automatic token validation
	 */
	public async authenticate(request: MCPRequest): Promise<AuthenticatedRequest> {
		const startTime = Date.now();
		const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('authenticate() - Method entry', {
			operation: 'authenticate',
			requestId,
			requestMethod: request.method || 'unknown',
			requestParams: request.params ? Object.keys(request.params) : [],
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});
	
		try {
			if (!this.oauthManager) {
				logger.error('authenticate() - OAuth manager not initialized', {
					operation: 'authenticate',
					requestId,
					oauthManagerState: 'null',
					timestamp: new Date().toISOString()
				});
				throw new Error('OAuth manager not initialized');
			}
	
			logger.debug('authenticate() - OAuth manager validated, calling getBearerToken()', {
				operation: 'authenticate',
				requestId,
				oauthManagerState: 'initialized',
				timestamp: new Date().toISOString()
			});
	
			// Get a new bearer token using the full OAuth flow
			const token = await this.oauthManager.getBearerToken();
	
			logger.debug('authenticate() - getBearerToken() result', {
				operation: 'authenticate',
				requestId,
				hasToken: !!token,
				maskedToken: this.maskToken(token.accessToken),
				timestamp: new Date().toISOString()
			});
	
			// Add authentication headers
			const authenticatedRequest: AuthenticatedRequest = {
				...request,
				headers: {
					'Authorization': `Bearer ${token.accessToken}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			};
	
			const duration = Date.now() - startTime;
			logger.info('authenticate() - Method exit - Success', {
				operation: 'authenticate',
				requestId,
				success: true,
				duration,
				hasAuthHeaders: !!authenticatedRequest.headers?.Authorization,
				timestamp: new Date().toISOString()
			});
	
			return authenticatedRequest;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			logger.error('authenticate() - Method exit - Error', {
				operation: 'authenticate',
				requestId,
				success: false,
				duration,
				error: errorMessage,
				errorType: error instanceof Error ? error.constructor.name : 'unknown',
				oauthManagerExists: !!this.oauthManager,
				timestamp: new Date().toISOString()
			});
			
			throw new Error(`Authentication failed: ${errorMessage}`);
		}
	}

	/**
	 * Check if user is authenticated (always false, as we always get a new token)
	 */
	public async isAuthenticated(): Promise<boolean> {
		return false;
	}

	/**
	 * Synchronous authentication check (legacy)
	 */
	public isAuthenticatedSync(): boolean {
		try {
			if (!this.oauthManager) {
				return false;
			}
			return this.oauthManager.isAuthenticated();
		} catch {
			return false;
		}
	}

	/**
	 * Handle authentication error
	 */
	public handleAuthError(error: unknown): void {
		try {
			// Log authentication error
			errorHandler.handleError(error, {
				operation: 'authentication',
				timestamp: new Date()
			});

			// Clear tokens on auth error
			if (this.oauthManager) {
				this.oauthManager.logout();
			}
		} catch {
			// Silent fail for error handling
		}
	}

	/**
	 * Get authentication status
	 */
	public getAuthStatus(): { isAuthenticated: boolean; tokenExpiry?: Date } {
		const operationId = `getAuthStatus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('getAuthStatus() - Method entry', {
			operation: 'getAuthStatus',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.warn('getAuthStatus() - OAuth manager not initialized', {
					operation: 'getAuthStatus',
					operationId,
					result: { isAuthenticated: false },
					timestamp: new Date().toISOString()
				});
				return { isAuthenticated: false };
			}

			const isAuthenticated = this.oauthManager.isAuthenticated();
			
			logger.debug('getAuthStatus() - OAuth manager check result', {
				operation: 'getAuthStatus',
				operationId,
				isAuthenticated,
				timestamp: new Date().toISOString()
			});
			
			if (isAuthenticated) {
				const tokenStore = require('./token-store.js').tokenStore;
				const expiry = tokenStore.getExpirationTime();
				
				const result = {
					isAuthenticated: true,
					tokenExpiry: expiry || undefined
				};

				logger.info('getAuthStatus() - Method exit - Authenticated', {
					operation: 'getAuthStatus',
					operationId,
					result: { isAuthenticated: true, hasTokenExpiry: !!expiry },
					timestamp: new Date().toISOString()
				});
				
				return result;
			}

			logger.info('getAuthStatus() - Method exit - Not authenticated', {
				operation: 'getAuthStatus',
				operationId,
				result: { isAuthenticated: false },
				timestamp: new Date().toISOString()
			});

			return { isAuthenticated: false };
		} catch (error) {
			logger.error('getAuthStatus() - Method exit - Error', {
				operation: 'getAuthStatus',
				operationId,
				result: { isAuthenticated: false },
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			});
			return { isAuthenticated: false };
		}
	}

	/**
	 * Refresh authentication if needed
	 */
	public async refreshIfNeeded(): Promise<boolean> {
		const startTime = Date.now();
		const operationId = `refreshIfNeeded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('refreshIfNeeded() - Method entry', {
			operation: 'refreshIfNeeded',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.warn('refreshIfNeeded() - OAuth manager not initialized', {
					operation: 'refreshIfNeeded',
					operationId,
					result: false,
					timestamp: new Date().toISOString()
				});
				return false;
			}

			const tokenStore = require('./token-store.js').tokenStore;
			const expiresWithin10Min = tokenStore.expiresWithin(10);
			
			logger.debug('refreshIfNeeded() - Token expiry check', {
				operation: 'refreshIfNeeded',
				operationId,
				expiresWithin10Minutes: expiresWithin10Min,
				timestamp: new Date().toISOString()
			});
			
			if (expiresWithin10Min) {
				logger.debug('refreshIfNeeded() - Token needs refresh, attempting refresh', {
					operation: 'refreshIfNeeded',
					operationId,
					timestamp: new Date().toISOString()
				});

				try {
					await this.oauthManager.refreshToken();
					const duration = Date.now() - startTime;
					
					logger.info('refreshIfNeeded() - Method exit - Token refreshed successfully', {
						operation: 'refreshIfNeeded',
						operationId,
						result: true,
						duration,
						timestamp: new Date().toISOString()
					});
					return true;
				} catch (refreshError) {
					const duration = Date.now() - startTime;
					logger.error('refreshIfNeeded() - Token refresh failed', {
						operation: 'refreshIfNeeded',
						operationId,
						result: false,
						duration,
						error: refreshError instanceof Error ? refreshError.message : 'Unknown refresh error',
						timestamp: new Date().toISOString()
					});
					return false;
				}
			}

			const duration = Date.now() - startTime;
			logger.info('refreshIfNeeded() - Method exit - No refresh needed', {
				operation: 'refreshIfNeeded',
				operationId,
				result: true,
				duration,
				reason: 'Token not expiring soon',
				timestamp: new Date().toISOString()
			});

			return true;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error('refreshIfNeeded() - Method exit - Error', {
				operation: 'refreshIfNeeded',
				operationId,
				result: false,
				duration,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			});
			return false;
		}
	}

	/**
	 * Validate authentication headers
	 */
	public validateAuthHeaders(headers: Record<string, string>): boolean {
		try {
			if (!headers || typeof headers !== 'object') {
				return false;
			}

			const authHeader = headers['Authorization'] || headers['authorization'];
			
			if (!authHeader || typeof authHeader !== 'string') {
				return false;
			}

			// Check Bearer token format
			const bearerPattern = /^Bearer\s+[A-Za-z0-9._-]+$/;
			return bearerPattern.test(authHeader);
		} catch {
			return false;
		}
	}

	/**
	 * Extract token from authorization header
	 */
	public extractToken(authHeader: string): string | null {
		try {
			if (!authHeader || typeof authHeader !== 'string') {
				return null;
			}

			const match = authHeader.match(/^Bearer\s+(.+)$/);
			return match ? match[1] : null;
		} catch {
			return null;
		}
	}

	/**
	 * Get authentication code directly from OAuth flow
	 */
	public async getAuthCode(): Promise<string> {
		const operationId = `getAuthCode_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('getAuthCode() - Method entry', {
			operation: 'getAuthCode',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.error('getAuthCode() - OAuth manager not initialized', {
					operation: 'getAuthCode',
					operationId,
					timestamp: new Date().toISOString()
				});
				throw new Error('OAuth manager not initialized');
			}

			logger.debug('getAuthCode() - Initiating OAuth flow', {
				operation: 'getAuthCode',
				operationId,
				timestamp: new Date().toISOString()
			});

			const authCode = await this.oauthManager.initiateFlow();

			logger.info('getAuthCode() - Method exit - Success', {
				operation: 'getAuthCode',
				operationId,
				hasAuthCode: !!authCode,
				timestamp: new Date().toISOString()
			});
			
			return authCode;
		} catch (error) {
			logger.error('getAuthCode() - Method exit - Error', {
				operation: 'getAuthCode',
				operationId,
				error: error instanceof Error ? error.message : 'Unknown error',
				timestamp: new Date().toISOString()
			});
			throw new Error(`Failed to get auth code: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Process OAuth callback
	 */
	public async processCallback(code: string, state: string): Promise<boolean> {
		const startTime = Date.now();
		const operationId = `processCallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('processCallback() - Method entry', {
			operation: 'processCallback',
			operationId,
			hasCode: !!code,
			codeLength: code ? code.length : 0,
			hasState: !!state,
			stateLength: state ? state.length : 0,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.error('processCallback() - OAuth manager not initialized', {
					operation: 'processCallback',
					operationId,
					oauthManagerState: 'null',
					timestamp: new Date().toISOString()
				});
				throw new Error('OAuth manager not initialized');
			}

			if (!code || !state) {
				logger.error('processCallback() - Missing required parameters', {
					operation: 'processCallback',
					operationId,
					hasCode: !!code,
					hasState: !!state,
					timestamp: new Date().toISOString()
				});
				throw new Error('Missing authorization code or state');
			}

			logger.debug('processCallback() - Parameters validated, exchanging code for token', {
				operation: 'processCallback',
				operationId,
				timestamp: new Date().toISOString()
			});

			await this.oauthManager.exchangeCodeForToken(code, state);
			
			const duration = Date.now() - startTime;
			logger.info('processCallback() - Method exit - Success', {
				operation: 'processCallback',
				operationId,
				result: true,
				duration,
				timestamp: new Date().toISOString()
			});
			
			return true;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			logger.error('processCallback() - Method exit - Error', {
				operation: 'processCallback',
				operationId,
				result: false,
				duration,
				error: errorMessage,
				errorType: error instanceof Error ? error.constructor.name : 'unknown',
				timestamp: new Date().toISOString()
			});
			
			this.handleAuthError(error);
			return false;
		}
	}

	/**
	 * Logout user
	 */
	public logout(): void {
		try {
			if (this.oauthManager) {
				this.oauthManager.logout();
			}
		} catch {
			// Silent fail for logout
		}
	}

	/**
	 * Get OAuth configuration (without secrets)
	 */
	public getOAuthConfig(): any {
		try {
			if (!this.oauthManager) {
				return null;
			}
			return this.oauthManager.getConfig();
		} catch {
			return null;
		}
	}

	// Removed: validateAuthentication and handleMissingToken (no longer used)

	// Removed: handleMissingToken (no longer used)

	/**
	 * Validate authorization header format
	 */
	public validateAuthHeader(authHeader: string): boolean {
		try {
			const bearerPattern = /^Bearer\s+[A-Za-z0-9._-]{10,2048}$/;
			return bearerPattern.test(authHeader);
		} catch {
			return false;
		}
	}
}

interface AuthValidationResult {
	isValid: boolean;
	token?: string;
	requiresAuth?: boolean;
	authUrl?: string;
	error?: string;
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance();