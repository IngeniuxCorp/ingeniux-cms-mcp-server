/**
 * OAuth 2.0 Code Flow implementation with PKCE for Ingeniux CMS
 */

import { randomBytes, createHash } from 'crypto';
import { OAuthConfig } from '../types/config-types.js';
import { TokenData, OAuthTokenResponse } from '../types/api-types.js';
import { tokenStore } from './token-store.js';

export interface PKCEData {
	codeVerifier: string;
	codeChallenge: string;
	state: string;
}

export interface AuthorizationURL {
	url: string;
	state: string;
	codeVerifier: string;
}

export class OAuthManager {
	private static instance: OAuthManager;
	private config: OAuthConfig;
	private pendingAuth: Map<string, PKCEData> = new Map();

	private constructor(config: OAuthConfig) {
		this.config = config;
	}

	public static getInstance(config: OAuthConfig): OAuthManager {
		if (!OAuthManager.instance) {
			OAuthManager.instance = new OAuthManager(config);
		}
		return OAuthManager.instance;
	}

	/**
	 * Step 1: Get authorization code (initiate flow)
	 */
	public getAuthorizationCode(): AuthorizationURL {
		try {
			// Generate PKCE parameters
			const codeVerifier = this.generateCodeVerifier();
			const codeChallenge = this.generateCodeChallenge(codeVerifier);
			const state = this.generateState();

			// Store PKCE data for validation
			const pkceData: PKCEData = {
				codeVerifier,
				codeChallenge,
				state
			};
			this.pendingAuth.set(state, pkceData);

			// Build authorization URL
			const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

			console.log('OAuth authorization code flow initiated');

			return {
				url: authUrl,
				state,
				codeVerifier
			};
		} catch (error) {
			throw new Error(`Failed to get authorization code: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Initiate OAuth flow with PKCE - returns auth code directly
	 */
	public initiateFlow(): string {
		try {
			// Generate PKCE parameters
			const codeVerifier = this.generateCodeVerifier();
			const codeChallenge = this.generateCodeChallenge(codeVerifier);
			const state = this.generateState();

			// Store PKCE data for validation
			const pkceData: PKCEData = {
				codeVerifier,
				codeChallenge,
				state
			};
			this.pendingAuth.set(state, pkceData);

			// Build authorization URL
			this.buildAuthorizationUrl(codeChallenge, state);

			console.log('OAuth authorization code flow initiated');

			// Make request to CMS server to get auth code
			// CMS server returns {code: string} when hitting authorization URL
			return this.extractAuthCodeFromCMS();
		} catch (error) {
			throw new Error(`Failed to initiate OAuth flow: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Extract auth code from CMS server response
	 */
	private extractAuthCodeFromCMS(): string {
		try {
			// Simulated code for now
			const simulatedResponse = { code: `auth_code_${Date.now()}` };
			return simulatedResponse.code;
		} catch (error) {
			throw new Error(`Failed to extract auth code from CMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Step 2: Get access token (exchange code)
	 */
	public async getAccessToken(code: string, state: string): Promise<TokenData> {
		try {
			// Exchange code for token
			const tokenData = await this.exchangeCodeForToken(code, state);

			// Store with 20-minute expiry
			tokenStore.store(tokenData);

			console.log('OAuth access token obtained and cached for 20 minutes');

			return tokenData;
		} catch (error) {
			throw new Error(`Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Exchange authorization code for access token
	 */
	public async exchangeCodeForToken(code: string, state: string): Promise<TokenData> {
		try {
			// Validate state parameter
			const pkceData = this.pendingAuth.get(state);
			if (!pkceData) {
				throw new Error('Invalid or expired state parameter');
			}

			// Remove from pending auth
			this.pendingAuth.delete(state);

			// Prepare token exchange request
			const tokenRequest = {
				grant_type: 'authorization_code',
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				code,
				redirect_uri: this.config.redirectUri,
				code_verifier: pkceData.codeVerifier
			};

			// Make token request
			const response = await this.makeTokenRequest(tokenRequest);
			
			// Process tokens
			const tokenData = this.processTokenResponse(response);

			return tokenData;
		} catch (error) {
			throw new Error(`Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Enhanced refresh with 20-minute expiry
	 */
	public async refreshToken(refreshToken?: string): Promise<TokenData> {
		try {
			const tokenToRefresh = refreshToken || tokenStore.getRefreshToken();
			
			if (!tokenToRefresh) {
				throw new Error('No refresh token available');
			}

			// Prepare refresh request
			const refreshRequest = {
				grant_type: 'refresh_token',
				client_id: this.config.clientId,
				client_secret: this.config.clientSecret,
				refresh_token: tokenToRefresh
			};

			// Make refresh request
			const response = await this.makeTokenRequest(refreshRequest);
			
			// Process new tokens
			const tokenData = this.processTokenResponse(response);
			
			// Store with 20-minute expiry
			tokenStore.store(tokenData);

			return tokenData;
		} catch (error) {
			// Clear tokens on refresh failure
			tokenStore.clear();
			throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get valid access token with automatic refresh
	 */
	public async getValidAccessToken(): Promise<string | null> {
		try {
			// Check if current token is valid
			if (tokenStore.isValid()) {
				return tokenStore.getAccessToken();
			}

			// Try to refresh token
			try {
				const refreshedTokens = await this.refreshToken();
				return refreshedTokens.accessToken;
			} catch {
				// Refresh failed, return null to trigger new OAuth flow
				return null;
			}
		} catch {
			return null;
		}
	}

	/**
	 * Check if user is authenticated
	 */
	public isAuthenticated(): boolean {
		try {
			return tokenStore.isValid();
		} catch {
			return false;
		}
	}

	/**
	 * Logout and clear tokens
	 */
	public logout(): void {
		try {
			tokenStore.clear();
			this.pendingAuth.clear();
		} catch {
			// Silent fail for logout
		}
	}

	/**
	 * Generate PKCE code verifier
	 */
	private generateCodeVerifier(): string {
		try {
			return randomBytes(32).toString('base64url');
		} catch {
			// Fallback method
			return Math.random().toString(36).substring(2, 15) + 
				   Math.random().toString(36).substring(2, 15);
		}
	}

	/**
	 * Generate PKCE code challenge
	 */
	private generateCodeChallenge(codeVerifier: string): string {
		try {
			return createHash('sha256')
				.update(codeVerifier)
				.digest('base64url');
		} catch {
			// Fallback to plain text (less secure)
			return codeVerifier;
		}
	}

	/**
	 * Generate state parameter
	 */
	private generateState(): string {
		try {
			return randomBytes(16).toString('hex');
		} catch {
			// Fallback method
			return Math.random().toString(36).substring(2, 15) + 
				   Math.random().toString(36).substring(2, 15);
		}
	}

	/**
	 * Build authorization URL
	 */
	private buildAuthorizationUrl(codeChallenge: string, state: string): string {
		try {
			const params = new URLSearchParams({
				response_type: 'code',
				client_id: this.config.clientId,
				redirect_uri: this.config.redirectUri,
				scope: this.config.scopes.join(' '),
				state,
				code_challenge: codeChallenge,
				code_challenge_method: 'S256'
			});

			return `${this.config.authorizationUrl}?${params.toString()}`;
		} catch (error) {
			throw new Error(`Failed to build authorization URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Make token request to OAuth server
	 */
	private async makeTokenRequest(requestData: any): Promise<OAuthTokenResponse> {
		try {
			// Convert object to URLSearchParams for form encoding
			const formData = new URLSearchParams();
			Object.entries(requestData).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					formData.append(key, String(value));
				}
			});

			const response = await fetch(this.config.tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json'
				},
				body: formData,
				signal: AbortSignal.timeout(30000)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({})) as any;
				const message = errorData?.error_description ||
							   errorData?.error ||
							   `HTTP ${response.status}: ${response.statusText}`;
				throw new Error(`OAuth request failed: ${message}`);
			}

			return await response.json() as OAuthTokenResponse;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error(`OAuth request failed: ${String(error)}`);
		}
	}

	/**
	 * Process token response and create TokenData
	 */
	private processTokenResponse(response: OAuthTokenResponse): TokenData {
		try {
			if (!response.access_token) {
				throw new Error('No access token in response');
			}

			// Calculate expiration time
			const expiresIn = response.expires_in || 3600; // Default 1 hour
			const expiresAt = new Date(Date.now() + (expiresIn * 1000));

			return {
				accessToken: response.access_token,
				refreshToken: response.refresh_token || '',
				expiresAt,
				tokenType: response.token_type || 'Bearer',
				scope: response.scope || undefined
			};
		} catch (error) {
			throw new Error(`Failed to process token response: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Update OAuth configuration
	 */
	public updateConfig(newConfig: OAuthConfig): void {
		try {
			this.config = { ...newConfig };
		} catch (error) {
			throw new Error(`Failed to update OAuth config: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get current OAuth configuration (without secrets)
	 */
	public getConfig(): Omit<OAuthConfig, 'clientSecret'> {
		return {
			clientId: this.config.clientId,
			authorizationUrl: this.config.authorizationUrl,
			tokenUrl: this.config.tokenUrl,
			redirectUri: this.config.redirectUri,
			scopes: [...this.config.scopes]
		};
	}
}