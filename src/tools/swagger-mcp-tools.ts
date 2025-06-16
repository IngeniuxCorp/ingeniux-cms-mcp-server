// Auto-generated MCP tool loader for Swagger-based endpoints
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { APIClient } from '../api/api-client.js';
import { MCPTool } from '../types/mcp-types.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const GENERATED_DIR = path.resolve(__dirname, '../../mcp-tools-generated');

type MCPToolDef = {
	tool_name: string;
	description: string;
	input_schema: any;
	output_schema: any;
	method: string;
	endpoint: string;
	tags?: string[];
};

function loadSwaggerToolDefs(): MCPToolDef[] {
	const files = fs.readdirSync(GENERATED_DIR)
		.filter(f => f.startsWith('tools-') && f.endsWith('.json'));
	const all: MCPToolDef[] = [];
	for (const file of files) {
		const fullPath = path.join(GENERATED_DIR, file);
		try {
			const chunk = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
			if (Array.isArray(chunk)) all.push(...chunk);
		} catch (e) {
			console.error('Failed to load tool def:', file, e);
		}
	}
	return all;
}

function buildToolHandler(def: MCPToolDef, apiClient: APIClient) {
	return async (args: any) => {
		const method = def.method.toUpperCase();
		let url = def.endpoint;
		try {		

			let resp;
			switch (method) {
				case 'GET':
					resp = await apiClient.get(url, args);
					break;
				case 'POST':
					resp = await apiClient.post(url, args);
					break;
				case 'PUT':
					resp = await apiClient.put(url, args);
					break;
				case 'DELETE':
					// For Swagger MCP tools, treat DELETE like GET: all params as query string
					resp = await apiClient.request({ method: 'DELETE', url, params: args });
					break;
				case 'PATCH':
					// For Swagger MCP tools, treat PATCH like GET: all params as query string
					resp = await apiClient.request({ method: 'PATCH', url, params: args });
					break;
				default:
					throw new Error('Unsupported HTTP method: ' + method);
			}
			return {
				content: [
					{
						type: 'text' as const,
						text: typeof resp === 'string' ? resp : JSON.stringify(resp)
					}
				]
			};
		} catch (e) {
			// Collect detailed error info for logging
			const errorDetails: Record<string, any> = {};
			if (e && typeof e === 'object') {
				const err = e as any;
				errorDetails.message = err.message ?? '';
				errorDetails.stack = err.stack ?? '';
				errorDetails.code = err.code ?? '';
				errorDetails.data = err.data ?? '';
				errorDetails.response = err.response ?? '';
				errorDetails.toString = typeof err.toString === 'function' ? err.toString() : String(err);
				// Include all enumerable properties
				for (const key of Object.keys(err)) {
					if (!(key in errorDetails)) {
						errorDetails[key] = err[key];
					}
				}
			} else {
				errorDetails.raw = String(e);
			}
			logger.error(
				`Tool call failed for ${def.tool_name} (${def.method} ${def.endpoint})`,
				{ error: errorDetails, args }
			);
			return {
				content: [
					{
						type: 'text' as const,
						text:
							e instanceof Error
								? (e.message || e.toString())
								: String(e)
					}
				],
				isError: true
			};
		}
	};
}

export function getSwaggerMcpTools(apiClient: APIClient): MCPTool[] {
	const defs = loadSwaggerToolDefs();
	return defs.map(def => ({
		name: def.tool_name,
		description: def.description,
		inputSchema: def.input_schema,
		outputSchema: def.output_schema,
		handler: buildToolHandler(def, apiClient),
		tags: def.tags || []
	}));
}