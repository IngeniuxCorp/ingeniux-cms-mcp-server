import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { listEndpoints } from '../../src/tools/endpoint-lister.js';
import { provideSchema } from '../../src/tools/schema-provider.js';
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

describe('Three Tools Integration Workflow', () => {
	let mockApiClient: any;
	const mockToolDefs = [
		{
			tool_name: 'get_page_by_id',
			description: 'Get page by ID',
			input_schema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Page ID' },
					include_content: { type: 'boolean', description: 'Include page content' }
				},
				required: ['id']
			},
			output_schema: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					title: { type: 'string' },
					content: { type: 'string' }
				}
			},
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
					title: { type: 'string', description: 'Page title' },
					content: { type: 'string', description: 'Page content' }
				},
				required: ['title', 'content']
			},
			output_schema: { type: 'object' },
			method: 'POST',
			endpoint: '/api/pages',
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

	describe('Complete Workflow: List → Schema → Execute', () => {
		it('should complete full workflow for GET endpoint', async () => {
			// Step 1: List endpoints to discover available endpoints
			const listResult = await listEndpoints({
				method_filter: 'GET',
				include_details: true
			});

			expect(listResult.success).toBe(true);
			if (!listResult.success) return;

			// Verify listing provides necessary information
			expect(listResult.total_endpoints).toBeGreaterThan(0);
			expect(listResult.instructions).toContain('cms_schema_provider');

			// Extract a GET endpoint from results
			const allEndpoints = Object.values(listResult.endpoints).flat();
			const getEndpoint = allEndpoints.find(e => e.method === 'GET');
			expect(getEndpoint).toBeDefined();

			// Step 2: Get schema and execution instructions
			const schemaResult = await provideSchema({
				tool_name: getEndpoint!.tool_name,
				method: getEndpoint!.method,
				endpoint_path: getEndpoint!.endpoint
			});

			expect(schemaResult.success).toBe(true);
			if (!schemaResult.success) return;

			// Verify schema provides execution guidance
			expect(schemaResult.execution_instructions.next_tool).toBe('cms_endpoint_executor');
			expect(schemaResult.execution_instructions.example_call).toBeDefined();

			// Step 3: Execute the endpoint using provided instructions
			mockApiClient.get.mockResolvedValue({ id: '123', title: 'Test Page', content: 'Test Content' });

			const executeResult = await executeEndpoint({
				endpoint_path: schemaResult.endpoint_info.endpoint_path,
				method: schemaResult.endpoint_info.method,
				request_data: { id: '123' }
			}, mockApiClient);

			expect(executeResult.isError).not.toBe(true);
			expect(executeResult.content[0].text).toContain('Test Page');
		});

		it('should complete full workflow for POST endpoint', async () => {
			// Step 1: List endpoints filtering for POST
			const listResult = await listEndpoints({
				method_filter: 'POST'
			});

			expect(listResult.success).toBe(true);
			if (!listResult.success) return;

			const allEndpoints = Object.values(listResult.endpoints).flat();
			const postEndpoint = allEndpoints.find(e => e.method === 'POST');
			expect(postEndpoint).toBeDefined();

			// Step 2: Get schema for POST endpoint
			const schemaResult = await provideSchema({
				tool_name: postEndpoint!.tool_name,
				method: postEndpoint!.method,
				endpoint_path: postEndpoint!.endpoint
			});

			expect(schemaResult.success).toBe(true);
			if (!schemaResult.success) return;

			// Verify POST-specific guidance
			expect(schemaResult.parameter_info.requires_body).toBe(true);
			expect(schemaResult.execution_instructions.validation_notes).toContain('JSON in the request body');

			// Step 3: Execute POST endpoint
			mockApiClient.post.mockResolvedValue({ id: '456', title: 'New Page' });

			const executeResult = await executeEndpoint({
				endpoint_path: schemaResult.endpoint_info.endpoint_path,
				method: schemaResult.endpoint_info.method,
				request_data: {
					title: 'New Page Title',
					content: 'New page content'
				}
			}, mockApiClient);

			expect(executeResult.isError).not.toBe(true);
			expect(mockApiClient.post).toHaveBeenCalledWith('/api/pages', {
				title: 'New Page Title',
				content: 'New page content'
			}, { params: {} });
		});
	});

	describe('Error Propagation Across Tools', () => {
		it('should handle endpoint not found consistently', async () => {
			// List endpoints - should not find nonexistent endpoint
			const listResult = await listEndpoints({
				search_term: 'nonexistent'
			});

			expect(listResult.success).toBe(true);
			if (!listResult.success) return;
			expect(listResult.total_endpoints).toBe(0);

			// Schema provider should report not found
			const schemaResult = await provideSchema({
				tool_name: 'nonexistent_tool',
				method: 'GET',
				endpoint_path: '/api/nonexistent'
			});

			expect(schemaResult.success).toBe(false);
			if (schemaResult.success) return;
			expect(schemaResult.error).toBe('Endpoint not found');

			// Executor should also report not found
			const executeResult = await executeEndpoint({
				endpoint_path: '/api/nonexistent',
				method: 'GET',
				request_data: {}
			}, mockApiClient);

			expect(executeResult.isError).toBe(true);
			expect(executeResult.content[0].text).toContain('No endpoint found');
		});

		it('should handle validation errors consistently', async () => {
			// Valid listing
			const listResult = await listEndpoints({});
			expect(listResult.success).toBe(true);

			// Schema with invalid input
			const invalidSchemaResult = await provideSchema({
				tool_name: '',
				method: 'INVALID',
				endpoint_path: 'invalid'
			});

			expect(invalidSchemaResult.success).toBe(false);

			// Executor with invalid input
			const invalidExecuteResult = await executeEndpoint({
				endpoint_path: 'invalid-path',
				method: 'INVALID'
			}, mockApiClient);

			expect(invalidExecuteResult.isError).toBe(true);
		});
	});

	describe('Data Flow Validation', () => {
		it('should maintain data consistency between tools', async () => {
			// Get endpoint info from lister
			const listResult = await listEndpoints({ include_details: true });
			expect(listResult.success).toBe(true);
			if (!listResult.success) return;

			const endpoint = Object.values(listResult.endpoints).flat()[0];

			// Get detailed schema
			const schemaResult = await provideSchema({
				tool_name: endpoint.tool_name,
				method: endpoint.method,
				endpoint_path: endpoint.endpoint
			});

			expect(schemaResult.success).toBe(true);
			if (!schemaResult.success) return;

			// Verify data consistency
			expect(schemaResult.endpoint_info.tool_name).toBe(endpoint.tool_name);
			expect(schemaResult.endpoint_info.method).toBe(endpoint.method);
			expect(schemaResult.endpoint_info.endpoint_path).toBe(endpoint.endpoint);

			// Verify parameter counts match
			if (endpoint.parameter_count !== undefined) {
				expect(schemaResult.parameter_info.total_parameters).toBe(endpoint.parameter_count);
			}

			// Verify body requirements match
			if (endpoint.requires_body !== undefined) {
				expect(schemaResult.parameter_info.requires_body).toBe(endpoint.requires_body);
			}

			// Verify path parameters match
			if (endpoint.has_path_params !== undefined) {
				const hasPathParams = schemaResult.parameter_info.path_parameters.length > 0;
				expect(hasPathParams).toBe(endpoint.has_path_params);
			}
		});
	});

	describe('Instruction Chain Validation', () => {
		it('should provide correct next-step instructions', async () => {
			// Lister should point to schema provider
			const listResult = await listEndpoints({});
			expect(listResult.success).toBe(true);
			if (!listResult.success) return;

			expect(listResult.instructions).toContain('cms_schema_provider');
			expect(listResult.next_step_instruction).toContain('cms_schema_provider');

			// Schema provider should point to executor
			const endpoint = Object.values(listResult.endpoints).flat()[0];
			const schemaResult = await provideSchema({
				tool_name: endpoint.tool_name,
				method: endpoint.method,
				endpoint_path: endpoint.endpoint
			});

			expect(schemaResult.success).toBe(true);
			if (!schemaResult.success) return;

			expect(schemaResult.execution_instructions.next_tool).toBe('cms_endpoint_executor');
			expect(schemaResult.execution_instructions.next_step_instruction).toContain('cms_endpoint_executor');
		});
	});

	describe('Parameter Mapping Validation', () => {
		it('should correctly map parameters through the chain', async () => {
			// Get endpoint with path parameters
			const schemaResult = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(schemaResult.success).toBe(true);
			if (!schemaResult.success) return;

			// Verify path parameter is identified
			expect(schemaResult.parameter_info.path_parameters.length).toBe(1);
			expect(schemaResult.parameter_info.path_parameters[0].name).toBe('id');

			// Execute with path parameter
			mockApiClient.get.mockResolvedValue({ id: '123', title: 'Test' });

			const executeResult = await executeEndpoint({
				endpoint_path: '/api/pages/{id}',
				method: 'GET',
				request_data: { id: '123', include_content: true }
			}, mockApiClient);

			expect(executeResult.isError).not.toBe(true);
			// Verify path parameter was interpolated and query parameter was added
			expect(mockApiClient.get).toHaveBeenCalledWith('/api/pages/123', { include_content: true });
		});
	});

	describe('Performance and Scalability', () => {
		it('should handle workflow efficiently with large datasets', async () => {
			// Create large dataset
			const largeToolDefs = Array.from({ length: 100 }, (_, i) => ({
				...mockToolDefs[0],
				tool_name: `tool_${i}`,
				endpoint: `/api/endpoint_${i}`
			}));

			mockedFs.readFileSync.mockReturnValue(JSON.stringify(largeToolDefs));

			const startTime = Date.now();

			// Execute full workflow
			const listResult = await listEndpoints({});
			expect(listResult.success).toBe(true);

			if (listResult.success) {
				const endpoint = Object.values(listResult.endpoints).flat()[0];
				const schemaResult = await provideSchema({
					tool_name: endpoint.tool_name,
					method: endpoint.method,
					endpoint_path: endpoint.endpoint
				});

				expect(schemaResult.success).toBe(true);
			}

			const duration = Date.now() - startTime;
			expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
		});
	});

	describe('Error Recovery', () => {
		it('should provide helpful error messages for workflow recovery', async () => {
			// Test with endpoint that exists in lister but not in exact match
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'POST', // Wrong method
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.suggestions).toBeDefined();
				expect(result.help).toContain('cms_endpoint_lister');
			}
		});
	});
});