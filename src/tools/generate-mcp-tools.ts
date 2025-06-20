// Merged Orchestrator + Generator: Generate MCP tool definitions from def/swagger.json (in-memory, no intermediate file)
// Each file < 500 lines, tabs only, robust error handling, no secrets

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { flattenAllOfSchema } from './tool-sync/allof-flattener.js';
import { enrichDescription } from './enrichment/description-enricher';
import { resolveRef } from './flattening/ref-resolver.js';

type SwaggerEndpoint = {
    method: string;
    path: string;
    operationId: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: any[];
    requestSchemas?: any[];
    responseSchemas?: any[];
};

type MCPToolDef = {
    tool_name: string;
    description: string;
    summary?: string;
    endpoint_description?: string;
    input_schema: any;
    output_schema: any;
    method: string;
    endpoint: string;
    tags?: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SWAGGER_PATH = path.resolve(__dirname, '../../def/swagger.json');
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
    const { name, type, required, in: paramIn, description } = param;
    if (paramIn !== 'body') {
        return {
            [name]: {
                type: type || 'string',
                required: !!required,
                in: paramIn || 'query',
                description: description || undefined
            }
        };
    }
    return {};
}

function buildInputSchema(endpoint: SwaggerEndpoint, swaggerDefs?: Record<string, any>) {
    const params = endpoint.parameters || [];
    const reqSchemas = endpoint.requestSchemas || [];
    const properties: any = {};
    const required: string[] = [];
    let hasBodyParam = false;
    let bodySchema: any = null;

    for (const p of params) {
        if (p.in === 'body' && (endpoint.method === 'post' || endpoint.method === 'put' || endpoint.method === 'POST' || endpoint.method === 'PUT')) {
            hasBodyParam = true;
            if (p.schema) {
                bodySchema = p.schema;
            }
            continue;
        }
        const sch = paramToSchema(p);
        Object.assign(properties, sch);
        if (p.required) required.push(p.name);
    }

    if (hasBodyParam && bodySchema) {
        if (bodySchema.allOf) {
            parseAllOf(bodySchema, properties, required);
        }
        if (bodySchema.$ref && swaggerDefs) {
            try {
                const resolved = resolveRef(bodySchema.$ref, swaggerDefs);
                if (resolved) {
                    if (resolved.properties) {
                        Object.assign(properties, resolved.properties);
                        if (Array.isArray(resolved.required)) {
                            for (const r of resolved.required) required.push(r);
                        }
                    }
                    else if (resolved.allOf) {
                        parseAllOf(resolved, properties, required);
                    }
                }
            } catch (e) {
                console.warn('Failed to resolve $ref:', bodySchema.$ref, e);
            }
        }
        if (bodySchema.properties) {
            Object.assign(properties, bodySchema.properties);
            if (Array.isArray(bodySchema.required)) {
                for (const r of bodySchema.required) required.push(r);
            }
        }
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
        required: required.length ? Array.from(new Set(required)) : undefined
    };
}

function parseAllOf(bodySchema: any, properties: any, required: string[]) {
    for (const sub of bodySchema.allOf) {
        if (sub.properties) {
            Object.assign(properties, sub.properties);
            if (Array.isArray(sub.required)) {
                for (const r of sub.required) required.push(r);
            }
        }
        else if (sub.$ref) {
            try {
                const resolved = resolveRef(sub.$ref, {});
                if (resolved && resolved.properties) {
                    Object.assign(properties, resolved.properties);
                    if (Array.isArray(resolved.required)) {
                        for (const r of resolved.required) required.push(r);
                    }
                }
            } catch (e) {
                console.warn('Failed to resolve $ref in allOf:', sub.$ref, e);
            }
        }
        else if (sub.allOf) {
            parseAllOf(sub, properties, required);
        }
    }
}

function buildOutputSchema(endpoint: SwaggerEndpoint) {
    const respSchemas = endpoint.responseSchemas || [];
    if (!respSchemas.length) return { type: 'object' };
    const main = respSchemas.find(r => r.code === '200') || respSchemas[0];
    if (main && main.schema) {
        if (main.description) {
            return {
                ...main.schema,
                description: main.description
            };
        }
        return main.schema;
    }
    return { type: 'object' };
}

function endpointToToolDef(endpoint: SwaggerEndpoint, swaggerDefs?: Record<string, any>): MCPToolDef {
    // const endpointPath = endpoint.path.substring("/api/v1".length);
    const endpointPath = endpoint.path;
    const toolDef: MCPToolDef = {
        tool_name: toToolName(endpoint.operationId),
        description: enrichDescription(endpoint),
        input_schema: flattenAllOfSchema(buildInputSchema(endpoint, swaggerDefs)),
        output_schema: flattenAllOfSchema(buildOutputSchema(endpoint)),
        method: endpoint.method,
        endpoint: endpointPath,
        tags: endpoint.tags ?? []
    };

    if (endpoint.summary) {
        toolDef.summary = endpoint.summary;
    }
    if (endpoint.description) {
        toolDef.endpoint_description = endpoint.description;
    }

    return toolDef;
}

// Convert OpenAPI (swagger.json) to array of endpoint objects
function convertSwaggerToStructuredData(swagger: any): SwaggerEndpoint[] {
    const endpoints: SwaggerEndpoint[] = [];
    for (const [path, pathObj] of Object.entries(swagger.paths || {})) {
        for (const [method, opRaw] of Object.entries(pathObj as any)) {
            const op = opRaw as any;
            if (!op || typeof op !== 'object') continue;
            endpoints.push({
                method,
                path,
                operationId: op.operationId,
                summary: op.summary,
                description: op.description,
                tags: op.tags,
                parameters: op.parameters,
                requestSchemas: op.requestBody ? [{
                    name: 'body',
                    in: 'body',
                    required: op.requestBody.required,
                    schema: op.requestBody.content?.['application/json']?.schema
                }] : [],
                responseSchemas: op.responses
                    ? Object.entries(op.responses).map(([code, resp]: any) => ({
                        code,
                        schema: resp?.content?.['application/json']?.schema,
                        description: resp?.description
                    }))
                    : []
            });
        }
    }
    return endpoints;
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
        if (!swagger || !swagger.paths) {
            console.error('Invalid def/swagger.json');
            return;
        }
        const swaggerDefs =
            swagger.definitions ||
            (swagger.components && swagger.components.schemas) ||
            {};
        const endpoints: SwaggerEndpoint[] = convertSwaggerToStructuredData(swagger);
        const toolDefs: MCPToolDef[] = [];
        for (const ep of endpoints) {
            if (!ep.operationId || !ep.method || !ep.path) continue;
            try {
                toolDefs.push(endpointToToolDef(ep, swaggerDefs));
            } catch (e) {
                console.error('Failed to process endpoint:', ep.operationId, e);
            }
        }
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