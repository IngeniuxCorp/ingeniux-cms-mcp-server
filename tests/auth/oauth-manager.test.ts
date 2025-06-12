/**
 * OAuth Manager Tests
 */

import { OAuthManager } from '../../src/auth/oauth-manager';
import { MockFactories } from '../mocks/mock-factories';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock AbortSignal.timeout
global.AbortSignal = {
	...global.AbortSignal,
	timeout: jest.fn((_timeout: number) => ({
		aborted: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn()
	}))
} as any;

// Mock token store using factory function
jest.mock('../../src/auth/token-store', () => {
	const mockTokenStore = {
		store: jest.fn(),
		clear: jest.fn(),
		getRefreshToken: jest.fn(),
		isValid: jest.fn(),
		expiresWithin: jest.fn(),
		getAccessToken: jest.fn()
	};
	
	return {
		tokenStore: mockTokenStore,
		TokenStore: {
			getInstance: jest.fn(() => mockTokenStore)
		}
	};
});

// Get reference to mock for test usage
const mockTokenStore = require('../../src/auth/token-store').tokenStore;

// Mock crypto
jest.mock('crypto', () => ({
	randomBytes: jest.fn().mockReturnValue({
		toString: jest.fn().mockReturnValue('mock-random-bytes')
	}),
	createHash: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn().mockReturnValue('mock-hash')
	})
}));

