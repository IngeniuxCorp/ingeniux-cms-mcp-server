// Endpoint Lister Tool: Lists available CMS endpoints for LLM selection
import * as fs from 'fs';
import * as path from 'path';

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

type EndpointListerArgs = {
	category_filter?: string;
	method_filter?: string;
	search_term?: string;
	include_details?: boolean;
};

type FormattedEndpoint = {
	tool_name: string;
	method: string;
	endpoint: string;
	description: string;
	tags?: string[];
	has_path_params?: boolean;
	requires_body?: boolean;
	parameter_count?: number;
};

type EndpointListingResponse = {
	success: true;
	total_endpoints: number;
	categories: string[];
	endpoints: Record<string, FormattedEndpoint[]>;
	instructions: string;
	next_step_instruction: string;
};

type EndpointListerErrorResponse = {
	success: false;
	error: string;
	message: string;
	available_filters?: {
		methods: string[];
		categories: string[];
	};
	suggestion?: string;
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

function validateListerInput(args: EndpointListerArgs) {
	const validated = {
		category_filter: args.category_filter?.trim() || null,
		method_filter: args.method_filter?.toUpperCase() || null,
		search_term: args.search_term?.trim().toLowerCase() || null,
		include_details: args.include_details === true
	};
	if (validated.method_filter && !SUPPORTED_METHODS.includes(validated.method_filter)) {
		throw new Error(`Invalid method filter: ${args.method_filter}`);
	}
	if (validated.search_term && validated.search_term.length < 2) {
		throw new Error('Search term must be at least 2 characters');
	}
	return validated;
}

function applyFilters(endpoints: MCPToolDef[], filters: ReturnType<typeof validateListerInput>) {
	let filtered = [...endpoints];
	if (filters.method_filter) {
		filtered = filtered.filter(e => e.method.toUpperCase() === filters.method_filter);
	}
	if (filters.category_filter) {
		filtered = filtered.filter(e =>
			e.tags && e.tags.some(tag =>
				tag.toLowerCase().includes(filters.category_filter!.toLowerCase())
			)
		);
	}
	if (filters.search_term) {
		filtered = filtered.filter(e =>
			e.tool_name.toLowerCase().includes(filters.search_term!) ||
			e.description.toLowerCase().includes(filters.search_term!) ||
			e.endpoint.toLowerCase().includes(filters.search_term!)
		);
	}
	return filtered.sort((a, b) => {
		const methodOrder = SUPPORTED_METHODS;
		const methodComp = methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method);
		if (methodComp !== 0) return methodComp;
		return a.endpoint.localeCompare(b.endpoint);
	});
}

function determinePrimaryCategory(endpoint: MCPToolDef): string {
	if (endpoint.tags && endpoint.tags.length > 0) {
		return endpoint.tags[0].toLowerCase();
	}
	const segs = endpoint.endpoint.split('/').filter(Boolean);
	if (segs.length > 0) {
		const first = segs[0].toLowerCase();
		const map: Record<string, string> = {
			'pages': 'content',
			'assets': 'media',
			'users': 'user-management',
			'workflows': 'workflow',
			'schemas': 'schema',
			'site': 'site-management'
		};
		return map[first] || first;
	}
	return 'general';
}

function categorizeEndpoints(endpoints: MCPToolDef[]) {
	const categories: Record<string, MCPToolDef[]> = {};
	for (const e of endpoints) {
		const cat = determinePrimaryCategory(e);
		if (!categories[cat]) categories[cat] = [];
		categories[cat].push(e);
	}
	return categories;
}

function hasPathParameters(endpointPath: string) {
	return endpointPath.includes('{') && endpointPath.includes('}');
}

function countParameters(inputSchema: any) {
	if (!inputSchema || !inputSchema.properties) return 0;
	return Object.keys(inputSchema.properties).length;
}

function formatSingleEndpoint(endpoint: MCPToolDef, includeDetails: boolean): FormattedEndpoint {
	const basic = {
		tool_name: endpoint.tool_name,
		method: endpoint.method,
		endpoint: endpoint.endpoint,
		description: endpoint.description
	};
	if (!includeDetails) return basic;
	return {
		...basic,
		tags: endpoint.tags || [],
		has_path_params: hasPathParameters(endpoint.endpoint),
		requires_body: ['POST', 'PUT', 'PATCH'].includes(endpoint.method),
		parameter_count: countParameters(endpoint.input_schema)
	};
}

function formatEndpointListing(categorized: Record<string, MCPToolDef[]>, includeDetails: boolean) {
	const formatted: Record<string, FormattedEndpoint[]> = {};
	for (const [cat, endpoints] of Object.entries(categorized)) {
		formatted[cat] = endpoints.map(e => formatSingleEndpoint(e, includeDetails));
	}
	return formatted;
}

function generateLLMSelectionInstructions() {
	return `
Available CMS endpoints are organized by category. To proceed:

1. Review the endpoint listing above
2. Select the most appropriate endpoint for your task
3. Use the 'cms_schema_provider' tool with the selected endpoint details:
   - tool_name: exact tool name from the listing
   - method: HTTP method (GET, POST, PUT, DELETE, PATCH)
   - endpoint_path: the endpoint path

Example:
Use cms_schema_provider with:
{
  "tool_name": "get_page_by_id",
  "method": "GET", 
  "endpoint_path": "/api/pages/{id}"
}

The schema provider will then give you the input/output schemas and execution instructions.
	`.trim();
}

function generateNextStepInstruction() {
	return `
To proceed, call the 'cms_schema_provider' tool with the selected endpoint's tool_name, method, and endpoint_path as shown above. This will provide you with the input/output schemas and instructions for execution.
	`.trim();
}

function getAvailableCategories() {
	try {
		const all = loadSwaggerToolDefs();
		const cats = new Set<string>();
		for (const e of all) {
			cats.add(determinePrimaryCategory(e));
		}
		return Array.from(cats).sort();
	} catch {
		return [];
	}
}

// Main handler (must be exported)
export async function listEndpoints(args: EndpointListerArgs): Promise<EndpointListingResponse | EndpointListerErrorResponse> {
	try {
		const validatedArgs = validateListerInput(args);
		const allEndpoints = loadSwaggerToolDefs();
		const filteredEndpoints = applyFilters(allEndpoints, validatedArgs);
		const categorized = categorizeEndpoints(filteredEndpoints);
		const formatted = formatEndpointListing(categorized, validatedArgs.include_details);
		return {
			success: true,
			total_endpoints: filteredEndpoints.length,
			categories: Object.keys(categorized),
			endpoints: formatted,
			instructions: generateLLMSelectionInstructions(),
			next_step_instruction: generateNextStepInstruction()
		};
	} catch (error: any) {
		return {
			success: false,
			error: 'Listing failed',
			message: error?.message || 'Unable to generate endpoint listing',
			available_filters: {
				methods: SUPPORTED_METHODS,
				categories: getAvailableCategories()
			},
			suggestion: 'Please check your filters or try again.'
		};
	}
}