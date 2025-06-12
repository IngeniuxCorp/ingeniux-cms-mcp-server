/**
 * Simple Node.js script to analyze Swagger 2.0/OpenAPI specification
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

/**
 * Fetch JSON from URL
 */
function fetchJson(url) {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https:') ? https : http;
		
		const req = client.get(url, {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Ingeniux-CMS-MCP-Server/1.0.0'
			},
			timeout: 30000
		}, (res) => {
			let data = '';
			
			res.on('data', (chunk) => {
				data += chunk;
			});
			
			res.on('end', () => {
				try {
					if (res.statusCode !== 200) {
						reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
						return;
					}
					
					const json = JSON.parse(data);
					resolve(json);
				} catch (error) {
					reject(new Error(`Failed to parse JSON: ${error.message}`));
				}
			});
		});
		
		req.on('error', (error) => {
			reject(new Error(`Network error: ${error.message}`));
		});
		
		req.on('timeout', () => {
			req.destroy();
			reject(new Error('Request timeout'));
		});
	});
}

/**
 * Analyze Swagger 2.0/OpenAPI specification
 */
function analyzeSwagger(spec) {
	console.log('Analyzing Swagger specification...');
	console.log('- Format:', spec.swagger ? `Swagger ${spec.swagger}` : 'Unknown');
	console.log('- API Version:', spec.info?.version || 'Unknown');
	console.log('- Base Path:', spec.basePath || '/');
	console.log('- Paths:', spec.paths ? `${Object.keys(spec.paths).length} endpoints` : 'None');
	
	if (!spec || typeof spec !== 'object') {
		throw new Error('Invalid specification format - not an object');
	}
	
	// Handle Swagger 2.0/OpenAPI format
	if (!spec.paths) {
		throw new Error('Invalid Swagger specification format - no paths found');
	}

	const endpoints = [];
	const endpointsByMethod = {};
	let authenticationRequired = false;

	// Check for security definitions
	if (spec.securityDefinitions && Object.keys(spec.securityDefinitions).length > 0) {
		authenticationRequired = true;
	}

	// Process each path
	for (const [path, pathItem] of Object.entries(spec.paths)) {
		if (!pathItem || typeof pathItem !== 'object') {
			continue;
		}

		// Process each HTTP method
		const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
		for (const method of methods) {
			const operation = pathItem[method];
			if (!operation) {
				continue;
			}

			const httpMethod = method.toUpperCase();
			
			// Build full path with api/v1 prefix
			let fullPath = path;
			if (!fullPath.startsWith('/api/v1/')) {
				// Ensure path starts with /api/v1/
				fullPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
				fullPath = `/api/v1${fullPath}`;
			}

			// Count methods
			endpointsByMethod[httpMethod] = (endpointsByMethod[httpMethod] || 0) + 1;

			// Check for operation-level security
			if (operation.security && operation.security.length > 0) {
				authenticationRequired = true;
			}

			// Extract parameters
			const parameters = operation.parameters || [];

			// Extract responses
			const responses = [];
			if (operation.responses) {
				for (const [code, response] of Object.entries(operation.responses)) {
					responses.push({
						code: parseInt(code) || code,
						message: response.description || 'No description'
					});
				}
			}

			endpoints.push({
				path: path,
				method: httpMethod,
				fullPath,
				summary: operation.summary,
				description: operation.description,
				operationId: operation.operationId,
				tags: operation.tags || [],
				parameters: parameters.map(param => ({
					name: param.name,
					in: param.in,
					required: param.required || false,
					type: param.type || param.schema?.type || 'unknown',
					description: param.description
				})),
				responses
			});
		}
	}

	// Build base URL with api/v1 path
	let baseUrl = spec.basePath || '';
	if (!baseUrl.includes('/api/v1')) {
		baseUrl = baseUrl.replace(/\/$/, '') + '/api/v1';
	}

	// Extract security schemes
	const securitySchemes = spec.securityDefinitions ? Object.keys(spec.securityDefinitions) : [];

	return {
		totalEndpoints: endpoints.length,
		endpointsByMethod,
		endpoints,
		authenticationRequired,
		baseUrl,
		apiVersion: spec.info?.version || '1.0.0',
		title: spec.info?.title || 'API',
		description: spec.info?.description,
		securitySchemes
	};
}

