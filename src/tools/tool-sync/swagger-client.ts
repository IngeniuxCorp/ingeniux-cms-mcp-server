// Swagger Client: fetches and parses Swagger spec, extracts endpoint schemas
import https from 'https';
import http from 'http';

export async function fetchSwaggerSpec(url: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const client = url.startsWith('https') ? https : http;
		client.get(url, res => {
			let data = '';
			res.on('data', chunk => { data += chunk; });
			res.on('end', () => {
				try {
					resolve(JSON.parse(data));
				} catch (err) {
					reject(`Failed to parse Swagger JSON: ${err}`);
				}
			});
		}).on('error', err => reject(`Failed to fetch Swagger: ${err}`));
	});
}

// Find endpoint in Swagger by method/path, return {input_schema, output_schema}
export function getSwaggerEndpointSchemas(swagger: any, tool: any): {input_schema: any, output_schema: any} | null {
	try {
		const pathObj = swagger.paths?.[tool.endpoint];
		if (!pathObj) return null;
		const methodObj = pathObj[tool.method?.toLowerCase()];
		if (!methodObj) return null;
		const input_schema = methodObj.requestBody?.content?.['application/json']?.schema || {};
		const output_schema = methodObj.responses?.['200']?.content?.['application/json']?.schema || {};
		return { input_schema, output_schema };
	} catch {
		return null;
	}
}