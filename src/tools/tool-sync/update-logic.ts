// Update Logic: updates tool's input/output schemas to match Swagger

export function updateToolSchemas(
	tool: any,
	swaggerSchemas: {input_schema: any, output_schema: any}
): void {
	tool.input_schema = swaggerSchemas.input_schema;
	tool.output_schema = swaggerSchemas.output_schema;
}