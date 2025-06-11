/**
 * OAuth Flow Integration Tests
 */

import { OAuthManager } from '../../src/auth/oauth-manager';
import { APIClient } from '../../src/api/api-client';
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

// Mock token store
const mockTokenStore = {
	store: jest.fn(),
	clear: jest.fn(),
	getRefreshToken: jest.fn(),
	isValid: jest.fn(),
	expiresWithin: jest.fn(),
	getAccessToken: jest.fn()
};

jest.mock('../../src/auth/token-store', () => ({
	tokenStore: mockTokenStore,
	TokenStore: {
		getInstance: jest.fn(() => mockTokenStore)
	}
}));

describe('OAuth Flow Integration', () => {
	let oauthManager: OAuthManager;
	let apiClient: APIClient;
	let mockConfig: any;

	beforeEach(() => {
		mockConfig = MockFactories.createServerConfig();
		
		// Reset singletons
		(OAuthManager as any).instance = null;
		(APIClient as any).instance = null;
		
		oauthManager = OAuthManager.getInstance(mockConfig.oauth);
		apiClient = APIClient.getInstance(mockConfig);
		
		jest.clearAllMocks();
	});

	describe('Complete OAuth Flow', () => {
		it('should complete full authorization code flow', async () => {
			// Step 1: Initiate OAuth flow
			const authFlow = oauthManager.initiateFlow();
			
			expect(authFlow.url).toContain('response_type=code');
			expect(authFlow.url).toContain('code_challenge_method=S256');
			expect(authFlow.state).toBeDefined();
			expect(authFlow.codeVerifier).toBeDefined();

			// Step 2: Mock authorization server response
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Step 3: Exchange code for tokens
			const tokenData = await oauthManager.exchangeCodeForToken('auth-code', authFlow.state);
			
			expect(mockFetch).toHaveBeenCalledWith(
				mockConfig.oauth.tokenUrl,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					},
					body: expect.any(URLSearchParams)
				})
			);
			
			expect(mockTokenStore.store).toHaveBeenCalledWith(tokenData);
			expect(tokenData.accessToken).toBe(mockTokenResponse.access_token);
		});

		it('should handle token refresh flow', async () => {
			// Setup: Token exists but expires soon
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			const mockRefreshResponse = MockFactories.createOAuthTokenResponse({
				access_token: 'new-access-token'
			});
			
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockRefreshResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Execute refresh
			const newToken = await oauthManager.getValidAccessToken();

			expect(mockFetch).toHaveBeenCalledWith(
				mockConfig.oauth.tokenUrl,
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					},
					body: expect.any(URLSearchParams)
				})
			);
			
			expect(newToken).toBe('new-access-token');
		});

		it('should handle authentication errors gracefully', async () => {
			const authFlow = oauthManager.initiateFlow();
			
			// Mock OAuth server error
			const errorResponse = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					error: 'invalid_grant',
					error_description: 'Authorization code expired'
				})
			};
			
			mockFetch.mockResolvedValueOnce(errorResponse);

			await expect(
				oauthManager.exchangeCodeForToken('expired-code', authFlow.state)
			).rejects.toThrow('OAuth request failed: Authorization code expired');
		});
	});

	describe('API Client Integration with OAuth', () => {
		it('should make authenticated API requests', async () => {
			// Setup valid token
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-access-token');

			const mockApiResponseData = { data: 'success' };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue(mockApiResponseData)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Make API request
			const result = await apiClient.request({
				method: 'GET',
				url: '/api/test',
				headers: {
					'Authorization': 'Bearer valid-access-token'
				}
			});

			expect(result.data).toEqual({ data: 'success' });
		});

		it('should handle token expiration during API calls', async () => {
			// First call: token expired
			mockTokenStore.isValid.mockReturnValueOnce(false);
			mockTokenStore.expiresWithin.mockReturnValueOnce(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			// Mock refresh token response
			const mockRefreshResponse = MockFactories.createOAuthTokenResponse({
				access_token: 'refreshed-token'
			});
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockRefreshResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Second call: use refreshed token
			const refreshedToken = await oauthManager.getValidAccessToken();
			expect(refreshedToken).toBe('refreshed-token');
		});
	});

	describe('Error Recovery Scenarios', () => {
		it('should clear tokens on refresh failure', async () => {
			mockTokenStore.getRefreshToken.mockReturnValue('invalid-refresh-token');
			mockFetch.mockRejectedValueOnce(new Error('Invalid refresh token'));

			await expect(oauthManager.refreshToken()).rejects.toThrow('Token refresh failed');
			expect(mockTokenStore.clear).toHaveBeenCalled();
		});

		it('should handle network errors during OAuth flow', async () => {
			const authFlow = oauthManager.initiateFlow();
			const networkError = new TypeError('fetch failed');
			
			mockFetch.mockRejectedValueOnce(networkError);

			await expect(
				oauthManager.exchangeCodeForToken('code', authFlow.state)
			).rejects.toThrow('Token exchange failed');
		});

		it('should handle malformed token responses', async () => {
			const authFlow = oauthManager.initiateFlow();
			
			// Mock response without access_token
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue({ token_type: 'Bearer' }) // Missing access_token
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(
				oauthManager.exchangeCodeForToken('code', authFlow.state)
			).rejects.toThrow('No access token in response');
		});
	});

	describe('Security Validations', () => {
		it('should validate state parameter to prevent CSRF', async () => {
			oauthManager.initiateFlow();
			
			// Try to use different state
			await expect(
				oauthManager.exchangeCodeForToken('code', 'different-state')
			).rejects.toThrow('Invalid or expired state parameter');
		});

		it('should use PKCE for enhanced security', () => {
			const authFlow = oauthManager.initiateFlow();
			
			expect(authFlow.url).toContain('code_challenge=');
			expect(authFlow.url).toContain('code_challenge_method=S256');
			expect(authFlow.codeVerifier).toBeDefined();
		});

		it('should not expose client secret in config', () => {
			const config = oauthManager.getConfig();
			
			expect(config).not.toHaveProperty('clientSecret');
			expect(config).toHaveProperty('clientId');
			expect(config).toHaveProperty('authorizationUrl');
		});
	});

	describe('Token Lifecycle Management', () => {
		it('should handle token expiration gracefully', async () => {
			// Token is expired
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(false);

			const result = await oauthManager.getValidAccessToken();
			
			expect(result).toBeNull();
		});

		it('should proactively refresh tokens before expiration', async () => {
			// Token expires within 10 minutes
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			const mockRefreshResponse = MockFactories.createOAuthTokenResponse();
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockRefreshResponse)
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			const token = await oauthManager.getValidAccessToken();
			
			expect(token).toBe(mockRefreshResponse.access_token);
			expect(mockFetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
						'Accept': 'application/json'
					},
					body: expect.any(URLSearchParams)
				})
			);
		});
	});

	describe('Logout and Cleanup', () => {
		it('should clear all authentication data on logout', () => {
			oauthManager.logout();
			
			expect(mockTokenStore.clear).toHaveBeenCalled();
		});

		it('should handle logout errors gracefully', () => {
			mockTokenStore.clear.mockImplementationOnce(() => {
				throw new Error('Clear failed');
			});

			expect(() => oauthManager.logout()).not.toThrow();
		});
	});
});