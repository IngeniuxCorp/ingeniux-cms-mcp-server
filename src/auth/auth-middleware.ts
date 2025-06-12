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

			logger.debug('authenticate() - OAuth manager validated, calling validateAuthentication()', {
				operation: 'authenticate',
				requestId,
				oauthManagerState: 'initialized',
				timestamp: new Date().toISOString()
			});

			// Validate authentication and get token
			const authResult = await this.validateAuthentication();
			
			logger.debug('authenticate() - validateAuthentication() result', {
				operation: 'authenticate',
				requestId,
				authResultIsValid: authResult.isValid,
				authResultHasToken: !!authResult.token,
				authResultError: authResult.error || 'none',
				authResultRequiresAuth: authResult.requiresAuth || false,
				maskedToken: this.maskToken(authResult.token),
				timestamp: new Date().toISOString()
			});
			
			if (!authResult.isValid) {
				logger.warn('authenticate() - Authentication validation failed', {
					operation: 'authenticate',
					requestId,
					authError: authResult.error || 'No valid token',
					requiresAuth: authResult.requiresAuth || false,
					authUrl: authResult.authUrl || 'none',
					timestamp: new Date().toISOString()
				});
				throw new Error(`Authentication required: ${authResult.error || 'No valid token'}`);
			}

			logger.debug('authenticate() - Creating authenticated request', {
				operation: 'authenticate',
				requestId,
				hasValidToken: true,
				maskedToken: this.maskToken(authResult.token),
				timestamp: new Date().toISOString()
			});

			// Add authentication headers
			const authenticatedRequest: AuthenticatedRequest = {
				...request,
				headers: {
					'Authorization': `Bearer ${authResult.token}`,
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
	 * Check if user is authenticated with automatic validation
	 */
	public async isAuthenticated(): Promise<boolean> {
		const startTime = Date.now();
		const operationId = `isAuth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('isAuthenticated() - Method entry', {
			operation: 'isAuthenticated',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.warn('isAuthenticated() - OAuth manager not initialized', {
					operation: 'isAuthenticated',
					operationId,
					oauthManagerState: 'null',
					result: false,
					timestamp: new Date().toISOString()
				});
				return false;
			}

			logger.debug('isAuthenticated() - Calling validateAuthentication()', {
				operation: 'isAuthenticated',
				operationId,
				oauthManagerState: 'initialized',
				timestamp: new Date().toISOString()
			});

			const authResult = await this.validateAuthentication();
			
			const duration = Date.now() - startTime;
			logger.debug('isAuthenticated() - validateAuthentication() completed', {
				operation: 'isAuthenticated',
				operationId,
				authResultIsValid: authResult.isValid,
				authResultError: authResult.error || 'none',
				authResultRequiresAuth: authResult.requiresAuth || false,
				maskedToken: this.maskToken(authResult.token),
				duration,
				timestamp: new Date().toISOString()
			});

			logger.info('isAuthenticated() - Method exit - Success', {
				operation: 'isAuthenticated',
				operationId,
				result: authResult.isValid,
				duration,
				timestamp: new Date().toISOString()
			});

			return authResult.isValid;
		} catch (error) {
			const duration = Date.now() - startTime;
			logger.error('isAuthenticated() - Method exit - Error', {
				operation: 'isAuthenticated',
				operationId,
				result: false,
				duration,
				error: error instanceof Error ? error.message : 'Unknown error',
				errorType: error instanceof Error ? error.constructor.name : 'unknown',
				timestamp: new Date().toISOString()
			});
			return false;
		}
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
	public getAuthCode(): string {
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

			const authCode = this.oauthManager.initiateFlow();

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

	/**
	 * Validate current authentication state
	 */
	private async validateAuthentication(): Promise<AuthValidationResult> {
		const startTime = Date.now();
		const operationId = `validateAuth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('validateAuthentication() - Method entry', {
			operation: 'validateAuthentication',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.error('validateAuthentication() - OAuth manager not initialized', {
					operation: 'validateAuthentication',
					operationId,
					result: { isValid: false, error: 'OAuth manager not initialized' },
					timestamp: new Date().toISOString()
				});
				return { isValid: false, error: 'OAuth manager not initialized' };
			}

			logger.debug('validateAuthentication() - Getting valid access token', {
				operation: 'validateAuthentication',
				operationId,
				timestamp: new Date().toISOString()
			});

			const token = await this.oauthManager.getValidAccessToken();
			
			logger.debug('validateAuthentication() - Access token result', {
				operation: 'validateAuthentication',
				operationId,
				hasToken: !!token,
				maskedToken: this.maskToken(token),
				timestamp: new Date().toISOString()
			});
			
			if (!token) {
				logger.debug('validateAuthentication() - No valid token, calling handleMissingToken()', {
					operation: 'validateAuthentication',
					operationId,
					timestamp: new Date().toISOString()
				});

				const result = await this.handleMissingToken();
				const duration = Date.now() - startTime;
				
				logger.debug('validateAuthentication() - Method exit - Missing token handled', {
					operation: 'validateAuthentication',
					operationId,
					result: { isValid: result.isValid, requiresAuth: result.requiresAuth },
					duration,
					timestamp: new Date().toISOString()
				});
				
				return result;
			}

			const duration = Date.now() - startTime;
			logger.info('validateAuthentication() - Method exit - Success', {
				operation: 'validateAuthentication',
				operationId,
				result: { isValid: true },
				duration,
				maskedToken: this.maskToken(token),
				timestamp: new Date().toISOString()
			});

			return { isValid: true, token };
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			logger.error('validateAuthentication() - Method exit - Error', {
				operation: 'validateAuthentication',
				operationId,
				result: { isValid: false, error: errorMessage },
				duration,
				errorType: error instanceof Error ? error.constructor.name : 'unknown',
				timestamp: new Date().toISOString()
			});

			return {
				isValid: false,
				error: errorMessage
			};
		}
	}

	/**
	 * Handle missing or expired token
	 */
	private async handleMissingToken(): Promise<AuthValidationResult> {
		const startTime = Date.now();
		const operationId = `handleMissingToken_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		
		logger.debug('handleMissingToken() - Method entry', {
			operation: 'handleMissingToken',
			operationId,
			oauthManagerExists: !!this.oauthManager,
			timestamp: new Date().toISOString()
		});

		try {
			if (!this.oauthManager) {
				logger.error('handleMissingToken() - OAuth manager not initialized', {
					operation: 'handleMissingToken',
					operationId,
					result: { isValid: false, error: 'OAuth manager not initialized' },
					timestamp: new Date().toISOString()
				});
				return { isValid: false, error: 'OAuth manager not initialized' };
			}

			logger.debug('handleMissingToken() - Attempting token refresh', {
				operation: 'handleMissingToken',
				operationId,
				timestamp: new Date().toISOString()
			});

			try {
				const refreshedToken = await this.oauthManager.refreshToken();
				
				logger.debug('handleMissingToken() - Token refresh result', {
					operation: 'handleMissingToken',
					operationId,
					refreshSuccess: !!refreshedToken,
					hasAccessToken: !!(refreshedToken?.accessToken),
					maskedToken: this.maskToken(refreshedToken?.accessToken),
					timestamp: new Date().toISOString()
				});

				if (refreshedToken) {
					const duration = Date.now() - startTime;
					logger.info('handleMissingToken() - Method exit - Token refreshed successfully', {
						operation: 'handleMissingToken',
						operationId,
						result: { isValid: true },
						duration,
						maskedToken: this.maskToken(refreshedToken.accessToken),
						timestamp: new Date().toISOString()
					});
					return { isValid: true, token: refreshedToken.accessToken };
				}
			} catch (refreshError) {
				logger.warn('handleMissingToken() - Token refresh failed', {
					operation: 'handleMissingToken',
					operationId,
					refreshError: refreshError instanceof Error ? refreshError.message : 'Unknown refresh error',
					timestamp: new Date().toISOString()
				});
			}

			logger.debug('handleMissingToken() - Initiating new OAuth flow', {
				operation: 'handleMissingToken',
				operationId,
				timestamp: new Date().toISOString()
			});

			const authFlow = this.oauthManager.getAuthorizationCode();
			const result = {
				isValid: false,
				requiresAuth: true,
				authUrl: authFlow.url,
				error: 'OAUTH_FLOW_REQUIRED'
			};

			const duration = Date.now() - startTime;
			logger.info('handleMissingToken() - Method exit - OAuth flow initiated', {
				operation: 'handleMissingToken',
				operationId,
				result: { isValid: false, requiresAuth: true, hasAuthUrl: !!authFlow.url },
				duration,
				timestamp: new Date().toISOString()
			});

			return result;
		} catch (error) {
			const duration = Date.now() - startTime;
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			logger.error('handleMissingToken() - Method exit - Error', {
				operation: 'handleMissingToken',
				operationId,
				result: { isValid: false, error: errorMessage },
				duration,
				errorType: error instanceof Error ? error.constructor.name : 'unknown',
				timestamp: new Date().toISOString()
			});

			return {
				isValid: false,
				error: errorMessage
			};
		}
	}

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