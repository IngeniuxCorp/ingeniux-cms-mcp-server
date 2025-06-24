// MCP tool registry for Swagger-based endpoints (3-tool system)
import { APIClient } from '../api/api-client.js';
import { MCPTool } from '../types/mcp-types.js';

// Import new modular tools
import { listEndpoints } from './endpoint-lister.js';
import { provideSchema } from './schema-provider.js';
import { executeEndpoint } from './endpoint-executor.js';

// Utility to wrap tool result in ToolResult format
function wrapResult(result: any): any {
	return {
		content: [
			{
				type: 'text',
				text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
			}
		]
	};
}

// Tool registry
export function getSwaggerMcpTools(apiClient: APIClient): MCPTool[] {
	return [
		{
			name: 'cms_endpoint_lister',
			description: 'List available CMS endpoints for LLM selection and decision-making',
			inputSchema: {
				type: 'object',
				properties: {
					category_filter: { type: 'string', description: 'Filter by endpoint category' },
					method_filter: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
					search_term: { type: 'string', description: 'Search term for endpoint names/descriptions' },
					include_details: { type: 'boolean', default: false, description: 'Include detailed endpoint information' }
				}
			},
			handler: async (args: any) => wrapResult(await listEndpoints(args))
		},
		{
			name: 'cms_schema_provider',
			description: 'Provide endpoint schemas and execution instructions based on LLM selection',
			inputSchema: {
				type: 'object',
				properties: {
					tool_name: { type: 'string', description: 'Selected tool name from endpoint listing' },
					method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
					endpoint_path: { type: 'string', description: 'Selected endpoint path' }
				},
				required: ['tool_name', 'method', 'endpoint_path']
			},
			handler: async (args: any) => wrapResult(await provideSchema(args))
		},
		{
			name: 'cms_endpoint_executor',
			description: 'Execute validated CMS API calls with resolved endpoint paths',
			inputSchema: {
				type: 'object',
				properties: {
					endpoint_path: { type: 'string', description: 'Resolved API endpoint path' },
					method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
					request_data: { type: 'object', description: 'Request parameters and body data' },
					validation_required: { type: 'boolean', default: true }
				},
				required: ['endpoint_path', 'method']
			},
			handler: (args: any) => executeEndpoint(args, apiClient)
		}
	];
}