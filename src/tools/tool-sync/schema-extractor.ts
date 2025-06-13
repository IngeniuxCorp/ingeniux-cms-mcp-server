// Schema Extractor: extracts input/output schemas from a tool object

import { flattenAllOfSchema } from './allof-flattener';

export function extractToolSchemas(tool: any): {input_schema: any, output_schema: any} {
	return {
		input_schema: flattenAllOfSchema(tool.input_schema || {}),
		output_schema: flattenAllOfSchema(tool.output_schema || {})
	};
}