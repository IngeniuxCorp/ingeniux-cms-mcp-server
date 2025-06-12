// Mocks must be hoisted before any imports or code
export {};
declare global {
	var __mockTokenStore: any;
}
jest.mock('../../src/auth/token-store', () => ({
	get tokenStore() {
		return global.__mockTokenStore;
	},
	TokenStore: {
		getInstance: jest.fn(() => global.__mockTokenStore)
	}
}));
jest.mock('crypto', () => ({
	randomBytes: jest.fn().mockReturnValue({
		toString: jest.fn().mockReturnValue('mock-random-bytes')
	}),
	createHash: jest.fn().mockReturnValue({
		update: jest.fn().mockReturnThis(),
		digest: jest.fn().mockReturnValue('mock-hash')
	}),
	createCipheriv: jest.fn(),
	createDecipheriv: jest.fn()
}));
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		}),
		validateRequest: jest.fn()
	}
}));
jest.mock('../../src/utils/validators', () => ({
	Validators: {
		sanitizeString: jest.fn(str => str),
		isValidFilePath: jest.fn().mockReturnValue(true),
		validatePagination: jest.fn().mockReturnValue({ page: 1, limit: 20 }),
		isValidDate: jest.fn().mockReturnValue(true)
	}
}));
// AuthTools removed - no longer needed

/**
 * OAuth Tool Integration Tests - End-to-end OAuth flow with tool execution
 */
 
let OAuthManager: any;
let AuthMiddleware: any;
let ContentTools: any;
let APIClient: any;
let MockFactories: any;

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
let mockTokenStore: any;
global.__mockTokenStore = mockTokenStore;

jest.mock('../../src/auth/token-store', () => ({
	get tokenStore() {
		return mockTokenStore;
	},
	TokenStore: {
		getInstance: jest.fn(() => mockTokenStore)
	}
}));

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

// Mock error handler
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		}),
		validateRequest: jest.fn()
	}
}));

// Mock validators
jest.mock('../../src/utils/validators', () => ({
	Validators: {
		sanitizeString: jest.fn(str => str),
		isValidFilePath: jest.fn().mockReturnValue(true),
		validatePagination: jest.fn().mockReturnValue({ page: 1, limit: 20 }),
		isValidDate: jest.fn().mockReturnValue(true)
	}
}));

// AuthTools removed - no longer needed

