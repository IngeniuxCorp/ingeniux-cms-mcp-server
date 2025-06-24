// Endpoint Executor Tool: Executes validated API calls with resolved endpoint paths
import * as fs from 'fs';
import * as path from 'path';
import { APIClient } from '../api/api-client.js';
import { logger } from '../utils/logger.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types for endpoint definitions and responses
type MCPToolDef = {
    tool_name: string;
    description: string;
    input_schema: any;
    output_schema: any;
    method: string;
    endpoint: string;
    tags?: string[];
};

type EndpointExecutorArgs = {
    endpoint_path: string;
    method: string;
    request_data?: Record<string, any>;
    validation_required?: boolean;
};

type EndpointExecutorResponse = {
    content: Array<{ type: 'text'; text: string }>;
    metadata?: object;
    isError?: boolean;
};

const GENERATED_DIR = path.resolve(__dirname, '../../mcp-tools-generated');
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

function loadSwaggerToolDefs(): MCPToolDef[] {
    try {
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
    } catch (e) {
        console.error('Failed to read generated dir:', e);
        return [];
    }
}

function isValidEndpointPath(path: string) {
    if (!path.startsWith('/')) return false;
    const invalidChars = ['<', '>', '"', '|', '?', '*'];
    for (const char of invalidChars) {
        if (path.includes(char)) return false;
    }
    return true;
}

function extractPathParameterNames(endpointPath: string): string[] {
    const matches = endpointPath.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1, -1));
}

function interpolatePathParameters(endpointPath: string, pathParams: Record<string, any>) {
    let url = endpointPath;
    for (const [paramName, paramValue] of Object.entries(pathParams)) {
        const placeholder = `{${paramName}}`;
        if (url.includes(placeholder)) {
            url = url.replace(placeholder, encodeURIComponent(String(paramValue)));
        }
    }
    const unresolved = url.match(/\{[^}]+\}/g);
    if (unresolved) {
        throw new Error(`Unresolved path parameters: ${unresolved.map(p => p.slice(1, -1)).join(', ')}`);
    }
    return url;
}

function separateParameterTypes(validatedData: Record<string, any>, endpoint: MCPToolDef) {
    const pathParams: Record<string, any> = {};
    const queryParams: Record<string, any> = {};
    const bodyData: Record<string, any> = {};
    const pathParamNames = extractPathParameterNames(endpoint.endpoint);
    for (const [paramName, paramValue] of Object.entries(validatedData)) {
        if (pathParamNames.includes(paramName)) {
            pathParams[paramName] = paramValue;
        } else if (['GET', 'DELETE', "PATCH"].includes(endpoint.method.trim().toUpperCase())) {
            queryParams[paramName] = paramValue;
        } else {
            bodyData[paramName] = paramValue;
        }
    }
    return { pathParams, queryParams, bodyData };
}

function validateExecutorInput(args: EndpointExecutorArgs) {
    const errors: string[] = [];
    if (!args.endpoint_path || !isValidEndpointPath(args.endpoint_path)) {
        errors.push('Invalid or missing endpoint_path');
    }
    if (!args.method || !SUPPORTED_METHODS.includes(args.method.toUpperCase())) {
        errors.push('Invalid or missing HTTP method');
    }
    if (args.request_data && typeof args.request_data !== 'object') {
        errors.push('request_data must be a valid object');
    }
    if (errors.length > 0) {
        throw new Error(errors.join('; '));
    }
    return {
        endpoint_path: args.endpoint_path.trim(),
        method: args.method.toUpperCase(),
        request_data: args.request_data || {},
        validation_required: args.validation_required !== false
    };
}

function resolveEndpointDefinition(path: string, method: string, allEndpoints: MCPToolDef[]) {
    const match = allEndpoints.find(e =>
        e.endpoint === path && e.method.toUpperCase() === method
    );
    if (!match) {
        throw new Error(`No endpoint found for ${method} ${path}`);
    }
    return match;
}

function validateRequestParameters(requestData: Record<string, any>, endpoint: MCPToolDef) {
    const inputSchema = endpoint.input_schema;
    const required = inputSchema?.required || [];
    const missingRequired: string[] = [];
    for (const req of required) {
        if (!Object.prototype.hasOwnProperty.call(requestData, req)) {
            missingRequired.push(req);
        }
    }
    if (missingRequired.length > 0) {
        throw new Error(`Missing required parameters: ${missingRequired.join(', ')}`);
    }
    // Type validation can be added here if needed
    return requestData;
}

export async function executeEndpoint(
    args: EndpointExecutorArgs,
    apiClient: APIClient
): Promise<EndpointExecutorResponse> {
    try {
        const validatedArgs = validateExecutorInput(args);
        const allEndpoints = loadSwaggerToolDefs();
        const endpoint = resolveEndpointDefinition(validatedArgs.endpoint_path, validatedArgs.method, allEndpoints);
        const params = validatedArgs.validation_required
            ? validateRequestParameters(validatedArgs.request_data, endpoint)
            : validatedArgs.request_data;
        const { pathParams, queryParams, bodyData } = separateParameterTypes(params, endpoint);
        const url = interpolatePathParameters(endpoint.endpoint, pathParams);

        logger?.info?.('Executing endpoint', {
            url: url,
            method: endpoint.method,
            queryParams: queryParams,
            bodyData: bodyData,
            endpoint: endpoint.tool_name
        });

        let resp: any;
        switch (endpoint.method.trim().toUpperCase()) {
            case 'GET':
                resp = await apiClient.get(url, queryParams);
                break;
            case 'POST':
                resp = await apiClient.post(url, bodyData && Object.keys(bodyData).length > 0 ? bodyData : undefined, { params: queryParams });
                break;
            case 'PUT':
                resp = await apiClient.put(url, bodyData && Object.keys(bodyData).length > 0 ? bodyData : undefined, { params: queryParams });
                break;
            case 'DELETE':
                resp = await apiClient.request({ method: 'DELETE', url, params: queryParams });
                break;
            case 'PATCH':
                resp = await apiClient.request({ method: 'PATCH', url, data: bodyData, params: queryParams });
                break;
            default:
                throw new Error('Unsupported HTTP method: ' + endpoint.method);
        }
        const responseText = typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2);
        return {
            content: [
                {
                    type: 'text',
                    text: responseText
                }
            ],
            metadata: {
                endpoint: endpoint.endpoint,
                method: endpoint.method,
                timestamp: new Date().toISOString(),
                success: true
            }
        };
    } catch (error: any) {
        logger?.error?.('Endpoint execution failed', { error, args });
        return {
            content: [
                {
                    type: 'text',
                    text: `Execution failed: ${error?.message || String(error)}`
                }
            ],
            isError: true,
            metadata: { errorType: 'generic', error }
        };
    }
}