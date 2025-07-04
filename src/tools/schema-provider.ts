// Schema Provider Tool: Provides endpoint schemas and execution instructions based on LLM selection
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Use ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

type SchemaProviderArgs = {
	tool_name: string;
	method: string;
	endpoint_path: string;
};

type NormalizedSchema = {
	type: string;
	properties: Record<string, any>;
	required: string[];
	description: string;
	property_count: number;
	required_count: number;
	optional_count: number;
};

type ParameterDetail = {
	name: string;
	type?: string;
	description?: string;
	format?: string;
	example?: any;
};

type PathParameter = {
	name: string;
	placeholder: string;
	position: number;
};

type TypeAnalysis = {
	type_counts: Record<string, number>;
	complex_types: Array<{ name: string; type: string; schema: any }>;
	has_complex_types: boolean;
};

type MethodInfo = {
	description: string;
	uses_query_params: boolean;
	uses_body: boolean;
	idempotent: boolean;
};

type ParameterAnalysis = {
	total_parameters: number;
	required_parameters: ParameterDetail[];
	optional_parameters: ParameterDetail[];
	path_parameters: PathParameter[];
	type_analysis: TypeAnalysis;
	requires_body: boolean;
	method_info: MethodInfo;
};

type ParameterGuidance = {
	required: ParameterDetail[];
	optional: ParameterDetail[];
	path_params: { name: string; placeholder: string; description: string }[];
	body_structure: { type: string; properties: Record<string, any> } | null;
};

type ExecutionInstructions = {
	next_tool: string;
	overview: string;
	parameter_guidance: ParameterGuidance;
	example_call: any;
	validation_notes: string[];
	next_step_instruction: string;
};

type SchemaProviderResponse = {
	success: true;
	endpoint_info: {
		tool_name: string;
		method: string;
		endpoint_path: string;
		description: string;
	};
	input_schema: NormalizedSchema;
	output_schema: NormalizedSchema;
	parameter_info: ParameterAnalysis;
	execution_instructions: ExecutionInstructions;
};

type SchemaProviderErrorResponse = {
	success: false;
	error: string;
	message: string;
	suggestion?: string;
	validation_errors?: string[];
	suggestions?: any[];
	help?: string;
};

const GENERATED_DIR = path.resolve(__dirname, '../../mcp-tools-generated');
const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

// --- Helper functions ---
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

function validateSchemaInput(args: SchemaProviderArgs) {
	const errors: string[] = [];
	if (!args.tool_name || typeof args.tool_name !== 'string') {
		errors.push('tool_name is required and must be a string');
	}
	if (!args.method || !SUPPORTED_METHODS.includes(args.method.toUpperCase())) {
		errors.push(`method must be one of: ${SUPPORTED_METHODS.join(', ')}`);
	}
	if (!args.endpoint_path || typeof args.endpoint_path !== 'string') {
		errors.push('endpoint_path is required and must be a string');
	} else if (!args.endpoint_path.startsWith('/')) {
		errors.push("endpoint_path must start with '/'");
	}
	if (errors.length > 0) {
		throw { message: 'Input validation failed', details: errors };
	}
	return {
		tool_name: args.tool_name.trim(),
		method: args.method.toUpperCase(),
		endpoint_path: args.endpoint_path.trim()
	};
}

function findMatchingEndpoint(args: ReturnType<typeof validateSchemaInput>, allEndpoints: MCPToolDef[]): SchemaProviderErrorResponse {
	const toolNameMatches = allEndpoints.filter(e => e.tool_name === args.tool_name);
	const methodMatches = allEndpoints.filter(e => e.method.toUpperCase() === args.method);
	const pathMatches = allEndpoints.filter(e => e.endpoint === args.endpoint_path);
	const suggestions: any[] = [];
	if (toolNameMatches.length > 0) {
		suggestions.push({
			type: 'tool_name_match',
			message: 'Found endpoints with same tool name but different method/path:',
			endpoints: toolNameMatches.slice(0, 3).map(formatSuggestion)
		});
	}
	if (methodMatches.length > 0) {
		suggestions.push({
			type: 'method_match',
			message: 'Found endpoints with same method but different tool/path:',
			endpoints: methodMatches.slice(0, 3).map(formatSuggestion)
		});
	}
	if (pathMatches.length > 0) {
		suggestions.push({
			type: 'path_match',
			message: 'Found endpoints with same path but different tool/method:',
			endpoints: pathMatches.slice(0, 3).map(formatSuggestion)
		});
	}
	return {
		success: false,
		error: 'Endpoint not found',
		message: `No endpoint found matching: ${args.method} ${args.endpoint_path} (${args.tool_name})`,
		suggestions,
		help: 'Use cms_endpoint_lister to see all available endpoints'
	};
}

