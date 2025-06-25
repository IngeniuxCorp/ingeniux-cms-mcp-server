import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { executeEndpoint } from '../../src/tools/endpoint-executor.js';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as any;

// Mock logger
jest.mock('../../src/utils/logger.js', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn()
	}
}));

describe('Endpoint Executor', () => {
	let mockApiClient: any;
	const mockToolDefs = [
		{
			tool_name: 'get_page_by_id',
			description: 'Get page by ID',
			input_schema: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					include_content: { type: 'boolean' }
				},
				required: ['id']
			},
			output_schema: { type: 'object' },
			method: 'GET',
			endpoint: '/api/pages/{id}',
			tags: ['pages']
		},
		{
			tool_name: 'create_page',
			description: 'Create new page',
			input_schema: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					content: { type: 'string' },
					status: { type: 'string' }
				},
				required: ['title', 'content']
			},
			output_schema: { type: 'object' },
			method: 'POST',
			endpoint: '/api/pages',
			tags: ['pages']
		},
		{
			tool_name: 'update_page',
			description: 'Update page',
			input_schema: {
				type: 'object',
				properties: {
					title: { type: 'string' }
				}
			},
			output_schema: { type: 'object' },
			method: 'PUT',
			endpoint: '/api/pages',
			tags: ['pages']
		},
		{
			tool_name: 'delete_page',
			description: 'Delete page',
			input_schema: {
				type: 'object',
				properties: {
					force: { type: 'boolean' }
				}
			},
			output_schema: { type: 'object' },
			method: 'DELETE',
			endpoint: '/api/pages',
			tags: ['pages']
		},
		{
			tool_name: 'patch_page',
			description: 'Patch page',
			input_schema: {
				type: 'object',
				properties: {
					title: { type: 'string' }
				}
			},
			output_schema: { type: 'object' },
			method: 'PATCH',
			endpoint: '/api/pages',
			tags: ['pages']
		},
		{
			tool_name: 'get_page_comments',
			description: 'Get page comments',
			input_schema: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					commentId: { type: 'string' }
				},
				required: ['id', 'commentId']
			},
			output_schema: { type: 'object' },
			method: 'GET',
			endpoint: '/api/pages/{id}/comments/{commentId}',
			tags: ['pages']
		}
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockApiClient = {
			get: jest.fn(),
			post: jest.fn(),
			put: jest.fn(),
			request: jest.fn()
		};

		// Mock file system operations
		mockedFs.readdirSync.mockReturnValue(['tools-1.json']);
		mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockToolDefs));
	});

	describe('Input Validation', () => {
		it('should validate endpoint path format', async () => {
			const result = await executeEndpoint({
				endpoint_path: 'invalid-path',
				method: 'GET'
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid or missing endpoint_path');
		});

		it('should validate HTTP method', async () => {
			const result = await executeEndpoint({
				endpoint_path: '/api/test',
				method: 'INVALID'
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Invalid or missing HTTP method');
		});

		it('should validate request_data is object', async () => {
			const result = await executeEndpoint({
				endpoint_path: '/api/test',
				method: 'GET',
				request_data: 'invalid' as any
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('request_data must be a valid object');
		});

		it('should reject invalid characters in endpoint path', async () => {
			const invalidPaths = ['/api/test<script>', '/api/test|pipe', '/api/test?query'];
			
			for (const path of invalidPaths) {
				const result = await executeEndpoint({
					endpoint_path: path,
					method: 'GET'
				}, mockApiClient);

				expect(result.isError).toBe(true);
			}
		});
	});

	describe('Endpoint Resolution', () => {
		it('should find exact endpoint match', async () => {
			mockApiClient.get.mockResolvedValue({ id: '123', title: 'Test' });

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.isError).not.toBe(true);
			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { include_content: undefined });
		});

		it('should handle endpoint not found', async () => {
			const result = await executeEndpoint({
				endpoint_path: '/api/nonexistent',
				method: 'GET'
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('No endpoint found for GET /api/nonexistent');
		});
	});

	describe('Parameter Validation', () => {
		it('should validate required parameters', async () => {
			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: {}
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Missing required parameters: id');
		});

		it('should allow optional parameters', async () => {
			mockApiClient.get.mockResolvedValue({ id: '123' });

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123', include_content: true }
			}, mockApiClient);

			expect(result.isError).not.toBe(true);
		});

		it('should skip validation when validation_required is false', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' },
				validation_required: false
			}, mockApiClient);

			expect(result.isError).not.toBe(true);
		});
	});

	describe('Path Parameter Interpolation', () => {
		it('should interpolate path parameters correctly', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { include_content: undefined });
		});

		it('should URL encode path parameters', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: 'test with spaces' }
			}, mockApiClient);

			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/test%20with%20spaces', { include_content: undefined });
		});

		it('should handle unresolved path parameters', async () => {
			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}/comments/{commentId}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Missing required parameters: commentId');
		});
	});

	describe('HTTP Request Preparation', () => {
		it('should handle GET requests with query parameters', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123', include_content: true }
			}, mockApiClient);

			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { include_content: true });
		});

		it('should handle POST requests with body data', async () => {
			mockApiClient.post.mockResolvedValue({ id: '456' });

			await executeEndpoint({
				endpoint_path: '/api/pages',
				method: 'POST',
				request_data: { title: 'New Page', content: 'Content' }
			}, mockApiClient);

			expect(mockApiClient.post).toHaveBeenCalledWith('/api/pages', { title: 'New Page', content: 'Content' }, { params: {} });
		});

		it('should handle PUT requests', async () => {
			mockApiClient.put.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages',
				method: 'PUT',
				request_data: { title: 'Updated' }
			}, mockApiClient);

			expect(mockApiClient.put).toHaveBeenCalledWith('/api/pages', { title: 'Updated' }, { params: {} });
		});

		it('should handle DELETE requests', async () => {
			mockApiClient.request.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages',
				method: 'DELETE',
				request_data: { force: true }
			}, mockApiClient);

			expect(mockApiClient.request).toHaveBeenCalledWith({ method: 'DELETE', url: '/api/pages', params: { force: true } });
		});

		it('should handle PATCH requests', async () => {
			mockApiClient.request.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages',
				method: 'PATCH',
				request_data: { title: 'Patched' }
			}, mockApiClient);

			expect(mockApiClient.request).toHaveBeenCalledWith({ method: 'PATCH', url: '/api/pages', data: { title: 'Patched' }, params: {} });
		});
	});

	describe('Response Formatting', () => {
		it('should format string responses', async () => {
			mockApiClient.get.mockResolvedValue('Simple string response');

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.content[0].text).toBe('Simple string response');
		});

		it('should format object responses as JSON', async () => {
			const responseData = { id: '123', title: 'Test Page' };
			mockApiClient.get.mockResolvedValue(responseData);

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.content[0].text).toBe(JSON.stringify(responseData, null, 2));
		});

		it('should include metadata in successful responses', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.metadata).toEqual(
				expect.objectContaining({
					endpoint: '/api/pages/{id}',
					method: 'GET',
					success: true,
					timestamp: expect.any(String)
				})
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle API client errors', async () => {
			mockApiClient.get.mockRejectedValue(new Error('Network error'));

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.isError).toBe(true);
			expect(result.content[0].text).toContain('Execution failed: Network error');
		});

		it('should handle file system errors', async () => {
			mockedFs.readdirSync.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.isError).toBe(true);
		});

		it('should handle malformed tool definition files', async () => {
			mockedFs.readFileSync.mockReturnValue('invalid json');

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123' }
			}, mockApiClient);

			expect(result.isError).toBe(true);
		});
	});

	describe('Utility Functions', () => {
		it('should extract path parameter names correctly', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });

			await executeEndpoint({
				endpoint_path: '/api/pages/{id}/comments/{commentId}',
				method: 'GET',
				request_data: { id: '123', commentId: '456' },
				validation_required: false
			}, mockApiClient);

			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123/comments/456', {});
		});

		it('should separate parameters correctly for different methods', async () => {
			mockApiClient.get.mockResolvedValue({ success: true });
			mockApiClient.post.mockResolvedValue({ success: true });

			// GET: non-path params become query params
			await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123', filter: 'active' }
			}, mockApiClient);

			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { filter: 'active' });

			// POST: non-path params become body data
			await executeEndpoint({
				endpoint_path: '/api/pages',
				method: 'POST',
				request_data: { title: 'New', content: 'Content' }
			}, mockApiClient);

			expect(mockApiClient.post).toHaveBeenCalledWith('/api/pages', { title: 'New', content: 'Content' }, { params: {} });
		});
	});

	describe('Integration', () => {
		it('should execute complete end-to-end flow', async () => {
			const expectedResponse = { id: '123', title: 'Test Page', content: 'Content' };
			mockApiClient.get.mockResolvedValue(expectedResponse);

			const result = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123', include_content: true }
			}, mockApiClient);

			expect(result.isError).not.toBe(true);
			expect(result.content[0].text).toBe(JSON.stringify(expectedResponse, null, 2));
			expect((result.metadata as any)?.success).toBe(true);
			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { include_content: true });
		});
	});
});