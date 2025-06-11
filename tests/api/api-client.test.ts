/**
 * API Client Tests
 */

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

describe('APIClient', () => {
	let apiClient: APIClient;
	let mockConfig: any;

	beforeEach(() => {
		mockConfig = MockFactories.createServerConfig();
		
		// Reset singleton for each test
		(APIClient as any).instance = null;
		apiClient = APIClient.getInstance(mockConfig);
		
		jest.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = APIClient.getInstance(mockConfig);
			const instance2 = APIClient.getInstance(mockConfig);
			expect(instance1).toBe(instance2);
		});
	});

	describe('request', () => {
		it('should make successful API request', async () => {
			const mockResponseData = { id: 1, name: 'Test' };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await apiClient.request({
				method: 'GET',
				url: '/test'
			});

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						'Accept': 'application/json',
						'User-Agent': 'Ingeniux-CMS-MCP-Server/1.0.0'
					})
				})
			);
			expect(result.data).toEqual(mockResponseData);
			expect(result.status).toBe(200);
		});

		it('should handle blob responses', async () => {
			const mockBlobData = new Blob(['binary data']);
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/octet-stream' }),
				json: jest.fn(),
				text: jest.fn(),
				blob: jest.fn().mockResolvedValue(mockBlobData)
			};
			
			mockFetch.mockResolvedValueOnce(mockResponse);

			const result = await apiClient.request({
				method: 'GET',
				url: '/test'
			});

			expect(result.data).toBe(mockBlobData);
			expect(result.status).toBe(200);
		});

		it('should validate request parameters', async () => {
			await expect(apiClient.request(null as any)).rejects.toMatchObject({
				message: 'Request is required',
				code: 'REQUEST_ERROR'
			});
			
			await expect(apiClient.request({} as any)).rejects.toMatchObject({
				message: 'Request method is required',
				code: 'REQUEST_ERROR'
			});
			
			await expect(apiClient.request({
				method: 'GET'
			} as any)).rejects.toMatchObject({
				message: 'Request URL is required',
				code: 'REQUEST_ERROR'
			});
			
			await expect(apiClient.request({
				method: 'INVALID',
				url: '/test'
			} as any)).rejects.toMatchObject({
				message: 'Invalid HTTP method: INVALID',
				code: 'REQUEST_ERROR'
			});
		});

		it('should handle rate limiting', async () => {
			// Set rate limit info that indicates limit exceeded
			(apiClient as any).rateLimitInfo = {
				limit: 100,
				remaining: 0,
				resetTime: new Date(Date.now() + 3600000) // 1 hour from now
			};

			await expect(apiClient.request({
				method: 'GET',
				url: '/test'
			})).rejects.toMatchObject({
				message: expect.stringContaining('Rate limit exceeded'),
				code: 'REQUEST_ERROR'
			});
		});

		it('should retry on retryable errors', async () => {
			const networkError = new TypeError('fetch failed');
			
			// All calls fail with network error (maxRetries = 2)
			mockFetch
				.mockRejectedValueOnce(networkError)
				.mockRejectedValueOnce(networkError);

			await expect(apiClient.request({
				method: 'GET',
				url: '/test'
			})).rejects.toMatchObject({
				message: 'Network error: Unable to connect to server',
				code: 'NETWORK_ERROR'
			});

			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should not retry non-retryable errors', async () => {
			const clientError = {
				ok: false,
				status: 400,
				statusText: 'Bad Request',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('Bad Request'),
				blob: jest.fn().mockResolvedValue(new Blob(['Bad Request']))
			};
			
			mockFetch.mockResolvedValueOnce(clientError);

			await expect(apiClient.request({
				method: 'GET',
				url: '/test'
			})).rejects.toMatchObject({
				message: 'HTTP 400: Bad Request',
				status: 400,
				code: 'HTTP_400'
			});

			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it('should stop retrying after max retries', async () => {
			const serverError = {
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('Internal Server Error'),
				blob: jest.fn().mockResolvedValue(new Blob(['Internal Server Error']))
			};
			
			mockFetch.mockResolvedValue(serverError);

			await expect(apiClient.request({
				method: 'GET',
				url: '/test'
			})).rejects.toMatchObject({
				message: 'HTTP 500: Internal Server Error',
				status: 500,
				code: 'HTTP_500'
			});

			expect(mockFetch).toHaveBeenCalledTimes(mockConfig.maxRetries);
		});
	});

	describe('HTTP method shortcuts', () => {
		it('should make GET request', async () => {
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
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.get('/test', { param: 'value' }, { 'Custom-Header': 'value' });

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test?param=value',
				expect.objectContaining({
					method: 'GET',
					headers: expect.objectContaining({
						'Custom-Header': 'value'
					})
				})
			);
		});

		it('should make POST request', async () => {
			const mockResponseData = { id: 1 };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.post('/test', { name: 'test' }, { 'Content-Type': 'application/json' });

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test',
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json'
					}),
					body: JSON.stringify({ name: 'test' })
				})
			);
		});

		it('should make PUT request', async () => {
			const mockResponseData = { updated: true };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.put('/test/1', { name: 'updated' });

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test/1',
				expect.objectContaining({
					method: 'PUT',
					body: JSON.stringify({ name: 'updated' })
				})
			);
		});

		it('should make DELETE request', async () => {
			const mockResponseData = { deleted: true };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.delete('/test/1');

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test/1',
				expect.objectContaining({
					method: 'DELETE'
				})
			);
		});

		it('should make PATCH request', async () => {
			const mockResponseData = { patched: true };
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue(mockResponseData),
				text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
				blob: jest.fn().mockResolvedValue(new Blob([JSON.stringify(mockResponseData)]))
			};
			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.patch('/test/1', { field: 'value' });

			expect(mockFetch).toHaveBeenCalledWith(
				'https://test-cms.example.com/test/1',
				expect.objectContaining({
					method: 'PATCH',
					body: JSON.stringify({ field: 'value' })
				})
			);
		});
	});

	describe('rate limit handling', () => {
		it('should extract rate limit info from response headers', async () => {
			const headers = new Headers();
			headers.set('x-ratelimit-limit', '100');
			headers.set('x-ratelimit-remaining', '50');
			headers.set('x-ratelimit-reset', Math.floor(Date.now() / 1000 + 3600).toString());

			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers,
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('{}'),
				blob: jest.fn().mockResolvedValue(new Blob(['{}']))
			};

			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.request({ method: 'GET', url: '/test' });

			const rateLimitInfo = apiClient.getRateLimitInfo();
			expect(rateLimitInfo).toEqual({
				limit: 100,
				remaining: 50,
				resetTime: expect.any(Date)
			});
		});

		it('should handle missing rate limit headers gracefully', async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: 'OK',
				headers: new Headers({ 'content-type': 'application/json' }),
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('{}'),
				blob: jest.fn().mockResolvedValue(new Blob(['{}']))
			};

			mockFetch.mockResolvedValueOnce(mockResponse);

			await apiClient.request({ method: 'GET', url: '/test' });

			const rateLimitInfo = apiClient.getRateLimitInfo();
			expect(rateLimitInfo).toBeNull();
		});
	});

	describe('error handling', () => {
		it('should create API error from HTTP error', async () => {
			const httpError = {
				ok: false,
				status: 404,
				statusText: 'Not Found',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('Not Found'),
				blob: jest.fn().mockResolvedValue(new Blob(['Not Found']))
			};
			mockFetch.mockResolvedValueOnce(httpError);

			try {
				await apiClient.request({ method: 'GET', url: '/test' });
			} catch (error: any) {
				expect(error.message).toBe('HTTP 404: Not Found');
				expect(error.status).toBe(404);
				expect(error.code).toBe('HTTP_404');
			}
		});

		it('should create API error from generic error', async () => {
			const genericError = new Error('Generic error');
			mockFetch.mockRejectedValueOnce(genericError);

			try {
				await apiClient.request({ method: 'GET', url: '/test' });
			} catch (error: any) {
				expect(error.message).toBe('Generic error');
				expect(error.code).toBe('REQUEST_ERROR');
			}
		});

		it('should handle network errors', async () => {
			const networkError = new TypeError('fetch failed');
			mockFetch.mockRejectedValue(networkError);

			await expect(apiClient.request({
				method: 'GET',
				url: '/test'
			})).rejects.toMatchObject({
				message: 'Network error: Unable to connect to server',
				code: 'NETWORK_ERROR'
			});
		});
	});

	describe('configuration', () => {
		it('should update configuration', () => {
			const newConfig = MockFactories.createServerConfig({
				cmsBaseUrl: 'https://new-cms.example.com'
			});

			apiClient.updateConfig(newConfig);

			expect(apiClient.getBaseUrl()).toBe('https://new-cms.example.com');
		});

		it('should return base URL', () => {
			expect(apiClient.getBaseUrl()).toBe(mockConfig.cmsBaseUrl);
		});
	});

	describe('retry logic', () => {
		it('should identify retryable errors correctly', () => {
			const networkError = new TypeError('fetch failed');
			const serverError = new Error('HTTP 500: Internal Server Error');
			const rateLimitError = new Error('HTTP 429: Too Many Requests');
			const clientError = new Error('HTTP 400: Bad Request');

			// Access private method for testing
			const isRetryable = (apiClient as any).isRetryableError.bind(apiClient);

			expect(isRetryable(networkError)).toBe(true);
			expect(isRetryable(serverError)).toBe(true);
			expect(isRetryable(rateLimitError)).toBe(true);
			expect(isRetryable(clientError)).toBe(false);
		});

		it('should use exponential backoff for retries', async () => {
			const serverError = {
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: new Headers(),
				json: jest.fn().mockResolvedValue({}),
				text: jest.fn().mockResolvedValue('Internal Server Error'),
				blob: jest.fn().mockResolvedValue(new Blob(['Internal Server Error']))
			};
			mockFetch.mockResolvedValue(serverError);

			const startTime = Date.now();
			
			try {
				await apiClient.request({ method: 'GET', url: '/test' });
			} catch {
				// Expected to fail
			}

			const endTime = Date.now();
			const duration = endTime - startTime;

			// Should have some delay due to exponential backoff
			expect(duration).toBeGreaterThan(5); // At least some delay for retries
		});
	});
});