function formatSuggestion(endpoint: MCPToolDef) {
	return {
		tool_name: endpoint.tool_name,
		method: endpoint.method,
		endpoint_path: endpoint.endpoint,
		description: endpoint.description
	};
}

function extractSchemas(endpoint: MCPToolDef) {
	const inputSchema = endpoint.input_schema || { type: 'object', properties: {} };
	const outputSchema = endpoint.output_schema || { type: 'object' };
	const normalizedInput = normalizeSchema(inputSchema);
	const normalizedOutput = normalizeSchema(outputSchema);
	return { input: normalizedInput, output: normalizedOutput };
}

function normalizeSchema(schema: any): NormalizedSchema {
	if (!schema || typeof schema !== 'object') {
		return { type: 'object', properties: {}, required: [], description: '', property_count: 0, required_count: 0, optional_count: 0 };
	}
	const norm = {
		type: schema.type || 'object',
		properties: schema.properties || {},
		required: schema.required || [],
		description: schema.description || ''
	};
	const property_count = Object.keys(norm.properties).length;
	const required_count = norm.required.length;
	const optional_count = property_count - required_count;
	return { ...norm, property_count, required_count, optional_count };
}

function extractPathParameters(endpointPath: string): PathParameter[] {
	const pathParams: PathParameter[] = [];
	const matches = endpointPath.match(/\{([^}]+)\}/g);
	if (matches) {
		for (const match of matches) {
			const paramName = match.slice(1, -1);
			pathParams.push({
				name: paramName,
				placeholder: match,
				position: endpointPath.indexOf(match)
			});
		}
	}
	return pathParams;
}

function analyzeParameterTypes(properties: Record<string, any>): TypeAnalysis {
	const typeCounts: Record<string, number> = {};
	const complexTypes: Array<{ name: string; type: string; schema: any }> = [];
	for (const [name, schema] of Object.entries(properties)) {
		const type = schema.type || 'unknown';
		typeCounts[type] = (typeCounts[type] || 0) + 1;
		if (type === 'object' || type === 'array') {
			complexTypes.push({ name, type, schema });
		}
	}
	return {
		type_counts: typeCounts,
		complex_types: complexTypes,
		has_complex_types: complexTypes.length > 0
	};
}

function getMethodInfo(method: string): MethodInfo {
	const details: Record<string, MethodInfo> = {
		'GET': { description: 'Retrieve data', uses_query_params: true, uses_body: false, idempotent: true },
		'POST': { description: 'Create new resource', uses_query_params: false, uses_body: true, idempotent: false },
		'PUT': { description: 'Update/replace resource', uses_query_params: false, uses_body: true, idempotent: true },
		'DELETE': { description: 'Remove resource', uses_query_params: true, uses_body: false, idempotent: true },
		'PATCH': { description: 'Partially update resource', uses_query_params: false, uses_body: true, idempotent: false }
	};
	return details[method] || { description: 'Unknown method', uses_query_params: false, uses_body: false, idempotent: false };
}

function analyzeParameters(endpoint: MCPToolDef): ParameterAnalysis {
	const inputSchema = endpoint.input_schema || {};
	const properties = inputSchema.properties || {};
	const required = inputSchema.required || [];
	const pathParams = extractPathParameters(endpoint.endpoint);
	const requiredParams = required.map((name: string) => ({ name, ...(properties[name] || {}) }));
	const optionalParams = Object.keys(properties)
		.filter(name => !required.includes(name))
		.map(name => ({ name, ...(properties[name] || {}) }));
	const typeAnalysis = analyzeParameterTypes(properties);
	return {
		total_parameters: Object.keys(properties).length,
		required_parameters: requiredParams,
		optional_parameters: optionalParams,
		path_parameters: pathParams,
		type_analysis: typeAnalysis,
		requires_body: ['POST', 'PUT', 'PATCH'].includes(endpoint.method),
		method_info: getMethodInfo(endpoint.method)
	};
}

function generateParamExample(param: any) {
	const type = param.type || 'string';
	if (type === 'string') {
		if (param.format === 'date') return '2024-01-15';
		if (param.format === 'email') return 'user@example.com';
		return param.example || 'example_value';
	}
	if (type === 'number' || type === 'integer') return param.example || 42;
	if (type === 'boolean') return param.example || true;
	if (type === 'array') return param.example || ['item1', 'item2'];
	if (type === 'object') return param.example || {};
	return 'value';
}

