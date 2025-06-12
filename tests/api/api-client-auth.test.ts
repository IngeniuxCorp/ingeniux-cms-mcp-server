/**
 * API Client Tests - Authorization header injection
 */

import { APIClient } from '../../src/api/api-client';
import { authMiddleware } from '../../src/auth/auth-middleware';
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

// Mock auth middleware
jest.mock('../../src/auth/auth-middleware', () => ({
	authMiddleware: {
		isAuthenticated: jest.fn(),
		authenticate: jest.fn()
	}
}));

describe('APIClient - Authorization Header Injection', () => {
	let apiClient: APIClient;
	let mockConfig: any;
	const mockAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;

	beforeEach(() => {
		mockConfig = MockFactories.createServerConfig();
		
		// Reset singleton
		(APIClient as any).instance = null;
		apiClient = APIClient.getInstance(mockConfig);

		jest.clearAllMocks();
	});

	describe('automatic auth header injection', () => {
		it('should add Authorization Bearer header to authenticated requests', async () => {
			// Setup authentication
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: { endpoint: '/api/test' },
				headers: {
					'Authorization': 'Bearer test-access-token',
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});

			// Setup successful API response
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({ data: 'success' })
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Make API request
			const result = await apiClient.get('/api/test');

			// Verify fetch was called with Authorization header
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('/api/test'),
				expect.objectContaining({
					headers: expect.objectContaining({
						'Authorization': 'Bearer test-access-token',
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'User-Agent': 'Ingeniux-CMS-MCP-Server/1.0.0'
					})
				})
			);

			expect(result.data).toEqual({ data: 'success' });
		});

		it('should format Authorization header correctly', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'POST',
				params: {},
				headers: {
					'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.post('/api/create', { title: 'Test' });

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers;
			
			expect(headers['Authorization']).toBe('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token');
			expect(headers['Authorization']).toMatch(/^Bearer\s+[A-Za-z0-9._-]+$/);
		});

		it('should merge auth headers with existing request headers', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer test-token',
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Make request with custom headers
			await apiClient.get('/api/test', {}, {
				'X-Custom-Header': 'custom-value',
				'X-Request-ID': '12345'
			});

			const fetchCall = mockFetch.mock.calls[0];
			const headers = fetchCall[1].headers;
			
			// Should have both auth and custom headers
			expect(headers['Authorization']).toBe('Bearer test-token');
			expect(headers['X-Custom-Header']).toBe('custom-value');
			expect(headers['X-Request-ID']).toBe('12345');
		});

		it('should handle all HTTP methods with auth headers', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer test-token',
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValue(mockResponse);

			// Test all HTTP methods
			await apiClient.get('/api/test');
			await apiClient.post('/api/test', { data: 'test' });
			await apiClient.put('/api/test', { data: 'test' });
			await apiClient.patch('/api/test', { data: 'test' });
			await apiClient.delete('/api/test');

			// All calls should have Authorization header
			expect(mockFetch).toHaveBeenCalledTimes(5);
			mockFetch.mock.calls.forEach(call => {
				expect(call[1].headers['Authorization']).toBe('Bearer test-token');
			});
		});
	});

	describe('authentication failures', () => {
		it('should throw error when not authenticated', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(false);
			mockAuthMiddleware.authenticate.mockRejectedValue(new Error('Authentication required'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it('should throw AuthenticationError for auth failures', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(false);
			mockAuthMiddleware.authenticate.mockRejectedValue(new Error('Token expired'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});

		it('should handle auth middleware errors', async () => {
			mockAuthMiddleware.isAuthenticated.mockRejectedValue(new Error('Auth middleware error'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Failed to add auth headers');
		});
	});

	describe('HTTP 401/403 error handling', () => {
		it('should detect 401 Unauthorized as auth error', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: { 'Authorization': 'Bearer expired-token' }
			});

			const mockResponse = {
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ error: 'Token expired' })
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});

		it('should detect 403 Forbidden as auth error', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: { 'Authorization': 'Bearer insufficient-scope-token' }
			});

			const mockResponse = {
				ok: false,
				status: 403,
				statusText: 'Forbidden',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ error: 'Insufficient permissions' })
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});

		it('should not treat other HTTP errors as auth errors', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: { 'Authorization': 'Bearer valid-token' }
			});

			const mockResponse = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ error: 'Resource not found' })
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await expect(apiClient.get('/api/test')).rejects.toThrow('HTTP 404: Not Found');
		});
	});

	describe('auth error message detection', () => {
		it('should detect authentication error messages', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockRejectedValue(new Error('invalid token'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});

		it('should detect token expired messages', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockRejectedValue(new Error('token expired'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});

		it('should detect unauthorized messages', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockRejectedValue(new Error('unauthorized access'));

			await expect(apiClient.get('/api/test')).rejects.toThrow('Authentication required');
		});
	});

	describe('request validation with auth', () => {
		it('should validate request before adding auth headers', async () => {
			const invalidRequest = {
				method: '', // Invalid method
				url: '/api/test'
			};

			await expect(apiClient.request(invalidRequest as any)).rejects.toThrow('Request method is required');
			expect(mockAuthMiddleware.isAuthenticated).not.toHaveBeenCalled();
		});

		it('should validate URL before adding auth headers', async () => {
			const invalidRequest = {
				method: 'GET',
				url: '' // Invalid URL
			};

			await expect(apiClient.request(invalidRequest as any)).rejects.toThrow('Request URL is required');
			expect(mockAuthMiddleware.isAuthenticated).not.toHaveBeenCalled();
		});
	});

	describe('auth header format validation', () => {
		it('should accept valid Bearer token format', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.get('/api/test');

			const fetchCall = mockFetch.mock.calls[0];
			const authHeader = fetchCall[1].headers['Authorization'];
			
			expect(authHeader).toMatch(/^Bearer\s+[A-Za-z0-9._-]+$/);
		});

		it('should handle short tokens', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer abc123'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.get('/api/test');

			const fetchCall = mockFetch.mock.calls[0];
			expect(fetchCall[1].headers['Authorization']).toBe('Bearer abc123');
		});
	});

	describe('concurrent requests with auth', () => {
		it('should handle multiple concurrent authenticated requests', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer concurrent-token'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({ data: 'success' })
			};
			mockFetch.mockResolvedValue(mockResponse);

			// Make multiple concurrent requests
			const requests = [
				apiClient.get('/api/test1'),
				apiClient.get('/api/test2'),
				apiClient.get('/api/test3')
			];

			const results = await Promise.all(requests);

			// All requests should succeed with auth headers
			expect(results).toHaveLength(3);
			expect(mockFetch).toHaveBeenCalledTimes(3);
			
			mockFetch.mock.calls.forEach(call => {
				expect(call[1].headers['Authorization']).toBe('Bearer concurrent-token');
			});
		});
	});

	describe('auth header override protection', () => {
		it('should not allow manual Authorization header override', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAuthMiddleware.authenticate.mockResolvedValue({
				method: 'GET',
				params: {},
				headers: {
					'Authorization': 'Bearer auth-middleware-token'
				}
			});

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({})
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			// Try to override with manual auth header
			await apiClient.get('/api/test', {}, {
				'Authorization': 'Bearer manual-token'
			});

			const fetchCall = mockFetch.mock.calls[0];
			// Should use auth middleware token, not manual token
			expect(fetchCall[1].headers['Authorization']).toBe('Bearer auth-middleware-token');
		});
	});
});