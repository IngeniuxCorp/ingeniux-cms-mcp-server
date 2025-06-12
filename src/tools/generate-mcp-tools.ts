// Script to auto-generate MCP tool definitions from swagger-structured-data.json
// Each file < 500 lines, tabs only, robust error handling, no secrets

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

type SwaggerEndpoint = {
	method: string;
	path: string;
	operationId: string;
	tags?: string[];
	parameters?: any[];
	requestSchemas?: any[];
	responseSchemas?: any[];
};

type MCPToolDef = {
	tool_name: string;
	description: string;
	input_schema: any;
	output_schema: any;
	method: string;
	endpoint: string;
	tags?: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SWAGGER_PATH = path.resolve(__dirname, '../../swagger-structured-data.json');
const OUT_DIR = path.resolve(__dirname, '../../mcp-tools-generated');

function safeReadJSON(filePath: string): any | null {
	try {
		const raw = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(raw);
	} catch (e) {
		console.error('Failed to read or parse JSON:', filePath, e);
		return null;
	}
}

function ensureDir(dir: string) {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function toToolName(operationId: string) {
	return operationId.replace(/[^a-zA-Z0-9_]/g, '_');
}

function paramToSchema(param: any) {
	if (!param) return {};
	const { name, type, required, in: paramIn, schema } = param;
	if (schema) return { [name]: schema };
	return {
		[name]: {
			type: type || 'string',
			required: !!required,
			in: paramIn || 'query'
		}
	};
}

function buildInputSchema(endpoint: SwaggerEndpoint) {
	const params = endpoint.parameters || [];
	const reqSchemas = endpoint.requestSchemas || [];
	const properties: any = {};
	const required: string[] = [];
	for (const p of params) {
		const sch = paramToSchema(p);
		Object.assign(properties, sch);
		if (p.required) required.push(p.name);
	}
	for (const s of reqSchemas) {
		if (s.name && s.schema) {
			properties[s.name] = s.schema;
			if (s.required) required.push(s.name);
		}
	}
	return {
		type: 'object',
		properties,
		required: required.length ? required : undefined
	};
}

function buildOutputSchema(endpoint: SwaggerEndpoint) {
	const respSchemas = endpoint.responseSchemas || [];
	if (!respSchemas.length) return { type: 'object' };
	const main = respSchemas.find(r => r.code === '200') || respSchemas[0];
	return main && main.schema ? main.schema : { type: 'object' };
}

function endpointToToolDef(endpoint: SwaggerEndpoint): MCPToolDef {
	return {
		tool_name: toToolName(endpoint.operationId),
		description: `${endpoint.method} ${endpoint.path}`,
		input_schema: buildInputSchema(endpoint),
		output_schema: buildOutputSchema(endpoint),
		method: endpoint.method,
		endpoint: endpoint.path,
		tags: endpoint.tags ?? []
	};
}

function splitChunks<T>(arr: T[], maxPerChunk: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < arr.length; i += maxPerChunk) {
		out.push(arr.slice(i, i + maxPerChunk));
	}
	return out;
}

function main() {
	try {
		ensureDir(OUT_DIR);
		const swagger = safeReadJSON(SWAGGER_PATH);
		if (!swagger || !Array.isArray(swagger.endpoints)) {
			console.error('Invalid swagger-structured-data.json');
			return;
		}
		const endpoints: SwaggerEndpoint[] = swagger.endpoints;
		const toolDefs: MCPToolDef[] = [];
		for (const ep of endpoints) {
			if (!ep.operationId || !ep.method || !ep.path) continue;
			try {
				toolDefs.push(endpointToToolDef(ep));
			} catch (e) {
				console.error('Failed to process endpoint:', ep.operationId, e);
			}
		}
		// Split into files < 500 lines (estimate 20 tools per file)
		const chunkSize = 20;
		const chunks = splitChunks(toolDefs, chunkSize);
		chunks.forEach((chunk, idx) => {
			const outPath = path.join(OUT_DIR, `tools-${idx + 1}.json`);
			fs.writeFileSync(outPath, JSON.stringify(chunk, null, '\t'));
		});
		console.log(`Generated ${chunks.length} tool definition files in ${OUT_DIR}`);
	} catch (e) {
		console.error('Fatal error:', e);
	}
}

main();