// Validator: validates tool input/output schemas are valid JSON schema objects

function isValidSchema(schema: any): boolean {
	if (!schema || typeof schema !== 'object') return false;
	if (schema.type && schema.type !== 'object') return false;
	// Accept empty object or object with properties
	if (!schema.properties && Object.keys(schema).length === 0) return true;
	if (schema.properties && typeof schema.properties === 'object') return true;
	return false;
}

export function validateTool(tool: any): boolean {
	return isValidSchema(tool.input_schema) && isValidSchema(tool.output_schema);
}