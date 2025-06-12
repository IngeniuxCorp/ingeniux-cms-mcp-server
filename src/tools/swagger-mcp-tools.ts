// Auto-generated MCP tool loader for Swagger-based endpoints
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { APIClient } from '../api/api-client.js';
import { MCPTool } from '../types/mcp-types.js';

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
		const url = def.endpoint;
		let resp;
		try {
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
					resp = await apiClient.delete(url, args);
					break;
				case 'PATCH':
					resp = await apiClient.patch(url, args);
					break;
				default:
					throw new Error('Unsupported HTTP method: ' + method);
			}
			return resp.data;
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) };
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