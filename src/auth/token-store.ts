/**
 * Secure token storage for OAuth authentication
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { TokenData } from '../types/api-types.js';

export class TokenStore {
	private static instance: TokenStore;
	private tokenData: TokenData | null = null;
	private encryptionKey: string;

	private constructor() {
		// Generate encryption key from environment or create one
		this.encryptionKey = this.generateEncryptionKey();
	}

	public static getInstance(): TokenStore {
		if (!TokenStore.instance) {
			TokenStore.instance = new TokenStore();
		}
		return TokenStore.instance;
	}

	/**
	 * Store token data securely
	 */
	public store(tokens: TokenData): void {
		try {
			if (!tokens) {
				throw new Error('Token data is required');
			}

			// Validate token data
			this.validateTokenData(tokens);

			// Store encrypted token data
			this.tokenData = {
				accessToken: this.encrypt(tokens.accessToken),
				refreshToken: this.encrypt(tokens.refreshToken),
				expiresAt: tokens.expiresAt,
				tokenType: tokens.tokenType,
				scope: tokens.scope
			};
		} catch (error) {
			throw new Error(`Failed to store tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Retrieve and decrypt token data
	 */
	public retrieve(): TokenData | null {
		try {
			if (!this.tokenData) {
				return null;
			}

			return {
				accessToken: this.decrypt(this.tokenData.accessToken),
				refreshToken: this.decrypt(this.tokenData.refreshToken),
				expiresAt: this.tokenData.expiresAt,
				tokenType: this.tokenData.tokenType,
				scope: this.tokenData.scope
			};
		} catch (error) {
			// If decryption fails, clear stored data
			this.clear();
			return null;
		}
	}

	/**
	 * Clear stored token data
	 */
	public clear(): void {
		try {
			this.tokenData = null;
		} catch (error) {
			// Silent fail for clearing
		}
	}

	/**
	 * Check if stored token is valid and not expired
	 */
	public isValid(): boolean {
		try {
			if (!this.tokenData) {
				return false;
			}

			// Check if token is expired
			const now = new Date();
			const expiresAt = new Date(this.tokenData.expiresAt);
			
			// Add 5 minute buffer before expiration
			const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
			return expiresAt.getTime() > (now.getTime() + bufferTime);
		} catch {
			return false;
		}
	}

	/**
	 * Get access token if valid
	 */
	public getAccessToken(): string | null {
		try {
			if (!this.isValid()) {
				return null;
			}

			const tokens = this.retrieve();
			return tokens?.accessToken || null;
		} catch {
			return null;
		}
	}

	/**
	 * Get refresh token
	 */
	public getRefreshToken(): string | null {
		try {
			const tokens = this.retrieve();
			return tokens?.refreshToken || null;
		} catch {
			return null;
		}
	}

	/**
	 * Update access token while keeping refresh token
	 */
	public updateAccessToken(accessToken: string, expiresAt: Date): void {
		try {
			if (!this.tokenData) {
				throw new Error('No existing token data to update');
			}

			const currentTokens = this.retrieve();
			if (!currentTokens) {
				throw new Error('Failed to retrieve current tokens');
			}

			this.store({
				accessToken,
				refreshToken: currentTokens.refreshToken,
				expiresAt,
				tokenType: currentTokens.tokenType,
				scope: currentTokens.scope
			});
		} catch (error) {
			throw new Error(`Failed to update access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get token expiration time
	 */
	public getExpirationTime(): Date | null {
		try {
			return this.tokenData?.expiresAt || null;
		} catch {
			return null;
		}
	}

	/**
	 * Check if token expires within specified minutes
	 */
	public expiresWithin(minutes: number): boolean {
		try {
			if (!this.tokenData) {
				return true; // No token means it's expired
			}

			const now = new Date();
			const expiresAt = new Date(this.tokenData.expiresAt);
			const thresholdTime = minutes * 60 * 1000; // Convert to milliseconds

			return expiresAt.getTime() <= (now.getTime() + thresholdTime);
		} catch {
			return true; // Assume expired on error
		}
	}

	/**
	 * Validate token data structure
	 */
	private validateTokenData(tokens: TokenData): void {
		if (!tokens.accessToken || typeof tokens.accessToken !== 'string') {
			throw new Error('Invalid access token');
		}

		if (!tokens.refreshToken || typeof tokens.refreshToken !== 'string') {
			throw new Error('Invalid refresh token');
		}

		if (!tokens.expiresAt || !(tokens.expiresAt instanceof Date)) {
			throw new Error('Invalid expiration date');
		}

		if (!tokens.tokenType || typeof tokens.tokenType !== 'string') {
			throw new Error('Invalid token type');
		}
	}

	/**
	 * Generate encryption key
	 */
	private generateEncryptionKey(): string {
		try {
			// Use environment variable if available, otherwise generate from system info
			const envKey = process?.env?.TOKEN_ENCRYPTION_KEY;
			if (envKey && envKey.length >= 32) {
				return envKey.substring(0, 32);
			}

			// Generate key from system information
			const systemInfo = `${Date.now()}-${Math.random()}-ingeniux-mcp-server`;
			return createHash('sha256').update(systemInfo).digest('hex').substring(0, 32);
		} catch {
			// Fallback key
			return 'ingeniux-mcp-server-default-key32';
		}
	}

	/**
	 * Encrypt sensitive data
	 */
	private encrypt(data: string): string {
		try {
			const iv = randomBytes(16);
			const key = createHash('sha256').update(this.encryptionKey).digest();
			const cipher = createCipheriv('aes-256-cbc', key, iv);
			
			let encrypted = cipher.update(data, 'utf8', 'hex');
			encrypted += cipher.final('hex');
			
			// Prepend IV to encrypted data
			return iv.toString('hex') + ':' + encrypted;
		} catch {
			// Return original data if encryption fails
			return data;
		}
	}

	/**
	 * Decrypt sensitive data
	 */
	private decrypt(encryptedData: string): string {
		try {
			// Check if data contains IV separator
			if (!encryptedData.includes(':')) {
				// Fallback for old format - return as is
				return encryptedData;
			}
			
			const parts = encryptedData.split(':');
			if (parts.length !== 2) {
				return encryptedData;
			}
			
			const iv = Buffer.from(parts[0], 'hex');
			const encrypted = parts[1];
			const key = createHash('sha256').update(this.encryptionKey).digest();
			
			const decipher = createDecipheriv('aes-256-cbc', key, iv);
			let decrypted = decipher.update(encrypted, 'hex', 'utf8');
			decrypted += decipher.final('utf8');
			
			return decrypted;
		} catch {
			// Return encrypted data if decryption fails
			return encryptedData;
		}
	}
}

// Export singleton instance
export const tokenStore = TokenStore.getInstance();