function generateParameterGuidance(paramInfo: ParameterAnalysis): ParameterGuidance {
	const guidance: ParameterGuidance = {
		required: [],
		optional: [],
		path_params: [],
		body_structure: null
	};
	for (const param of paramInfo.required_parameters) {
		guidance.required.push({
			name: param.name,
			type: param.type || 'string',
			description: param.description || 'No description provided',
			format: param.format || '',
			example: generateParamExample(param)
		});
	}
	for (const param of paramInfo.optional_parameters) {
		guidance.optional.push({
			name: param.name,
			type: param.type || 'string',
			description: param.description || 'No description provided',
			format: param.format || '',
			example: generateParamExample(param)
		});
	}
	for (const pathParam of paramInfo.path_parameters) {
		guidance.path_params.push({
			name: pathParam.name,
			placeholder: pathParam.placeholder,
			description: `Path parameter: ${pathParam.name}`
		});
	}
	if (paramInfo.requires_body) {
		guidance.body_structure = { type: 'object', properties: {} };
	}
	return guidance;
}

function generateExecutionInstructions(endpoint: MCPToolDef, paramInfo: ParameterAnalysis): ExecutionInstructions {
	const overview = `Execute ${endpoint.method} request to ${endpoint.endpoint}. ${endpoint.description}. Method: ${paramInfo.method_info.description}. Requires body: ${paramInfo.requires_body ? 'Yes' : 'No'}. Total parameters: ${paramInfo.total_parameters}. Required: ${paramInfo.required_parameters.length}`;
	
	const exampleData: Record<string, any> = {};
	for (const param of paramInfo.required_parameters) {
		exampleData[param.name] = generateParamExample(param);
	}
	if (paramInfo.optional_parameters.length > 0) {
		const firstOptional = paramInfo.optional_parameters[0];
		exampleData[firstOptional.name] = generateParamExample(firstOptional);
	}
	
	const validationNotes: string[] = [];
	if (paramInfo.path_parameters.length > 0) {
		validationNotes.push('Path parameters will be automatically interpolated into the URL');
	}
	if (paramInfo.requires_body) {
		validationNotes.push('Body parameters will be sent as JSON in the request body');
	} else {
		validationNotes.push('Parameters will be sent as query parameters');
	}
	if (paramInfo.type_analysis.has_complex_types) {
		validationNotes.push('This endpoint has complex object/array parameters - review the schema carefully');
	}
	if (paramInfo.required_parameters.length > 0) {
		validationNotes.push(`${paramInfo.required_parameters.length} parameters are required for this endpoint`);
	}

	return {
		next_tool: 'cms_endpoint_executor',
		overview,
		parameter_guidance: generateParameterGuidance(paramInfo),
		example_call: {
			tool_name: 'cms_endpoint_executor',
			parameters: {
				endpoint_path: endpoint.endpoint,
				method: endpoint.method,
				request_data: exampleData
			},
			description: `Example call to execute ${endpoint.method} ${endpoint.endpoint}`
		},
		validation_notes: validationNotes,
		next_step_instruction: `To execute this endpoint, call the 'cms_endpoint_executor' tool with: { "endpoint_path": "${endpoint.endpoint}", "method": "${endpoint.method}", "request_data": { /* fill with required and optional parameters as shown above */ } }. This will perform the actual API call using the provided schemas and parameter guidance.`
	};
}

// Main handler (must be exported)
export async function provideSchema(args: SchemaProviderArgs): Promise<SchemaProviderResponse | SchemaProviderErrorResponse> {
	try {
		const validatedArgs = validateSchemaInput(args);
		const allEndpoints = loadSwaggerToolDefs();
		const endpoint = allEndpoints.find(e =>
			e.tool_name === validatedArgs.tool_name &&
			e.method.toUpperCase() === validatedArgs.method &&
			e.endpoint === validatedArgs.endpoint_path
		);
		if (!endpoint) {
			return findMatchingEndpoint(validatedArgs, allEndpoints);
		}
		const schemas = extractSchemas(endpoint);
		const paramInfo = analyzeParameters(endpoint);
		const executionInstructions = generateExecutionInstructions(endpoint, paramInfo);
		return {
			success: true,
			endpoint_info: {
				tool_name: endpoint.tool_name,
				method: endpoint.method,
				endpoint_path: endpoint.endpoint,
				description: endpoint.description
			},
			input_schema: schemas.input,
			output_schema: schemas.output,
			parameter_info: paramInfo,
			execution_instructions: executionInstructions
		};
	} catch (error: any) {
		if (error.details) {
			return {
				success: false,
				error: 'Invalid input',
				message: error.message,
				validation_errors: error.details,
				suggestion: 'Please check the required parameters and try again'
			};
		}
		if (error.suggestions) {
			return {
				success: false,
				error: 'Endpoint not found',
				message: error.message,
				suggestions: error.suggestions,
				help: 'Use cms_endpoint_lister to see all available endpoints'
			};
		}
		console.error('Schema provider error', error);
		return {
			success: false,
			error: 'Schema retrieval failed',
			message: 'Unable to retrieve endpoint schema and instructions',
			suggestion: 'Please verify the endpoint details and try again'
		};
	}
}