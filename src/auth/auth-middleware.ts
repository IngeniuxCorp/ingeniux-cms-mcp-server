/**
 * Authentication middleware for MCP requests
 */

import { OAuthManager } from './oauth-manager.js';
import { AuthenticatedRequest, MCPRequest } from '../types/mcp-types.js';
import { errorHandler } from '../utils/error-handler.js';

export class AuthMiddleware {
	private static instance: AuthMiddleware;
	private oauthManager: OAuthManager | null = null;

	private constructor() {}

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
		try {
			if (!this.oauthManager) {
				throw new Error('OAuth manager not initialized');
			}

			// Validate authentication and get token
			const authResult = await this.validateAuthentication();
			
			if (!authResult.isValid) {
				throw new Error(`Authentication required: ${authResult.error || 'No valid token'}`);
			}

			// Add authentication headers
			const authenticatedRequest: AuthenticatedRequest = {
				...request,
				headers: {
					'Authorization': `Bearer ${authResult.token}`,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			};

			return authenticatedRequest;
		} catch (error) {
			throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Check if user is authenticated with automatic validation
	 */
	public async isAuthenticated(): Promise<boolean> {
		try {
			if (!this.oauthManager) {
				return false;
			}

			const authResult = await this.validateAuthentication();
			return authResult.isValid;
		} catch {
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
		try {
			if (!this.oauthManager) {
				return { isAuthenticated: false };
			}

			const isAuthenticated = this.oauthManager.isAuthenticated();
			
			if (isAuthenticated) {
				// Get token expiry from token store
				const tokenStore = require('./token-store.js').tokenStore;
				const expiry = tokenStore.getExpirationTime();
				
				return {
					isAuthenticated: true,
					tokenExpiry: expiry || undefined
				};
			}

			return { isAuthenticated: false };
		} catch {
			return { isAuthenticated: false };
		}
	}

	/**
	 * Refresh authentication if needed
	 */
	public async refreshIfNeeded(): Promise<boolean> {
		try {
			if (!this.oauthManager) {
				return false;
			}

			// Check if token needs refresh (expires within 10 minutes)
			const tokenStore = require('./token-store.js').tokenStore;
			
			if (tokenStore.expiresWithin(10)) {
				try {
					await this.oauthManager.refreshToken();
					return true;
				} catch {
					return false;
				}
			}

			return true; // No refresh needed
		} catch {
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
	 * Create authentication challenge response
	 */
	public createAuthChallenge(): { requiresAuth: boolean; authUrl?: string } {
		try {
			if (!this.oauthManager) {
				return { requiresAuth: true };
			}

			// Generate OAuth flow URL
			const authFlow = this.oauthManager.initiateFlow();
			
			return {
				requiresAuth: true,
				authUrl: authFlow.url
			};
		} catch {
			return { requiresAuth: true };
		}
	}

	/**
	 * Process OAuth callback
	 */
	public async processCallback(code: string, state: string): Promise<boolean> {
		try {
			if (!this.oauthManager) {
				throw new Error('OAuth manager not initialized');
			}

			if (!code || !state) {
				throw new Error('Missing authorization code or state');
			}

			// Exchange code for tokens
			await this.oauthManager.exchangeCodeForToken(code, state);
			return true;
		} catch (error) {
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
		try {
			if (!this.oauthManager) {
				return { isValid: false, error: 'OAuth manager not initialized' };
			}

			// Check if token exists and is valid
			const token = await this.oauthManager.getValidAccessToken();
			
			if (!token) {
				// Attempt to refresh or initiate OAuth
				return await this.handleMissingToken();
			}

			return { isValid: true, token };
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Handle missing or expired token
	 */
	private async handleMissingToken(): Promise<AuthValidationResult> {
		try {
			if (!this.oauthManager) {
				return { isValid: false, error: 'OAuth manager not initialized' };
			}

			// Try to refresh token first
			try {
				const refreshedToken = await this.oauthManager.refreshToken();
				if (refreshedToken) {
					return { isValid: true, token: refreshedToken.accessToken };
				}
			} catch (error) {
				// Refresh failed, need new OAuth flow
			}

			// Initiate new OAuth flow
			const authFlow = this.oauthManager.getAuthorizationCode();
			return {
				isValid: false,
				requiresAuth: true,
				authUrl: authFlow.url,
				error: 'OAUTH_FLOW_REQUIRED'
			};
		} catch (error) {
			return {
				isValid: false,
				error: error instanceof Error ? error.message : 'Unknown error'
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