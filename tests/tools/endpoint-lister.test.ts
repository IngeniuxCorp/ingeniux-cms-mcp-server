import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { listEndpoints } from '../../src/tools/endpoint-lister.js';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as any;

describe('Endpoint Lister', () => {
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
					content: { type: 'string' }
				},
				required: ['title', 'content']
			},
			output_schema: { type: 'object' },
			method: 'POST',
			endpoint: '/api/pages',
			tags: ['pages']
		},
		{
			tool_name: 'get_assets',
			description: 'Get all assets',
			input_schema: {
				type: 'object',
				properties: {
					limit: { type: 'number' },
					filter: { type: 'string' }
				}
			},
			output_schema: { type: 'object' },
			method: 'GET',
			endpoint: '/api/assets',
			tags: ['assets']
		},
		{
			tool_name: 'delete_page',
			description: 'Delete page',
			input_schema: {
				type: 'object',
				properties: {
					id: { type: 'string' }
				},
				required: ['id']
			},
			output_schema: { type: 'object' },
			method: 'DELETE',
			endpoint: '/api/pages/{id}',
			tags: ['pages']
		}
	];

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock file system operations
		mockedFs.readdirSync.mockReturnValue(['tools-1.json']);
		mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockToolDefs));
	});

	describe('Input Validation', () => {
		it('should validate method filter', async () => {
			const result = await listEndpoints({
				method_filter: 'INVALID'
			});

			expect(result.success).toBe(false);
			expect((result as any).message).toContain('Invalid method filter');
		});

		it('should validate search term length', async () => {
			const result = await listEndpoints({
				search_term: 'a'
			});

			expect(result.success).toBe(false);
			expect((result as any).message).toContain('Search term must be at least 2 characters');
		});

		it('should handle empty input gracefully', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			expect((result as any).total_endpoints).toBe(4);
		});

		it('should normalize input parameters', async () => {
			const result = await listEndpoints({
				method_filter: 'get',
				search_term: '  PAGE  ',
				include_details: true
			});

			expect(result.success).toBe(true);
		});
	});

	describe('Filtering Logic', () => {
		it('should filter by method', async () => {
			const result = await listEndpoints({
				method_filter: 'GET'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(2); // get_page_by_id and get_assets
				const allEndpoints = Object.values(result.endpoints).flat();
				allEndpoints.forEach(endpoint => {
					expect(endpoint.method).toBe('GET');
				});
			}
		});

		it('should filter by category', async () => {
			const result = await listEndpoints({
				category_filter: 'pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(3); // All page-related endpoints
			}
		});

		it('should filter by search term', async () => {
			const result = await listEndpoints({
				search_term: 'asset'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(1); // Only get_assets
				const allEndpoints = Object.values(result.endpoints).flat();
				expect(allEndpoints[0].tool_name).toBe('get_assets');
			}
		});

		it('should search in description', async () => {
			const result = await listEndpoints({
				search_term: 'Create'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(1); // Only create_page
			}
		});

		it('should search in endpoint path', async () => {
			const result = await listEndpoints({
				search_term: '/api/assets'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(1);
			}
		});

		it('should combine multiple filters', async () => {
			const result = await listEndpoints({
				method_filter: 'GET',
				category_filter: 'pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(1); // Only get_page_by_id
			}
		});
	});

	describe('Categorization', () => {
		it('should categorize endpoints by tags', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.categories).toEqual(expect.arrayContaining(['pages', 'assets']));
				expect(result.endpoints.pages).toBeDefined();
				expect(result.endpoints.assets).toBeDefined();
			}
		});

		it('should handle endpoints without tags', async () => {
			const endpointsWithoutTags = [
				{
					...mockToolDefs[0],
					tags: undefined,
					endpoint: '/site/config'
				}
			];

			mockedFs.readFileSync.mockReturnValue(JSON.stringify(endpointsWithoutTags));

			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.categories).toEqual(expect.arrayContaining(['site-management']));
			}
		});

		it('should use default category for unknown paths', async () => {
			const unknownEndpoints = [
				{
					...mockToolDefs[0],
					tags: undefined,
					endpoint: '/unknown/endpoint'
				}
			];

			mockedFs.readFileSync.mockReturnValue(JSON.stringify(unknownEndpoints));

			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.categories).toEqual(expect.arrayContaining(['unknown']));
			}
		});
	});

	describe('Sorting Logic', () => {
		it('should sort endpoints by method then path', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				// GET methods should come before POST, DELETE
				const getMethods = allEndpoints.filter(e => e.method === 'GET');
				const postMethods = allEndpoints.filter(e => e.method === 'POST');
				const deleteMethods = allEndpoints.filter(e => e.method === 'DELETE');
				
				expect(getMethods.length).toBeGreaterThan(0);
				expect(postMethods.length).toBeGreaterThan(0);
				expect(deleteMethods.length).toBeGreaterThan(0);
			}
		});
	});

	describe('Formatting Logic', () => {
		it('should format basic endpoint information', async () => {
			const result = await listEndpoints({
				include_details: false
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				const endpoint = allEndpoints[0];
				
				expect(endpoint).toHaveProperty('tool_name');
				expect(endpoint).toHaveProperty('method');
				expect(endpoint).toHaveProperty('endpoint');
				expect(endpoint).toHaveProperty('description');
				
				// Should not have detailed properties
				expect(endpoint).not.toHaveProperty('has_path_params');
				expect(endpoint).not.toHaveProperty('requires_body');
				expect(endpoint).not.toHaveProperty('parameter_count');
			}
		});

		it('should format detailed endpoint information', async () => {
			const result = await listEndpoints({
				include_details: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				const endpoint = allEndpoints[0];
				
				expect(endpoint).toHaveProperty('tool_name');
				expect(endpoint).toHaveProperty('method');
				expect(endpoint).toHaveProperty('endpoint');
				expect(endpoint).toHaveProperty('description');
				expect(endpoint).toHaveProperty('tags');
				expect(endpoint).toHaveProperty('has_path_params');
				expect(endpoint).toHaveProperty('requires_body');
				expect(endpoint).toHaveProperty('parameter_count');
			}
		});

		it('should detect path parameters correctly', async () => {
			const result = await listEndpoints({
				include_details: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				const pageEndpoint = allEndpoints.find(e => e.endpoint === '/api/pages/{id}');
				const assetsEndpoint = allEndpoints.find(e => e.endpoint === '/api/assets');
				
				expect(pageEndpoint?.has_path_params).toBe(true);
				expect(assetsEndpoint?.has_path_params).toBe(false);
			}
		});

		it('should detect body requirements correctly', async () => {
			const result = await listEndpoints({
				include_details: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				const postEndpoint = allEndpoints.find(e => e.method === 'POST');
				const getEndpoint = allEndpoints.find(e => e.method === 'GET');
				
				expect(postEndpoint?.requires_body).toBe(true);
				expect(getEndpoint?.requires_body).toBe(false);
			}
		});

		it('should count parameters correctly', async () => {
			const result = await listEndpoints({
				include_details: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const allEndpoints = Object.values(result.endpoints).flat();
				const createPageEndpoint = allEndpoints.find(e => e.tool_name === 'create_page');
				
				expect(createPageEndpoint?.parameter_count).toBe(2); // title and content
			}
		});
	});

	describe('Instruction Generation', () => {
		it('should include LLM selection instructions', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.instructions).toContain('cms_schema_provider');
				expect(result.instructions).toContain('tool_name');
				expect(result.instructions).toContain('method');
				expect(result.instructions).toContain('endpoint_path');
			}
		});

		it('should include next step instruction', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.next_step_instruction).toContain('cms_schema_provider');
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle file system errors gracefully', async () => {
			mockedFs.readdirSync.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(0);
			}
		});

		it('should handle malformed JSON files gracefully', async () => {
			mockedFs.readFileSync.mockReturnValue('invalid json');

			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBe(0);
			}
		});

		it('should provide available filters in error response', async () => {
			const result = await listEndpoints({
				method_filter: 'INVALID'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.available_filters).toBeDefined();
				expect(result.available_filters?.methods).toContain('GET');
				expect(result.available_filters?.methods).toContain('POST');
			}
		});
	});

	describe('Category Discovery', () => {
		it('should discover available categories', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.categories).toEqual(expect.arrayContaining(['pages', 'assets']));
				expect(result.categories.length).toBeGreaterThan(0);
			}
		});

		it('should sort categories alphabetically', async () => {
			const result = await listEndpoints({});

			expect(result.success).toBe(true);
			if (result.success) {
				const sortedCategories = [...result.categories].sort();
				expect(result.categories).toEqual(sortedCategories);
			}
		});
	});

	describe('Performance', () => {
		it('should handle large endpoint sets efficiently', async () => {
			const largeToolDefs = Array.from({ length: 1000 }, (_, i) => ({
				...mockToolDefs[0],
				tool_name: `tool_${i}`,
				endpoint: `/api/endpoint_${i}`
			}));

			mockedFs.readFileSync.mockReturnValue(JSON.stringify(largeToolDefs));

			const startTime = Date.now();
			const result = await listEndpoints({});
			const duration = Date.now() - startTime;

			expect(result.success).toBe(true);
			expect(duration).toBeLessThan(1000); // Should complete within 1 second
		});
	});

	describe('Integration', () => {
		it('should execute complete end-to-end listing workflow', async () => {
			const result = await listEndpoints({
				method_filter: 'GET',
				include_details: true
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.total_endpoints).toBeGreaterThan(0);
				expect(result.categories.length).toBeGreaterThan(0);
				expect(Object.keys(result.endpoints).length).toBeGreaterThan(0);
				expect(result.instructions).toBeTruthy();
				expect(result.next_step_instruction).toBeTruthy();

				// Verify structure integrity
				const allEndpoints = Object.values(result.endpoints).flat();
				allEndpoints.forEach(endpoint => {
					expect(endpoint.tool_name).toBeTruthy();
					expect(endpoint.method).toBeTruthy();
					expect(endpoint.endpoint).toBeTruthy();
					expect(endpoint.description).toBeTruthy();
				});
			}
		});
	});
});