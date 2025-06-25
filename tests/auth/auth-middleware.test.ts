/**
 * Auth Middleware Tests - Automatic token validation, missing token handling
 */

import { AuthMiddleware } from '../../src/auth/auth-middleware';
import { MCPRequest } from '../../src/types/mcp-types';

// Mock token store
jest.mock('../../src/auth/token-store', () => ({
	tokenStore: {
		isValid: jest.fn(),
		getAccessToken: jest.fn(),
		getRefreshToken: jest.fn(),
		expiresWithin: jest.fn(),
		getExpirationTime: jest.fn(),
		clear: jest.fn()
	}
}));

// Get reference to the mocked token store
const mockTokenStore = require('../../src/auth/token-store').tokenStore;

// Mock OAuth Manager
const mockOAuthManager = {
	isAuthenticated: jest.fn(),
	getBearerToken: jest.fn(),
	getValidAccessToken: jest.fn(),
	refreshToken: jest.fn(),
	getAuthorizationCode: jest.fn(),
	initiateFlow: jest.fn(),
	exchangeCodeForToken: jest.fn(),
	logout: jest.fn(),
	getConfig: jest.fn()
};

// Mock error handler
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		handleError: jest.fn()
	}
}));

describe('AuthMiddleware', () => {
	let authMiddleware: AuthMiddleware;
	let mockRequest: MCPRequest;

	beforeEach(() => {
		// Reset singleton
		(AuthMiddleware as any).instance = null;
		authMiddleware = AuthMiddleware.getInstance();
		
		// Initialize with mock OAuth manager
		authMiddleware.initialize(mockOAuthManager as any);

		mockRequest = {
			method: 'GET',
			params: { endpoint: '/api/test' }
		};

		jest.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = AuthMiddleware.getInstance();
			const instance2 = AuthMiddleware.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('initialize', () => {
		it('should initialize with OAuth manager', () => {
			const newMiddleware = AuthMiddleware.getInstance();
			newMiddleware.initialize(mockOAuthManager as any);
			
			// Should not throw when using authenticated methods
			expect(() => newMiddleware.isAuthenticatedSync()).not.toThrow();
		});
	});

	describe('authenticate', () => {
		it('should authenticate request with valid token', async () => {
			mockOAuthManager.getBearerToken.mockResolvedValue({
				accessToken: 'valid-access-token',
				refreshToken: 'refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				tokenType: 'Bearer'
			});

			const result = await authMiddleware.authenticate(mockRequest);

			expect(result).toEqual({
				...mockRequest,
				headers: {
					'Authorization': 'Bearer valid-access-token',
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
		});

		it('should throw error when OAuth manager not initialized', async () => {
			const uninitializedMiddleware = AuthMiddleware.getInstance();
			(uninitializedMiddleware as any).oauthManager = null;

			await expect(uninitializedMiddleware.authenticate(mockRequest))
				.rejects.toThrow('OAuth manager not initialized');
		});

		it('should throw error when no valid token available', async () => {
			mockOAuthManager.getBearerToken.mockRejectedValue(new Error('Authentication failed'));

			await expect(authMiddleware.authenticate(mockRequest))
				.rejects.toThrow('Authentication failed');
		});

		it('should handle authentication errors gracefully', async () => {
			mockOAuthManager.getBearerToken.mockRejectedValue(new Error('Token error'));

			await expect(authMiddleware.authenticate(mockRequest))
				.rejects.toThrow('Authentication failed');
		});
	});

	describe('isAuthenticated', () => {
		it('should return false (always uses new token)', async () => {
			const result = await authMiddleware.isAuthenticated();
			expect(result).toBe(false);
		});

		it('should return false when OAuth manager not initialized', async () => {
			(authMiddleware as any).oauthManager = null;

			const result = await authMiddleware.isAuthenticated();

			expect(result).toBe(false);
		});
	});

	describe('isAuthenticatedSync', () => {
		it('should return true when authenticated', () => {
			mockOAuthManager.isAuthenticated.mockReturnValue(true);

			const result = authMiddleware.isAuthenticatedSync();

			expect(result).toBe(true);
		});

		it('should return false when not authenticated', () => {
			mockOAuthManager.isAuthenticated.mockReturnValue(false);

			const result = authMiddleware.isAuthenticatedSync();

			expect(result).toBe(false);
		});

		it('should return false when OAuth manager not initialized', () => {
			(authMiddleware as any).oauthManager = null;

			const result = authMiddleware.isAuthenticatedSync();

			expect(result).toBe(false);
		});
	});

	describe('validateAuthentication (private method behavior)', () => {
		it('should return valid result with token when authenticated', async () => {
			mockOAuthManager.getValidAccessToken.mockResolvedValue('valid-token');

			const result = await authMiddleware.authenticate(mockRequest);

			expect(result.headers['Authorization']).toBe('Bearer valid-token');
		});

		it('should attempt refresh when token missing', async () => {
			mockOAuthManager.getValidAccessToken
				.mockResolvedValueOnce(null) // First call returns null
				.mockResolvedValueOnce('refreshed-token'); // After refresh
			
			mockOAuthManager.refreshToken.mockResolvedValue({
				accessToken: 'refreshed-token',
				refreshToken: 'new-refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				tokenType: 'Bearer'
			});

			const result = await authMiddleware.authenticate(mockRequest);

			expect(mockOAuthManager.refreshToken).toHaveBeenCalled();
			expect(result.headers['Authorization']).toBe('Bearer refreshed-token');
		});

		it('should initiate OAuth flow when refresh fails', async () => {
			mockOAuthManager.getValidAccessToken.mockResolvedValue(null);
			mockOAuthManager.refreshToken.mockRejectedValue(new Error('Refresh failed'));
			mockOAuthManager.getAuthorizationCode.mockReturnValue({
				url: 'https://auth.example.com/oauth',
				state: 'test-state',
				codeVerifier: 'test-verifier'
			});

			await expect(authMiddleware.authenticate(mockRequest))
				.rejects.toThrow('OAUTH_FLOW_REQUIRED');
		});
	});

	describe('handleMissingToken (private method behavior)', () => {
		it('should try refresh first when token missing', async () => {
			mockOAuthManager.getBearerToken.mockResolvedValue({
				accessToken: 'refreshed-token',
				refreshToken: 'new-refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				tokenType: 'Bearer'
			});

			await authMiddleware.authenticate(mockRequest);

			expect(mockOAuthManager.getBearerToken).toHaveBeenCalled();
		});

		it('should initiate OAuth flow when refresh unavailable', async () => {
			mockOAuthManager.getBearerToken.mockRejectedValue(new Error('No refresh token'));

			await expect(authMiddleware.authenticate(mockRequest))
				.rejects.toThrow('Authentication failed: No refresh token');
		});
	});

	describe('getAuthStatus', () => {
		it('should return authenticated status with expiry', () => {
			mockOAuthManager.isAuthenticated.mockReturnValue(true);
			mockTokenStore.getExpirationTime.mockReturnValue(new Date(Date.now() + 1200000));

			const result = authMiddleware.getAuthStatus();

			expect(result.isAuthenticated).toBe(true);
			expect(result.tokenExpiry).toBeDefined();
		});

		it('should return not authenticated when no token', () => {
			mockOAuthManager.isAuthenticated.mockReturnValue(false);

			const result = authMiddleware.getAuthStatus();

			expect(result.isAuthenticated).toBe(false);
			expect(result.tokenExpiry).toBeUndefined();
		});

		it('should handle errors gracefully', () => {
			(authMiddleware as any).oauthManager = null;

			const result = authMiddleware.getAuthStatus();

			expect(result.isAuthenticated).toBe(false);
		});
	});

	describe('refreshIfNeeded', () => {
		it('should refresh when token expires within 10 minutes', async () => {
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockOAuthManager.refreshToken.mockResolvedValue({
				accessToken: 'new-token',
				refreshToken: 'new-refresh',
				expiresAt: new Date(Date.now() + 3600000),
				tokenType: 'Bearer'
			});

			const result = await authMiddleware.refreshIfNeeded();

			expect(result).toBe(true);
			expect(mockOAuthManager.refreshToken).toHaveBeenCalled();
		});

		it('should not refresh when token is still valid', async () => {
			mockTokenStore.expiresWithin.mockReturnValue(false);

			const result = await authMiddleware.refreshIfNeeded();

			expect(result).toBe(true);
			expect(mockOAuthManager.refreshToken).not.toHaveBeenCalled();
		});

		it('should return false when refresh fails', async () => {
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockOAuthManager.refreshToken.mockRejectedValue(new Error('Refresh failed'));

			const result = await authMiddleware.refreshIfNeeded();

			expect(result).toBe(false);
		});

		it('should return false when OAuth manager not initialized', async () => {
			(authMiddleware as any).oauthManager = null;

			const result = await authMiddleware.refreshIfNeeded();

			expect(result).toBe(false);
		});
	});

	describe('validateAuthHeaders', () => {
		it('should validate correct Bearer token format', () => {
			const headers = {
				'Authorization': 'Bearer valid-token-123'
			};

			const result = authMiddleware.validateAuthHeaders(headers);

			expect(result).toBe(true);
		});

		it('should reject invalid header format', () => {
			const headers = {
				'Authorization': 'Invalid token-123'
			};

			const result = authMiddleware.validateAuthHeaders(headers);

			expect(result).toBe(false);
		});

		it('should reject missing authorization header', () => {
			const headers = {};

			const result = authMiddleware.validateAuthHeaders(headers);

			expect(result).toBe(false);
		});

		it('should handle case-insensitive header names', () => {
			const headers = {
				'authorization': 'Bearer valid-token-123'
			};

			const result = authMiddleware.validateAuthHeaders(headers);

			expect(result).toBe(true);
		});
	});

	describe('extractToken', () => {
		it('should extract token from Bearer header', () => {
			const authHeader = 'Bearer test-token-123';

			const result = authMiddleware.extractToken(authHeader);

			expect(result).toBe('test-token-123');
		});

		it('should return null for invalid format', () => {
			const authHeader = 'Invalid test-token-123';

			const result = authMiddleware.extractToken(authHeader);

			expect(result).toBeNull();
		});

		it('should return null for empty header', () => {
			const result = authMiddleware.extractToken('');

			expect(result).toBeNull();
		});
	});

	describe('getAuthCode', () => {
		it('should return auth code string from OAuth flow', async () => {
			mockOAuthManager.initiateFlow.mockResolvedValue('auth_code_12345');

			const result = await authMiddleware.getAuthCode();

			expect(typeof result).toBe('string');
			expect(result).toBe('auth_code_12345');
			expect(mockOAuthManager.initiateFlow).toHaveBeenCalled();
		});

		it('should handle OAuth manager not initialized', async () => {
			(authMiddleware as any).oauthManager = null;

			await expect(authMiddleware.getAuthCode()).rejects.toThrow('OAuth manager not initialized');
		});

		it('should handle errors during auth code generation', async () => {
			mockOAuthManager.initiateFlow.mockRejectedValue(new Error('Flow initiation failed'));

			await expect(authMiddleware.getAuthCode()).rejects.toThrow('Failed to get auth code: Flow initiation failed');
		});
	});

	describe('processCallback', () => {
		it('should process OAuth callback successfully', async () => {
			mockOAuthManager.exchangeCodeForToken.mockResolvedValue({
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiresAt: new Date(Date.now() + 3600000),
				tokenType: 'Bearer'
			});

			const result = await authMiddleware.processCallback('auth-code', 'test-state');

			expect(result).toBe(true);
			expect(mockOAuthManager.exchangeCodeForToken).toHaveBeenCalledWith('auth-code', 'test-state');
		});

		it('should return false for missing parameters', async () => {
			const result = await authMiddleware.processCallback('', 'test-state');

			expect(result).toBe(false);
		});

		it('should handle exchange errors', async () => {
			mockOAuthManager.exchangeCodeForToken.mockRejectedValue(new Error('Exchange failed'));

			const result = await authMiddleware.processCallback('auth-code', 'test-state');

			expect(result).toBe(false);
		});
	});

	describe('logout', () => {
		it('should logout successfully', () => {
			authMiddleware.logout();

			expect(mockOAuthManager.logout).toHaveBeenCalled();
		});

		it('should handle logout errors gracefully', () => {
			mockOAuthManager.logout.mockImplementation(() => {
				throw new Error('Logout failed');
			});

			expect(() => authMiddleware.logout()).not.toThrow();
		});
	});

	describe('getOAuthConfig', () => {
		it('should return OAuth config without secrets', () => {
			const mockConfig = {
				clientId: 'test-client-id',
				authorizationUrl: 'https://auth.example.com',
				tokenUrl: 'https://auth.example.com/token',
				redirectUri: 'https://app.example.com/callback',
				scopes: ['read', 'write']
			};
			mockOAuthManager.getConfig.mockReturnValue(mockConfig);

			const result = authMiddleware.getOAuthConfig();

			expect(result).toEqual(mockConfig);
			expect(mockOAuthManager.getConfig).toHaveBeenCalled();
		});

		it('should return null when OAuth manager not initialized', () => {
			(authMiddleware as any).oauthManager = null;

			const result = authMiddleware.getOAuthConfig();

			expect(result).toBeNull();
		});
	});

	describe('handleAuthError', () => {
		it('should handle authentication errors and clear tokens', () => {
			const error = new Error('Auth failed');

			authMiddleware.handleAuthError(error);

			expect(mockOAuthManager.logout).toHaveBeenCalled();
		});

		it('should handle errors gracefully', () => {
			const error = new Error('Auth failed');
			mockOAuthManager.logout.mockImplementation(() => {
				throw new Error('Logout failed');
			});

			expect(() => authMiddleware.handleAuthError(error)).not.toThrow();
		});
	});

	describe('validateAuthHeader', () => {
		it('should validate proper Bearer token format', () => {
			const validHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

			const result = authMiddleware.validateAuthHeader(validHeader);

			expect(result).toBe(true);
		});

		it('should reject tokens that are too short', () => {
			const shortHeader = 'Bearer abc';

			const result = authMiddleware.validateAuthHeader(shortHeader);

			expect(result).toBe(false);
		});

		it('should reject tokens that are too long', () => {
			const longToken = 'a'.repeat(2049);
			const longHeader = `Bearer ${longToken}`;

			const result = authMiddleware.validateAuthHeader(longHeader);

			expect(result).toBe(false);
		});

		it('should handle validation errors gracefully', () => {
			const result = authMiddleware.validateAuthHeader(null as any);

			expect(result).toBe(false);
		});
	});
});