/**
 * Generate analysis report
 */
function generateReport(analysis) {
	const lines = [];
	
	lines.push('# Swagger API Analysis Report');
	lines.push('');
	lines.push(`**API Title:** ${analysis.title}`);
	lines.push(`**API Version:** ${analysis.apiVersion}`);
	lines.push(`**Base URL:** ${analysis.baseUrl}`);
	lines.push(`**Total Endpoints:** ${analysis.totalEndpoints}`);
	lines.push(`**Authentication Required:** ${analysis.authenticationRequired ? 'Yes' : 'No'}`);
	if (analysis.securitySchemes.length > 0) {
		lines.push(`**Security Schemes:** ${analysis.securitySchemes.join(', ')}`);
	}
	if (analysis.description) {
		lines.push(`**Description:** ${analysis.description}`);
	}
	lines.push('');

	// Methods summary
	lines.push('## Endpoints by HTTP Method');
	lines.push('');
	for (const [method, count] of Object.entries(analysis.endpointsByMethod)) {
		lines.push(`- **${method}:** ${count} endpoints`);
	}
	lines.push('');

	// Group endpoints by tags
	const endpointsByTag = {};
	for (const endpoint of analysis.endpoints) {
		const tags = endpoint.tags.length > 0 ? endpoint.tags : ['Untagged'];
		for (const tag of tags) {
			if (!endpointsByTag[tag]) {
				endpointsByTag[tag] = [];
			}
			endpointsByTag[tag].push(endpoint);
		}
	}

	// Detailed endpoints by tag
	lines.push('## Endpoints by Category');
	lines.push('');
	
	for (const [tag, endpoints] of Object.entries(endpointsByTag)) {
		lines.push(`### ${tag}`);
		lines.push('');
		
		for (const endpoint of endpoints) {
			lines.push(`**${endpoint.method} ${endpoint.fullPath}**`);
			if (endpoint.operationId) {
				lines.push(`- Operation ID: ${endpoint.operationId}`);
			}
			if (endpoint.summary) {
				lines.push(`- Summary: ${endpoint.summary}`);
			}
			if (endpoint.description) {
				lines.push(`- Description: ${endpoint.description}`);
			}
			
			if (endpoint.parameters.length > 0) {
				lines.push('- Parameters:');
				for (const param of endpoint.parameters) {
					const required = param.required ? ' (required)' : ' (optional)';
					lines.push(`  - **${param.name}** (${param.in}): ${param.type}${required}`);
					if (param.description) {
						lines.push(`    - ${param.description}`);
					}
				}
			}
			
			if (endpoint.responses.length > 0) {
				lines.push('- Responses:');
				for (const response of endpoint.responses) {
					lines.push(`  - **${response.code}**: ${response.message}`);
				}
			}
			
			lines.push('');
		}
	}

	return lines.join('\n');
}

/**
 * Main execution function
 */
