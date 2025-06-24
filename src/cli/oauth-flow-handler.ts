/**
 * OAuth Flow Management
 */

import { OAuthManager } from '../auth/oauth-manager.js';
import { authMiddleware } from '../auth/auth-middleware.js';
import { TokenData } from '../types/api-types.js';
import { CLIConfig } from './types/cli-types.js';
import { logger } from '../utils/logger.js';
import { tokenStore } from '../auth/token-store.js';

export class OAuthFlowHandler {
	private oauthManager: OAuthManager;
	// Configuration will be used in future implementations
	// private config: CLIConfig;
	private currentState: string | null = null;

	constructor(config: CLIConfig) {
		// Configuration will be used in future implementations
		// this.config = config;
		this.oauthManager = OAuthManager.getInstance(config.oauth);
		authMiddleware.initialize(this.oauthManager);
	}

	public async isAuthenticated(): Promise<boolean> {
		try {
			return await authMiddleware.isAuthenticated();
		} catch (error) {
			logger.debug('Authentication check failed', { error });
			return false;
		}
	}

	public async getCurrentTokens(): Promise<TokenData | null> {
		try {
			const token = await this.oauthManager.getValidAccessToken();
			if (!token) return null;
			
			// Get token details from token store
			return {
				accessToken: token,
				refreshToken: tokenStore.getRefreshToken() || '',
				expiresAt: tokenStore.getExpirationTime() || new Date(),
				tokenType: 'Bearer',
				scope: undefined
			};
		} catch (error) {
			logger.debug('Failed to get current tokens', { error });
			return null;
		}
	}

	public async initiateFlow(): Promise<string> {
		try {
			logger.info('Initiating OAuth flow');
			
			// Generate authorization URL with PKCE
			const authFlow = this.oauthManager.getAuthorizationCode();
			
			// Store state for validation
			this.currentState = authFlow.state;
			
			logger.debug('OAuth flow initiated', {
				hasUrl: !!authFlow.url,
				hasState: !!authFlow.state,
				hasCodeVerifier: !!authFlow.codeVerifier
			});
			
			return authFlow.url;
		} catch (error) {
			logger.error('Failed to initiate OAuth flow', { error });
			throw new Error(`OAuth flow initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public async exchangeCodeForTokens(authCode: string): Promise<TokenData> {
		try {
			if (!this.currentState) {
				throw new Error('No active OAuth flow found');
			}
			
			logger.info('Exchanging authorization code for tokens');
			
			// Exchange code for tokens
			const tokenData = await this.oauthManager.exchangeCodeForToken(
				authCode, 
				this.currentState
			);
			
			// Clear state after successful exchange
			this.currentState = null;
			
			logger.info('Token exchange completed successfully', {
				hasAccessToken: !!tokenData.accessToken,
				hasRefreshToken: !!tokenData.refreshToken,
				expiresAt: tokenData.expiresAt
			});
			
			return tokenData;
		} catch (error) {
			logger.error('Token exchange failed', { error });
			this.currentState = null; // Clear state on error
			throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public async refreshTokens(): Promise<TokenData> {
		try {
			logger.info('Refreshing tokens');
			return await this.oauthManager.refreshToken();
		} catch (error) {
			logger.error('Token refresh failed', { error });
			throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public logout(): void {
		try {
			this.oauthManager.logout();
			this.currentState = null;
			logger.info('Logout completed');
		} catch (error) {
			logger.error('Logout failed', { error });
		}
	}

	public getOAuthConfig(): any {
		return this.oauthManager.getConfig();
	}
/**
	 * Expose the underlying OAuthManager instance for advanced flows.
	 */
	public getOAuthManager(): OAuthManager {
		return this.oauthManager;
	}
}