describe('OAuth Tool Integration', () => {
	let oauthManager: any;
	let authMiddleware: any;
	let contentTools: any;
	let apiClient: any;
	let mockConfig: any;

	beforeEach(() => {
		jest.resetModules();

		OAuthManager = require('../../src/auth/oauth-manager').OAuthManager;
		AuthMiddleware = require('../../src/auth/auth-middleware').AuthMiddleware;
		ContentTools = require('../../src/tools/content-tools').ContentTools;
		APIClient = require('../../src/api/api-client').APIClient;
		MockFactories = require('../mocks/mock-factories').MockFactories;

		mockConfig = MockFactories.createServerConfig();

		// Reset singletons
		(OAuthManager as any).instance = null;
		(AuthMiddleware as any).instance = null;
		(APIClient as any).instance = null;

		// Re-initialize mockTokenStore for each test
		mockTokenStore = {
			store: jest.fn(),
			clear: jest.fn(),
			getRefreshToken: jest.fn(),
			isValid: jest.fn(),
			expiresWithin: jest.fn(),
			getAccessToken: jest.fn(),
			getExpirationTime: jest.fn()
		};
		global.__mockTokenStore = mockTokenStore;

		oauthManager = OAuthManager.getInstance(mockConfig.oauth);
		authMiddleware = AuthMiddleware.getInstance();
		authMiddleware.initialize(oauthManager);
		apiClient = APIClient.getInstance(mockConfig);
		contentTools = new ContentTools(apiClient);

		jest.clearAllMocks();
	});

	describe('complete OAuth flow with tool execution', () => {
		it('should complete full OAuth flow and execute CMS tool', async () => {
			// Step 1: Initiate OAuth flow
			const authFlow = oauthManager.getAuthorizationCode();
			expect(authFlow.url).toContain('response_type=code');
			expect(authFlow.state).toBeDefined();
			expect(authFlow.codeVerifier).toBeDefined();

			// Step 2: Mock OAuth server token response
			const mockTokenResponse = MockFactories.createOAuthTokenResponse();
			const mockOAuthResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockTokenResponse)
			};
			mockFetch.mockResolvedValueOnce(mockOAuthResponse);

			// Step 3: Exchange code for tokens
			const tokenData = await oauthManager.getAccessToken('auth-code', authFlow.state);
			expect(mockTokenStore.store).toHaveBeenCalledWith(tokenData);

			// Step 4: Setup token store for authenticated requests
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue(mockTokenResponse.access_token);

			// Step 5: Mock CMS API response
			const mockCMSResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({ id: '123', title: 'Test Page' })
			};
			mockFetch.mockResolvedValueOnce(mockCMSResponse);

			// Step 6: Execute CMS tool
			const tools = contentTools.getTools();
			const getPageTool = tools.find((tool: any) => tool.name === 'cms_get_page')!;
			const result = await getPageTool.handler({ pageId: '123' });

			// Verify OAuth flow completed and tool executed
			expect(result.content[0].text).toContain('Test Page');
			expect(mockFetch).toHaveBeenCalledTimes(2); // OAuth + CMS API calls
		});

		it('should handle token refresh during tool execution', async () => {
			// Setup: Token exists but expires soon
			mockTokenStore.isValid.mockReturnValueOnce(false); // First check: invalid
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			// Mock refresh token response
			const mockRefreshResponse = MockFactories.createOAuthTokenResponse({
				access_token: 'new-access-token'
			});
			const mockOAuthResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockRefreshResponse)
			};
			mockFetch.mockResolvedValueOnce(mockOAuthResponse);

			// After refresh, token should be valid
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('new-access-token');

			// Mock CMS API response
			const mockCMSResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({ pages: [] })
			};
			mockFetch.mockResolvedValueOnce(mockCMSResponse);

			// Execute tool that triggers refresh
			const tools = contentTools.getTools();
			const listPagesTool = tools.find((tool: any) => tool.name === 'cms_list_pages')!;
			const result = await listPagesTool.handler({});

			// Verify refresh happened and tool executed
			expect(mockFetch).toHaveBeenCalledTimes(2); // Refresh + CMS API
			expect(result.content[0].text).toContain('pages');
		});

		it('should block tool execution when not authenticated', async () => {
			// Setup: No valid token
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.getRefreshToken.mockReturnValue(null);

			// Execute tool without authentication
			const tools = contentTools.getTools();
			const createPageTool = tools.find((tool: any) => tool.name === 'cms_create_page')!;
			const result = await createPageTool.handler({
				title: 'Test Page',
				path: '/test'
			});

			// Should return auth challenge, not execute API call
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
			expect(responseText.requiresAuth).toBe(true);
			expect(responseText.authCode).toBeDefined();
			
			// No CMS API call should be made
			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	describe('tool authentication requirements', () => {
		it('should require authentication for all 7 CMS tools', async () => {
			// Setup: Not authenticated
			mockTokenStore.isValid.mockReturnValue(false);

			const tools = contentTools.getTools();
			const cmsTools = [
				'cms_get_page',
				'cms_create_page',
				'cms_update_page',
				'cms_delete_page',
				'cms_list_pages',
				'cms_publish_page',
				'cms_search_content'
			];

			// Test each CMS tool requires authentication
			for (const toolName of cmsTools) {
				const tool = tools.find((t: any) => t.name === toolName)!;
				const result = await tool.handler({});
				
				const responseText = JSON.parse(result.content[0].text!);
				expect(responseText.error).toBe('Authentication required');
				expect(responseText.requiresAuth).toBe(true);
			}
		});
	});

	describe('OAuth flow error scenarios', () => {
		it('should handle OAuth server errors during tool execution', async () => {
			// Setup: Token needs refresh
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			// Mock OAuth server error
			const mockOAuthError = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				json: jest.fn().mockResolvedValue({
					error: 'invalid_grant',
					error_description: 'Refresh token expired'
				})
			};
			mockFetch.mockResolvedValueOnce(mockOAuthError);

			// Execute tool that triggers failed refresh
			const tools = contentTools.getTools();
			const getPageTool = tools.find((tool: any) => tool.name === 'cms_get_page')!;
			const result = await getPageTool.handler({ pageId: '123' });

			// Should return auth challenge due to refresh failure
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
			expect(responseText.requiresAuth).toBe(true);
		});

		it('should handle network errors during OAuth flow', async () => {
			// Setup: Token needs refresh
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			// Mock network error
			mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

			// Execute tool that triggers failed refresh
			const tools = contentTools.getTools();
			const updatePageTool = tools.find((tool: any) => tool.name === 'cms_update_page')!;
			const result = await updatePageTool.handler({ pageId: '123', title: 'Updated' });

			// Should return auth challenge due to network failure
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
			expect(responseText.requiresAuth).toBe(true);
		});
	});

	describe('20-minute token expiry integration', () => {
		it('should enforce 20-minute token expiry during tool execution', async () => {
			// Setup: Valid token initially
			mockTokenStore.isValid.mockReturnValueOnce(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-token');

			// Mock successful first API call
			const mockResponse1 = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({ id: '123', title: 'Page 1' })
			};
			mockFetch.mockResolvedValueOnce(mockResponse1);

			// Execute first tool call
			const tools = contentTools.getTools();
			const getPageTool = tools.find((tool: any) => tool.name === 'cms_get_page')!;
			let result = await getPageTool.handler({ pageId: '123' });
			expect(result.content[0].text).toContain('Page 1');

			// Simulate 20-minute expiry
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(false); // Fully expired

			// Execute second tool call after expiry
			result = await getPageTool.handler({ pageId: '456' });

			// Should require new authentication
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
			expect(responseText.requiresAuth).toBe(true);
		});

		it('should proactively refresh tokens before 20-minute expiry', async () => {
			// Setup: Token expires within 10 minutes
			mockTokenStore.isValid.mockReturnValue(false);
			mockTokenStore.expiresWithin.mockReturnValue(true);
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');

			// Mock successful refresh
			const mockRefreshResponse = MockFactories.createOAuthTokenResponse({
				access_token: 'refreshed-token'
			});
			const mockOAuthResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockRefreshResponse)
			};
			mockFetch.mockResolvedValueOnce(mockOAuthResponse);

			// After refresh, token is valid
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('refreshed-token');

			// Mock CMS API call
			const mockCMSResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({ success: true })
			};
			mockFetch.mockResolvedValueOnce(mockCMSResponse);

			// Execute tool that triggers proactive refresh
			const tools = contentTools.getTools();
			const publishPageTool = tools.find((tool: any) => tool.name === 'cms_publish_page')!;
			const result = await publishPageTool.handler({ pageId: '123' });

			// Should succeed with refreshed token
			expect(result.content[0].text).toContain('Page published successfully');
			expect(mockFetch).toHaveBeenCalledTimes(2); // Refresh + CMS API
		});
	});

	describe('concurrent tool execution with OAuth', () => {
		it('should handle multiple concurrent tool executions', async () => {
			// Setup: Valid authentication
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('concurrent-token');

			// Mock multiple successful API responses
			const mockResponses = [
				{ id: '1', title: 'Page 1' },
				{ id: '2', title: 'Page 2' },
				{ id: '3', title: 'Page 3' }
			];

			mockResponses.forEach(data => {
				mockFetch.mockResolvedValueOnce({
					ok: true,
					status: 200,
					statusText: 'OK',
					headers: new Headers({ 'content-type': 'application/json' }),
					json: jest.fn().mockResolvedValue(data)
				});
			});

			// Execute multiple tools concurrently
			const tools = contentTools.getTools();
			const getPageTool = tools.find((tool: any) => tool.name === 'cms_get_page')!;

			const promises = [
				getPageTool.handler({ pageId: '1' }),
				getPageTool.handler({ pageId: '2' }),
				getPageTool.handler({ pageId: '3' })
			];

			const results = await Promise.all(promises);

			// All should succeed
			expect(results).toHaveLength(3);
			results.forEach((result, index) => {
				expect(result.content[0].text).toContain(`Page ${index + 1}`);
			});
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});
	});

	describe('tool error handling with authentication', () => {
		it('should handle CMS API errors after successful authentication', async () => {
			// Setup: Valid authentication
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-token');

			// Mock CMS API error
			const mockErrorResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ error: 'Page not found' })
			};
			mockFetch.mockResolvedValueOnce(mockErrorResponse);

			// Execute tool that encounters API error
			const tools = contentTools.getTools();
			const getPageTool = tools.find((tool: any) => tool.name === 'cms_get_page')!;
			const result = await getPageTool.handler({ pageId: 'nonexistent' });

			// Should return error result, not auth challenge
			expect(result.content[0].text).toBe('Error occurred');
		});

		it('should distinguish between auth errors and other API errors', async () => {
			// Setup: Valid authentication initially
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-token');

			// Mock 401 response (auth error)
			const mockAuthErrorResponse = {
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ error: 'Token expired' })
			};
			mockFetch.mockResolvedValueOnce(mockAuthErrorResponse);

			// Execute tool that encounters auth error
			const tools = contentTools.getTools();
			const deletePageTool = tools.find((tool: any) => tool.name === 'cms_delete_page')!;
			const result = await deletePageTool.handler({ pageId: '123' });

			// Should return auth challenge for 401 errors
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
		});
	});
});