async function main() {
	try {
		const swaggerUrl = 'http://localhost/cxp4/swagger/v1/swagger.json';
		
		console.log('Starting Swagger API analysis...');
		console.log(`Fetching from: ${swaggerUrl}`);
		
		const spec = await fetchJson(swaggerUrl);
		const analysis = analyzeSwagger(spec);
		
		console.log('\n=== ANALYSIS COMPLETE ===');
		console.log(`API Title: ${analysis.title}`);
		console.log(`Total Endpoints: ${analysis.totalEndpoints}`);
		console.log(`Base URL: ${analysis.baseUrl}`);
		console.log(`API Version: ${analysis.apiVersion}`);
		console.log(`Authentication Required: ${analysis.authenticationRequired}`);
		if (analysis.securitySchemes.length > 0) {
			console.log(`Security Schemes: ${analysis.securitySchemes.join(', ')}`);
		}
		
		console.log('\nEndpoints by Method:');
		for (const [method, count] of Object.entries(analysis.endpointsByMethod)) {
			console.log(`  ${method}: ${count}`);
		}

		// Generate detailed report
		const report = generateReport(analysis);
		
		// Write report to file
		fs.writeFileSync('swagger-analysis-report.md', report, 'utf8');
		console.log('\nDetailed report saved to: swagger-analysis-report.md');
		
		// Also output structured data for tool generation
		// --- Begin: Schema Extraction Utilities ---
		function resolveRef(ref, spec, seenRefs = new Set()) {
			if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) return null;
			if (seenRefs.has(ref)) return { $ref: ref, circular: true };
			seenRefs.add(ref);
			const parts = ref.replace(/^#\//, '').split('/');
			let obj = spec;
			for (const part of parts) {
				if (obj && typeof obj === 'object') obj = obj[part];
				else return null;
			}
			if (!obj) return null;
			if (obj.$ref) return resolveRef(obj.$ref, spec, seenRefs);
			if (typeof obj === 'object') return resolveSchema(obj, spec, seenRefs);
			return obj;
		}

		function resolveSchema(schema, spec, seenRefs = new Set()) {
			if (!schema || typeof schema !== 'object') return schema;
			if (schema.$ref) return resolveRef(schema.$ref, spec, seenRefs);
			const out = Array.isArray(schema) ? [] : {};
			for (const key in schema) {
				if (key === '$ref') continue;
				if (key === 'properties' && typeof schema[key] === 'object') {
					out[key] = {};
					for (const prop in schema[key]) {
						out[key][prop] = resolveSchema(schema[key][prop], spec, seenRefs);
					}
				} else if (key === 'items' && typeof schema[key] === 'object') {
					out[key] = resolveSchema(schema[key], spec, seenRefs);
				} else if (key === 'allOf' && Array.isArray(schema[key])) {
					out[key] = schema[key].map(s => resolveSchema(s, spec, seenRefs));
				} else {
					out[key] = schema[key];
				}
			}
			return out;
		}

		function extractRequestSchemas(operation, spec) {
			const schemas = [];
			if (!operation || !Array.isArray(operation.parameters)) return schemas;
			for (const param of operation.parameters) {
				if (param.schema) {
					const resolved = resolveSchema(param.schema, spec);
					schemas.push({
						name: param.name,
						in: param.in,
						required: !!param.required,
						schema: resolved
					});
				} else if (param.type === 'object' && param.properties) {
					schemas.push({
						name: param.name,
						in: param.in,
						required: !!param.required,
						schema: resolveSchema(param, spec)
					});
				}
			}
			return schemas;
		}

		function extractResponseSchemas(operation, spec) {
			const schemas = [];
			if (!operation || !operation.responses) return schemas;
			for (const [code, response] of Object.entries(operation.responses)) {
				if (response && response.schema) {
					const resolved = resolveSchema(response.schema, spec);
					schemas.push({
						code,
						schema: resolved
					});
				}
			}
			return schemas;
		}
		// --- End: Schema Extraction Utilities ---

		const structuredData = {
			summary: {
				title: analysis.title,
				totalEndpoints: analysis.totalEndpoints,
				baseUrl: analysis.baseUrl,
				apiVersion: analysis.apiVersion,
				authenticationRequired: analysis.authenticationRequired,
				securitySchemes: analysis.securitySchemes,
				methodCounts: analysis.endpointsByMethod
			},
			endpoints: analysis.endpoints.map(ep => {
				const origOp = (spec.paths?.[ep.path] || {})[ep.method?.toLowerCase()];
				const requestSchemas = extractRequestSchemas(origOp, spec);
				const responseSchemas = extractResponseSchemas(origOp, spec);
				return {
					method: ep.method,
					path: ep.fullPath,
					operationId: ep.operationId,
					summary: ep.summary,
					tags: ep.tags,
					parameterCount: ep.parameters.length,
					hasRequiredParams: ep.parameters.some(p => p.required),
					responseCount: ep.responses.length,
					parameters: ep.parameters,
					requestSchemas,
					responseSchemas
				};
			})
		};

		fs.writeFileSync('swagger-structured-data.json', JSON.stringify(structuredData, null, 2), 'utf8');
		console.log('Structured data saved to: swagger-structured-data.json');

		return analysis;
	} catch (error) {
		console.error('Analysis failed:', error.message);
		process.exit(1);
	}
}

// Execute if run directly
if (require.main === module) {
	main();
}

module.exports = { analyzeSwagger, generateReport, main };