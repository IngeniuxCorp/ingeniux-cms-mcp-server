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
	 * Authenticate MCP request
	 */
	public async authenticate(request: MCPRequest): Promise<AuthenticatedRequest> {
		try {
			if (!this.oauthManager) {
				throw new Error('OAuth manager not initialized');
			}

			// Get valid access token
			const accessToken = await this.oauthManager.getValidAccessToken();
			
			if (!accessToken) {
				throw new Error('No valid access token available');
			}

			// Add authentication headers
			const authenticatedRequest: AuthenticatedRequest = {
				...request,
				headers: {
					'Authorization': `Bearer ${accessToken}`,
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
	 * Check if user is authenticated
	 */
	public isAuthenticated(): boolean {
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
}

// Export singleton instance
export const authMiddleware = AuthMiddleware.getInstance();