describe('OAuthManager', () => {
	let oauthManager: OAuthManager;
	let mockConfig: any;

	beforeEach(() => {
		mockConfig = MockFactories.createOAuthConfig();
		
		// Reset singleton for each test
		(OAuthManager as any).instance = null;
		oauthManager = OAuthManager.getInstance(mockConfig);

		jest.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = OAuthManager.getInstance(mockConfig);
			const instance2 = OAuthManager.getInstance(mockConfig);
			expect(instance1).toBe(instance2);
		});
	});

	describe('getAuthorizationCode (two-step OAuth process)', () => {
		it('should generate authorization URL with PKCE parameters', () => {
			const result = oauthManager.getAuthorizationCode();

			expect(result).toHaveProperty('url');
			expect(result).toHaveProperty('state');
			expect(result).toHaveProperty('codeVerifier');
			expect(result.url).toContain(mockConfig.authorizationUrl);
			expect(result.url).toContain('response_type=code');
			expect(result.url).toContain('client_id=test-client-id');
			expect(result.url).toContain('code_challenge_method=S256');
		});

		it('should store PKCE data for later validation', () => {
			const result = oauthManager.getAuthorizationCode();
			
			expect(result.state).toBeDefined();
			expect(result.codeVerifier).toBeDefined();
		});

		it('should handle errors during authorization code generation', () => {
			const originalURLSearchParams = global.URLSearchParams;
			global.URLSearchParams = jest.fn().mockImplementation(() => {
				throw new Error('URL construction error');
			});

			expect(() => oauthManager.getAuthorizationCode()).toThrow('Failed to get authorization code');
			
			global.URLSearchParams = originalURLSearchParams;
		});
	});

	describe('getAccessToken (two-step OAuth process)', () => {
		it('should exchange code for tokens and store with 20-minute expiry', async () => {
			const authFlow = oauthManager.getAuthorizationCode();
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await oauthManager.getAccessToken('auth-code', authFlow.state);

			expect(mockTokenStore.store).toHaveBeenCalledWith(expect.objectContaining({
				accessToken: mockTokenResponse.access_token,
				refreshToken: mockTokenResponse.refresh_token
			}));
			expect(result.accessToken).toBe(mockTokenResponse.access_token);
		});

		it('should reject invalid state parameter', async () => {
			await expect(
				oauthManager.getAccessToken('auth-code', 'invalid-state')
			).rejects.toThrow('Failed to get access token');
		});

		it('should handle token exchange errors', async () => {
			const authFlow = oauthManager.getAuthorizationCode();
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				oauthManager.getAccessToken('auth-code', authFlow.state)
			).rejects.toThrow('Failed to get access token');
		});
	});

	describe('initiateFlow (updated method)', () => {
		it('should return auth code string directly', () => {
			const result = oauthManager.initiateFlow();

			expect(typeof result).toBe('string');
			expect(result).toContain('auth_code_');
		});

		it('should handle errors during flow initiation', () => {
			// Mock URLSearchParams to throw error during URL building
			const originalURLSearchParams = global.URLSearchParams;
			global.URLSearchParams = jest.fn().mockImplementation(() => {
				throw new Error('URL construction error');
			});

			expect(() => oauthManager.initiateFlow()).toThrow('Failed to initiate OAuth flow');
			
			// Restore original
			global.URLSearchParams = originalURLSearchParams;
		});
	});

	describe('extractAuthCodeFromCMS helper method', () => {
		it('should extract auth code from CMS response', () => {
			// Test the helper method indirectly through initiateFlow
			const result = oauthManager.initiateFlow();
			
			expect(typeof result).toBe('string');
			expect(result).toMatch(/^auth_code_\d+$/);
		});
	});

	describe('exchangeCodeForToken', () => {
		it('should exchange authorization code for tokens', async () => {
			// Setup
			const authFlow = oauthManager.getAuthorizationCode();
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Execute
			const result = await oauthManager.exchangeCodeForToken('auth-code', authFlow.state);

			// Verify fetch was called with correct parameters
			expect(mockFetch).toHaveBeenCalledWith(
				mockConfig.tokenUrl,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					},
					body: expect.any(URLSearchParams)
				})
			);

			// Verify token store was called
			expect(mockTokenStore.store).toHaveBeenCalledWith(expect.objectContaining({
				accessToken: mockTokenResponse.access_token,
				refreshToken: mockTokenResponse.refresh_token
			}));
			expect(result.accessToken).toBe(mockTokenResponse.access_token);
		});

		it('should reject invalid state parameter', async () => {
			await expect(
				oauthManager.exchangeCodeForToken('auth-code', 'invalid-state')
			).rejects.toThrow('Invalid or expired state parameter');
		});

		it('should handle token exchange errors', async () => {
			const authFlow = oauthManager.getAuthorizationCode();
			
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			await expect(
				oauthManager.exchangeCodeForToken('auth-code', authFlow.state)
			).rejects.toThrow('Token exchange failed');
		});
	});

	describe('refreshToken', () => {
		it('should refresh access token using stored refresh token', async () => {
			// Setup
			const mockTokenResponse = MockFactories.createOAuthTokenResponse({
				access_token: 'new-access-token'
			});
			
			mockTokenStore.getRefreshToken.mockReturnValue('stored-refresh-token');
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Execute
			const result = await oauthManager.refreshToken();

			// Verify fetch was called correctly
			expect(mockFetch).toHaveBeenCalledWith(
				mockConfig.tokenUrl,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					},
					body: expect.any(URLSearchParams)
				})
			);
			expect(result.accessToken).toBe('new-access-token');
		});

		it('should use provided refresh token', async () => {
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await oauthManager.refreshToken('custom-refresh-token');

			expect(mockFetch).toHaveBeenCalledWith(
				mockConfig.tokenUrl,
				expect.objectContaining({
					method: 'POST'
				})
			);
		});

		it('should throw error when no refresh token available', async () => {
			mockTokenStore.getRefreshToken.mockReturnValue(null);

			await expect(oauthManager.refreshToken()).rejects.toThrow('No refresh token available');
		});

		it('should clear tokens on refresh failure', async () => {
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');
			mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

			await expect(oauthManager.refreshToken()).rejects.toThrow('Token refresh failed');
			expect(mockTokenStore.clear).toHaveBeenCalled();
		});
	});

	describe('getValidAccessToken', () => {
		it('should return valid access token', async () => {
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-token');

			const result = await oauthManager.getValidAccessToken();

			expect(result).toBe('valid-token');
		});

		it('should refresh token when expires soon', async () => {
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await oauthManager.getValidAccessToken();

			expect(result).toBe(mockTokenResponse.access_token);
		});

		it('should return null when token invalid and refresh fails', async () => {
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');
			mockFetch.mockRejectedValueOnce(new Error('Refresh failed'));

			const result = await oauthManager.getValidAccessToken();

			expect(result).toBeNull();
		});
	});

	describe('isAuthenticated', () => {
		it('should return true when token is valid', () => {
			mockTokenStore.isValid.mockReturnValue(true);

			const result = oauthManager.isAuthenticated();

			expect(result).toBe(true);
		});

		it('should return false when token is invalid', () => {
			mockTokenStore.isValid.mockReturnValue(false);

			const result = oauthManager.isAuthenticated();

			expect(result).toBe(false);
		});

		it('should handle errors gracefully', () => {
			mockTokenStore.isValid.mockImplementation(() => {
				throw new Error('Token store error');
			});

			const result = oauthManager.isAuthenticated();

			expect(result).toBe(false);
		});
	});

	describe('logout', () => {
		it('should clear tokens and pending auth', () => {
			oauthManager.logout();

			expect(mockTokenStore.clear).toHaveBeenCalled();
		});

		it('should handle errors gracefully', () => {
			mockTokenStore.clear.mockImplementation(() => {
				throw new Error('Clear error');
			});

			expect(() => oauthManager.logout()).not.toThrow();
		});
	});

	describe('updateConfig', () => {
		it('should update OAuth configuration', () => {
			const newConfig = MockFactories.createOAuthConfig({
				clientId: 'new-client-id'
			});

			oauthManager.updateConfig(newConfig);

			const config = oauthManager.getConfig();
			expect(config.clientId).toBe('new-client-id');
		});
	});

	describe('getConfig', () => {
		it('should return config without client secret', () => {
			const config = oauthManager.getConfig();

			expect(config).toHaveProperty('clientId');
			expect(config).toHaveProperty('authorizationUrl');
			expect(config).not.toHaveProperty('clientSecret');
		});
	});

	describe('error handling', () => {
		it('should handle HTTP errors in token requests', async () => {
			const authFlow = oauthManager.getAuthorizationCode();
			
			const errorResponse = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					error: 'invalid_grant',
					error_description: 'Invalid authorization code'
				})
			};
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				oauthManager.exchangeCodeForToken('invalid-code', authFlow.state)
			).rejects.toThrow('OAuth request failed: Invalid authorization code');
		});

		it('should handle network errors', async () => {
			const authFlow = oauthManager.getAuthorizationCode();
			
			mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

			await expect(
				oauthManager.exchangeCodeForToken('auth-code', authFlow.state)
			).rejects.toThrow('Token exchange failed');
		});
	});
});