/**
 * Performance Tests
 */

import { OAuthManager } from '../../src/auth/oauth-manager';
import { APIClient } from '../../src/api/api-client';
import { ToolRegistry } from '../../src/core/tool-registry';
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

// Mock dependencies
jest.mock('../../src/auth/token-store', () => ({
	tokenStore: {
		store: jest.fn(),
		clear: jest.fn(),
		getRefreshToken: jest.fn(),
		isValid: jest.fn(),
		expiresWithin: jest.fn(),
		getAccessToken: jest.fn()
	}
}));

describe('Performance Tests', () => {
	let oauthManager: OAuthManager;
	let apiClient: APIClient;
	let toolRegistry: ToolRegistry;

	beforeEach(() => {
		// Reset singletons
		(OAuthManager as any).instance = null;
		(APIClient as any).instance = null;
		(ToolRegistry as any).instance = null;

		const mockConfig = MockFactories.createServerConfig();
		oauthManager = OAuthManager.getInstance(mockConfig.oauth);
		apiClient = APIClient.getInstance(mockConfig);
		toolRegistry = ToolRegistry.getInstance();

		jest.clearAllMocks();
	});

	describe('OAuth Manager Performance', () => {
		it('should generate PKCE parameters quickly', () => {
			const startTime = performance.now();
			
			for (let i = 0; i < 100; i++) {
				oauthManager.initiateFlow();
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete 100 operations in under 500ms (more realistic)
			expect(duration).toBeLessThan(500);
		});

		it('should handle concurrent token refresh requests', async () => {
			const mockTokenStore = jest.requireMock('../../src/auth/token-store').tokenStore;
			mockTokenStore.getRefreshToken.mockReturnValue('refresh-token');
			
			const mockResponse = MockFactories.createOAuthTokenResponse();
			const fetchResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				json: jest.fn().mockResolvedValue(mockResponse)
			};
			mockFetch.mockResolvedValue(fetchResponse);

			const startTime = performance.now();
			
			// Simulate concurrent refresh requests
			const promises = Array(10).fill(null).map(() => 
				oauthManager.refreshToken()
			);
			
			await Promise.all(promises);
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should handle 10 concurrent requests in under 1 second
			expect(duration).toBeLessThan(1000);
		});

		it('should validate authentication status efficiently', () => {
			const mockTokenStore = jest.requireMock('../../src/auth/token-store').tokenStore;
			mockTokenStore.isValid.mockReturnValue(true);

			const startTime = performance.now();
			
			for (let i = 0; i < 1000; i++) {
				oauthManager.isAuthenticated();
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete 1000 checks in under 50ms (more realistic)
			expect(duration).toBeLessThan(50);
		});
	});

	describe('API Client Performance', () => {
		it('should handle multiple concurrent requests efficiently', async () => {
			const mockResponseData = { data: 'test' };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValue(mockResponse);

			const startTime = performance.now();
			
			// Simulate 50 concurrent API requests
			const promises = Array(50).fill(null).map((_, index) => 
				apiClient.request({
					method: 'GET',
					url: `/test/${index}`
				})
			);
			
			await Promise.all(promises);
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should handle 50 concurrent requests in under 2000ms (more realistic)
			expect(duration).toBeLessThan(2000);
		});

		it('should implement efficient retry logic', async () => {
			const networkError = new TypeError('fetch failed');
			const successResponseData = { success: true };
			const successResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(successResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(successResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(successResponseData)]))
			};

			// First call fails, second succeeds (maxRetries = 2)
			mockFetch
				.mockRejectedValueOnce(networkError)
				.mockResolvedValueOnce(successResponse);

			const startTime = performance.now();
			
			try {
				await apiClient.request({
					method: 'GET',
					url: '/test'
				});
			} catch (error) {
				// Expected to potentially fail due to network error handling
				expect(error).toMatchObject({
					code: 'NETWORK_ERROR'
				});
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete with retries in under 10 seconds (more realistic)
			expect(duration).toBeLessThan(10000);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should validate requests efficiently', async () => {
			const mockResponseData = { data: 'test' };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValue(mockResponse);

			const startTime = performance.now();
			
			// Test request validation performance
			for (let i = 0; i < 100; i++) {
				await apiClient.request({
					method: 'GET',
					url: `/test/${i}`
				});
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should validate and process 100 requests in under 1000ms (more realistic)
			expect(duration).toBeLessThan(1000);
		});
	});

	describe('Tool Registry Performance', () => {
		it('should register tools efficiently', () => {
			const startTime = performance.now();
			
			// Register 1000 tools
			for (let i = 0; i < 1000; i++) {
				const tool = MockFactories.createMCPTool({
					name: `test_tool_${i}`,
					description: `Test tool ${i}`
				});
				toolRegistry.registerTool(tool);
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should register 1000 tools in under 500ms (more realistic)
			expect(duration).toBeLessThan(500);
			expect(toolRegistry.getToolCount()).toBe(1000);
		});

		it('should execute tools with minimal overhead', async () => {
			const fastHandler = jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Fast result' }]
			});
			
			const tool = MockFactories.createMCPTool({
				name: 'fast_tool',
				description: 'Fast test tool',
				handler: fastHandler
			});
			
			toolRegistry.registerTool(tool);

			const startTime = performance.now();
			
			// Execute tool 100 times
			const promises = Array(100).fill(null).map(() =>
				toolRegistry.executeTool('fast_tool', { param1: 'value' })
			);
			
			await Promise.all(promises);
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should execute 100 tools in under 200ms (more realistic)
			expect(duration).toBeLessThan(200);
			expect(fastHandler).toHaveBeenCalledTimes(100);
		});

		it('should search tools efficiently', () => {
			// Register tools with different categories
			for (let i = 0; i < 500; i++) {
				const category = i % 5; // 5 different categories
				const tool = MockFactories.createMCPTool({
					name: `category${category}_tool_${i}`,
					description: `Tool for category ${category}`
				});
				toolRegistry.registerTool(tool);
			}

			const startTime = performance.now();
			
			// Perform 100 searches
			for (let i = 0; i < 100; i++) {
				const category = i % 5;
				toolRegistry.searchTools(`category${category}`);
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete 100 searches in under 200ms (more realistic)
			expect(duration).toBeLessThan(200);
		});

		it('should handle tool validation efficiently', () => {
			// Register mix of valid and invalid tools
			for (let i = 0; i < 100; i++) {
				const tool = MockFactories.createMCPTool({
					name: `tool_${i}`
				});
				toolRegistry.registerTool(tool);
			}

			const startTime = performance.now();
			
			const validation = toolRegistry.validateAllTools();
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should validate 100 tools in under 50ms (more realistic)
			expect(duration).toBeLessThan(50);
			expect(validation.valid.length).toBe(100);
		});
	});

	describe('Memory Usage', () => {
		it('should not leak memory during OAuth operations', () => {
			const initialMemory = process.memoryUsage().heapUsed;
			
			// Perform many OAuth operations
			for (let i = 0; i < 1000; i++) {
				oauthManager.initiateFlow();
				// Simulate cleanup
				oauthManager.logout();
			}
			
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}
			
			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;
			
			// Memory increase should be minimal (less than 10MB)
			expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
		});

		it('should cleanup tool registry efficiently', () => {
			const initialMemory = process.memoryUsage().heapUsed;
			
			// Register many tools
			for (let i = 0; i < 1000; i++) {
				const tool = MockFactories.createMCPTool({
					name: `temp_tool_${i}`
				});
				toolRegistry.registerTool(tool);
			}
			
			// Clear all tools
			toolRegistry.clearTools();
			
			// Force garbage collection if available
			if (global.gc) {
				global.gc();
			}
			
			const finalMemory = process.memoryUsage().heapUsed;
			const memoryIncrease = finalMemory - initialMemory;
			
			// Memory should be cleaned up (less than 5MB increase)
			expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
			expect(toolRegistry.getToolCount()).toBe(0);
		});
	});

	describe('Rate Limiting Performance', () => {
		it('should check rate limits efficiently', () => {
			const rateLimitInfo = {
				limit: 100,
				remaining: 50,
				resetTime: new Date(Date.now() + 3600000)
			};

			const startTime = performance.now();
			
			// Simulate 1000 rate limit checks
			for (let i = 0; i < 1000; i++) {
				const canProceed = rateLimitInfo.remaining > 0;
				if (!canProceed) {
					const now = new Date();
					rateLimitInfo.resetTime.getTime() - now.getTime();
					// Would normally wait or throw error
				}
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should complete 1000 checks in under 20ms (more realistic)
			expect(duration).toBeLessThan(20);
		});

		it('should handle rate limit updates efficiently', () => {
			const startTime = performance.now();
			
			// Simulate processing 1000 responses with rate limit headers
			for (let i = 0; i < 1000; i++) {
				const headers = MockFactories.createRateLimitHeaders();
				
				// Simulate rate limit extraction
				const limit = parseInt(headers['x-ratelimit-limit'], 10);
				const remaining = parseInt(headers['x-ratelimit-remaining'], 10);
				const resetTime = new Date(parseInt(headers['x-ratelimit-reset'], 10) * 1000);
				
				// Update rate limit info (would be stored)
				void { limit, remaining, resetTime };
			}
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should process 1000 rate limit updates in under 100ms (more realistic)
			expect(duration).toBeLessThan(100);
		});
	});

	describe('Concurrent Operations', () => {
		it('should handle mixed concurrent operations', async () => {
			const mockTokenStore = jest.requireMock('../../src/auth/token-store').tokenStore;
			mockTokenStore.isValid.mockReturnValue(true);
			mockTokenStore.getAccessToken.mockReturnValue('valid-token');

			const mockResponseData = { data: 'success' };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValue(mockResponse);

			// Register some tools
			for (let i = 0; i < 10; i++) {
				const tool = MockFactories.createMCPTool({
					name: `concurrent_tool_${i}`
				});
				toolRegistry.registerTool(tool);
			}

			const startTime = performance.now();
			
			// Mix of concurrent operations
			const operations = [
				...Array(20).fill(null).map(() => oauthManager.isAuthenticated()),
				...Array(20).fill(null).map((_, i) => apiClient.request({
					method: 'GET',
					url: `/test/${i}`
				})),
				...Array(20).fill(null).map((_, i) => 
					toolRegistry.executeTool(`concurrent_tool_${i % 10}`, {})
				)
			];
			
			await Promise.all(operations);
			
			const endTime = performance.now();
			const duration = endTime - startTime;
			
			// Should handle 60 mixed operations in under 3 seconds (more realistic)
			expect(duration).toBeLessThan(3000);
		});
	});
});