import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { provideSchema } from '../../src/tools/schema-provider.js';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as any;

describe('Schema Provider', () => {
	const mockToolDefs = [
		{
			tool_name: 'get_page_by_id',
			description: 'Get page by ID',
			input_schema: {
				type: 'object',
				properties: {
					id: { type: 'string', description: 'Page ID' },
					include_content: { type: 'boolean', description: 'Include page content' },
					format: { type: 'string', enum: ['json', 'html'] }
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
					content: { type: 'string', description: 'Page content' },
					metadata: { 
						type: 'object', 
						properties: {
							author: { type: 'string' },
							tags: { type: 'array', items: { type: 'string' } }
						}
					},
					published_date: { type: 'string', format: 'date' }
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

		// Mock file system operations
		mockedFs.readdirSync.mockReturnValue(['tools-1.json']);
		mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockToolDefs));
	});

	describe('Input Validation', () => {
		it('should validate tool_name is required', async () => {
			const result = await provideSchema({
				tool_name: '',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.validation_errors).toContain('tool_name is required and must be a string');
			}
		});

		it('should validate method is required', async () => {
			const result = await provideSchema({
				tool_name: 'test',
				method: '',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.message).toContain('method must be one of');
			}
		});

		it('should validate endpoint_path is required', async () => {
			const result = await provideSchema({
				tool_name: 'test',
				method: 'GET',
				endpoint_path: ''
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.validation_errors).toContain('endpoint_path is required and must be a string');
			}
		});

		it('should validate endpoint_path starts with /', async () => {
			const result = await provideSchema({
				tool_name: 'test',
				method: 'GET',
				endpoint_path: 'api/pages/123'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.validation_errors).toContain("endpoint_path must start with '/'");
			}
		});

		it('should validate supported HTTP methods', async () => {
			const result = await provideSchema({
				tool_name: 'test',
				method: 'INVALID',
				endpoint_path: '/api/test'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.message).toContain('method must be one of: GET, POST, PUT, DELETE, PATCH');
			}
		});

		it('should normalize input parameters', async () => {
			const result = await provideSchema({
				tool_name: '  get_page_by_id  ',
				method: 'get',
				endpoint_path: '  /api/pages/{id}  '
			});

			expect(result.success).toBe(true);
		});
	});

	describe('Endpoint Lookup', () => {
		it('should find exact endpoint match', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.endpoint_info.tool_name).toBe('get_page_by_id');
				expect(result.endpoint_info.method).toBe('GET');
				expect(result.endpoint_info.endpoint_path).toBe('/api/pages/{id}');
			}
		});

		it('should handle endpoint not found', async () => {
			const result = await provideSchema({
				tool_name: 'nonexistent',
				method: 'GET',
				endpoint_path: '/api/nonexistent'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Endpoint not found');
				expect(result.message).toContain('No endpoint found matching');
			}
		});

		it('should provide suggestions for similar tool names', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.suggestions).toBeDefined();
				expect(result.suggestions?.length).toBeGreaterThan(0);
			}
		});

		it('should provide suggestions for similar methods', async () => {
			const result = await provideSchema({
				tool_name: 'unknown_tool',
				method: 'GET',
				endpoint_path: '/api/unknown'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.help).toContain('cms_endpoint_lister');
			}
		});
	});

	describe('Schema Extraction', () => {
		it('should extract and normalize input schema', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.input_schema.type).toBe('object');
				expect(result.input_schema.properties).toBeDefined();
				expect(result.input_schema.required).toEqual(['id']);
				expect(result.input_schema.property_count).toBe(3);
				expect(result.input_schema.required_count).toBe(1);
				expect(result.input_schema.optional_count).toBe(2);
			}
		});

		it('should extract and normalize output schema', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.output_schema.type).toBe('object');
			}
		});

		it('should handle missing schemas gracefully', async () => {
			const endpointWithoutSchema = {
				...mockToolDefs[0],
				input_schema: undefined,
				output_schema: undefined
			};

			mockedFs.readFileSync.mockReturnValue(JSON.stringify([endpointWithoutSchema]));

			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.input_schema.type).toBe('object');
				expect(result.input_schema.properties).toEqual({});
			}
		});
	});

	describe('Parameter Analysis', () => {
		it('should analyze required and optional parameters', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.total_parameters).toBe(3);
				expect(result.parameter_info.required_parameters.length).toBe(1);
				expect(result.parameter_info.optional_parameters.length).toBe(2);
				expect(result.parameter_info.required_parameters[0].name).toBe('id');
			}
		});

		it('should extract path parameters', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.path_parameters.length).toBe(1);
				expect(result.parameter_info.path_parameters[0].name).toBe('id');
				expect(result.parameter_info.path_parameters[0].placeholder).toBe('{id}');
			}
		});

		it('should analyze complex types', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.type_analysis.has_complex_types).toBe(true);
				expect(result.parameter_info.type_analysis.complex_types.length).toBeGreaterThan(0);
			}
		});

		it('should determine body requirements correctly', async () => {
			const getResult = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			const postResult = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(getResult.success).toBe(true);
			expect(postResult.success).toBe(true);

			if (getResult.success) {
				expect(getResult.parameter_info.requires_body).toBe(false);
			}
			if (postResult.success) {
				expect(postResult.parameter_info.requires_body).toBe(true);
			}
		});
	});

	describe('Type Analysis', () => {
		it('should count parameter types', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const typeCounts = result.parameter_info.type_analysis.type_counts;
				expect(typeCounts.string).toBeGreaterThan(0);
				expect(typeCounts.object).toBeGreaterThan(0);
			}
		});

		it('should identify complex types', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const complexTypes = result.parameter_info.type_analysis.complex_types;
				const metadataType = complexTypes.find(t => t.name === 'metadata');
				expect(metadataType).toBeDefined();
				expect(metadataType?.type).toBe('object');
			}
		});
	});

	describe('Method Information', () => {
		it('should provide correct method information for GET', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.method_info.description).toBe('Retrieve data');
				expect(result.parameter_info.method_info.uses_query_params).toBe(true);
				expect(result.parameter_info.method_info.uses_body).toBe(false);
				expect(result.parameter_info.method_info.idempotent).toBe(true);
			}
		});

		it('should provide correct method information for POST', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.method_info.description).toBe('Create new resource');
				expect(result.parameter_info.method_info.uses_query_params).toBe(false);
				expect(result.parameter_info.method_info.uses_body).toBe(true);
				expect(result.parameter_info.method_info.idempotent).toBe(false);
			}
		});
	});

	describe('Instruction Generation', () => {
		it('should generate clear execution overview', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.execution_instructions.overview).toContain('GET');
				expect(result.execution_instructions.overview).toContain('/api/pages/{id}');
				expect(result.execution_instructions.overview).toContain('Get page by ID');
			}
		});

		it('should generate parameter guidance', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const guidance = result.execution_instructions.parameter_guidance;
				expect(guidance.required.length).toBe(1);
				expect(guidance.required[0].name).toBe('id');
				expect(guidance.path_params.length).toBe(1);
				expect(guidance.path_params[0].name).toBe('id');
			}
		});

		it('should generate realistic examples', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const exampleCall = result.execution_instructions.example_call;
				expect(exampleCall.tool_name).toBe('cms_endpoint_executor');
				expect(exampleCall.parameters.endpoint_path).toBe('/api/pages');
				expect(exampleCall.parameters.method).toBe('POST');
				expect(exampleCall.parameters.request_data).toBeDefined();
			}
		});

		it('should generate validation notes', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const notes = result.execution_instructions.validation_notes;
				expect(notes).toContain('Path parameters will be automatically interpolated into the URL');
				expect(notes).toContain('Parameters will be sent as query parameters');
			}
		});

		it('should provide next step instructions', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.execution_instructions.next_step_instruction).toContain('cms_endpoint_executor');
				expect(result.execution_instructions.next_step_instruction).toContain('/api/pages/{id}');
			}
		});
	});

	describe('Example Generation', () => {
		it('should generate appropriate examples for different types', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				const guidance = result.execution_instructions.parameter_guidance;
				const dateParam = guidance.required.find(p => p.name === 'published_date');
				expect(dateParam?.example).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle validation errors', async () => {
			const result = await provideSchema({
				tool_name: '',
				method: 'INVALID',
				endpoint_path: 'invalid'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Invalid input');
				expect(result.validation_errors).toBeDefined();
				expect(result.suggestion).toContain('check the required parameters');
			}
		});

		it('should handle file system errors', async () => {
			mockedFs.readdirSync.mockImplementation(() => {
				throw new Error('Permission denied');
			});

			const result = await provideSchema({
				tool_name: 'test',
				method: 'GET',
				endpoint_path: '/api/test'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('Schema retrieval failed');
			}
		});

		it('should handle malformed JSON files', async () => {
			mockedFs.readFileSync.mockReturnValue('invalid json');

			const result = await provideSchema({
				tool_name: 'test',
				method: 'GET',
				endpoint_path: '/api/test'
			});

			expect(result.success).toBe(false);
		});
	});

	describe('Path Parameter Extraction', () => {
		it('should extract multiple path parameters', async () => {
			const endpointWithMultipleParams = {
				...mockToolDefs[0],
				endpoint: '/api/pages/{id}/comments/{commentId}'
			};

			mockedFs.readFileSync.mockReturnValue(JSON.stringify([endpointWithMultipleParams]));

			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}/comments/{commentId}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.path_parameters.length).toBe(2);
				expect(result.parameter_info.path_parameters[0].name).toBe('id');
				expect(result.parameter_info.path_parameters[1].name).toBe('commentId');
			}
		});

		it('should handle endpoints without path parameters', async () => {
			const result = await provideSchema({
				tool_name: 'create_page',
				method: 'POST',
				endpoint_path: '/api/pages'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.parameter_info.path_parameters.length).toBe(0);
			}
		});
	});

	describe('Integration', () => {
		it('should execute complete end-to-end schema provision workflow', async () => {
			const result = await provideSchema({
				tool_name: 'get_page_by_id',
				method: 'GET',
				endpoint_path: '/api/pages/{id}'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				// Verify all components are present
				expect(result.endpoint_info).toBeDefined();
				expect(result.input_schema).toBeDefined();
				expect(result.output_schema).toBeDefined();
				expect(result.parameter_info).toBeDefined();
				expect(result.execution_instructions).toBeDefined();

				// Verify execution readiness
				expect(result.execution_instructions.next_tool).toBe('cms_endpoint_executor');
				expect(result.execution_instructions.example_call).toBeDefined();
				expect(result.execution_instructions.parameter_guidance).toBeDefined();
				expect(result.execution_instructions.validation_notes.length).toBeGreaterThan(0);
			}
		});
	});
});