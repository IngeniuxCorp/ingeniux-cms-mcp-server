# Schema Provider Tool Pseudocode

## Core Interface
```typescript
INTERFACE SchemaProviderTool {
	name: "cms_schema_provider"
	description: "Provide endpoint schemas and execution instructions based on LLM selection"
	inputSchema: {
		type: "object"
		properties: {
			tool_name: { type: "string", description: "Selected tool name from endpoint listing" }
			method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] }
			endpoint_path: { type: "string", description: "Selected endpoint path" }
		}
		required: ["tool_name", "method", "endpoint_path"]
	}
	handler: provideSchema
}
```

## Main Handler Logic
```typescript
FUNCTION provideSchema(args: SchemaProviderArgs) -> SchemaProviderResponse {
	TRY {
		// TDD Anchor: Test input validation
		validatedArgs = validateSchemaInput(args)
		
		// TDD Anchor: Test endpoint lookup
		matchedEndpoint = findMatchingEndpoint(validatedArgs)
		
		// TDD Anchor: Test schema extraction
		schemas = extractSchemas(matchedEndpoint)
		
		// TDD Anchor: Test parameter analysis
		parameterInfo = analyzeParameters(matchedEndpoint)
		
		// TDD Anchor: Test instruction generation
		executionInstructions = generateExecutionInstructions(matchedEndpoint, parameterInfo)
		
		// TDD Anchor: Test response formatting
		RETURN {
			success: true,
			endpoint_info: {
				tool_name: matchedEndpoint.tool_name,
				method: matchedEndpoint.method,
				endpoint_path: matchedEndpoint.endpoint,
				description: matchedEndpoint.description
			},
			input_schema: schemas.input,
			output_schema: schemas.output,
			parameter_info: parameterInfo,
			execution_instructions: executionInstructions
		}
	} CATCH (error) {
		// TDD Anchor: Test error handling
		RETURN handleSchemaError(error, args)
	}
}
```

## Input Validation
```typescript
FUNCTION validateSchemaInput(args: SchemaProviderArgs) -> ValidatedSchemaArgs {
	// TDD Anchor: Test comprehensive input validation
	
	errors = []
	
	// Validate tool name
	IF !args.tool_name OR typeof args.tool_name !== "string" {
		errors.push("tool_name is required and must be a string")
	}
	
	// Validate method
	validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
	IF !args.method OR !validMethods.includes(args.method.toUpperCase()) {
		errors.push(`method must be one of: ${validMethods.join(", ")}`)
	}
	
	// Validate endpoint path
	IF !args.endpoint_path OR typeof args.endpoint_path !== "string" {
		errors.push("endpoint_path is required and must be a string")
	} ELSE IF !args.endpoint_path.startsWith("/") {
		errors.push("endpoint_path must start with '/'")
	}
	
	IF errors.length > 0 {
		THROW new ValidationError("Input validation failed", errors)
	}
	
	RETURN {
		tool_name: args.tool_name.trim(),
		method: args.method.toUpperCase(),
		endpoint_path: args.endpoint_path.trim()
	}
}
```

## Endpoint Lookup
```typescript
FUNCTION findMatchingEndpoint(args: ValidatedSchemaArgs) -> MCPToolDef {
	// TDD Anchor: Test endpoint matching accuracy
	
	// Load all available endpoints
	allEndpoints = loadSwaggerToolDefs()
	
	// Find exact match by all three criteria
	exactMatch = allEndpoints.find(endpoint =>
		endpoint.tool_name === args.tool_name AND
		endpoint.method.toUpperCase() === args.method AND
		endpoint.endpoint === args.endpoint_path
	)
	
	IF exactMatch {
		RETURN exactMatch
	}
	
	// Try partial matches for better error messages
	toolNameMatches = allEndpoints.filter(e => e.tool_name === args.tool_name)
	methodMatches = allEndpoints.filter(e => e.method.toUpperCase() === args.method)
	pathMatches = allEndpoints.filter(e => e.endpoint === args.endpoint_path)
	
	// Generate helpful error with suggestions
	suggestions = generateEndpointSuggestions(args, toolNameMatches, methodMatches, pathMatches)
	
	THROW new EndpointNotFoundError(
		`No endpoint found matching: ${args.method} ${args.endpoint_path} (${args.tool_name})`,
		suggestions
	)
}

FUNCTION generateEndpointSuggestions(
	args: ValidatedSchemaArgs,
	toolNameMatches: MCPToolDef[],
	methodMatches: MCPToolDef[],
	pathMatches: MCPToolDef[]
) -> EndpointSuggestion[] {
	// TDD Anchor: Test suggestion generation
	
	suggestions = []
	
	// Suggest similar tool names
	IF toolNameMatches.length > 0 {
		suggestions.push({
			type: "tool_name_match",
			message: "Found endpoints with same tool name but different method/path:",
			endpoints: toolNameMatches.slice(0, 3).map(formatSuggestion)
		})
	}
	
	// Suggest same method different paths
	IF methodMatches.length > 0 {
		suggestions.push({
			type: "method_match", 
			message: "Found endpoints with same method but different tool/path:",
			endpoints: methodMatches.slice(0, 3).map(formatSuggestion)
		})
	}
	
	// Suggest same path different methods
	IF pathMatches.length > 0 {
		suggestions.push({
			type: "path_match",
			message: "Found endpoints with same path but different tool/method:",
			endpoints: pathMatches.slice(0, 3).map(formatSuggestion)
		})
	}
	
	RETURN suggestions.slice(0, 5)
}

FUNCTION formatSuggestion(endpoint: MCPToolDef) -> SuggestionEndpoint {
	RETURN {
		tool_name: endpoint.tool_name,
		method: endpoint.method,
		endpoint_path: endpoint.endpoint,
		description: endpoint.description
	}
}
```

## Schema Extraction
```typescript
FUNCTION extractSchemas(endpoint: MCPToolDef) -> ExtractedSchemas {
	// TDD Anchor: Test schema extraction for all schema types
	
	inputSchema = endpoint.input_schema || { type: "object", properties: {} }
	outputSchema = endpoint.output_schema || { type: "object" }
	
	// Validate and normalize schemas
	normalizedInput = normalizeSchema(inputSchema)
	normalizedOutput = normalizeSchema(outputSchema)
	
	RETURN {
		input: normalizedInput,
		output: normalizedOutput,
		has_input_schema: !!endpoint.input_schema,
		has_output_schema: !!endpoint.output_schema
	}
}

FUNCTION normalizeSchema(schema: any) -> NormalizedSchema {
	// TDD Anchor: Test schema normalization
	
	IF !schema OR typeof schema !== "object" {
		RETURN { type: "object", properties: {} }
	}
	
	// Ensure basic structure
	normalized = {
		type: schema.type || "object",
		properties: schema.properties || {},
		required: schema.required || [],
		description: schema.description || ""
	}
	
	// Add additional metadata for better understanding
	normalized.property_count = Object.keys(normalized.properties).length
	normalized.required_count = normalized.required.length
	normalized.optional_count = normalized.property_count - normalized.required_count
	
	RETURN normalized
}
```

## Parameter Analysis
```typescript
FUNCTION analyzeParameters(endpoint: MCPToolDef) -> ParameterAnalysis {
	// TDD Anchor: Test parameter analysis accuracy
	
	inputSchema = endpoint.input_schema || {}
	properties = inputSchema.properties || {}
	required = inputSchema.required || []
	
	// Categorize parameters
	pathParams = extractPathParameters(endpoint.endpoint)
	requiredParams = required.map(name => ({ name, ...properties[name] }))
	optionalParams = Object.keys(properties)
		.filter(name => !required.includes(name))
		.map(name => ({ name, ...properties[name] }))
	
	// Analyze parameter types
	typeAnalysis = analyzeParameterTypes(properties)
	
	RETURN {
		total_parameters: Object.keys(properties).length,
		required_parameters: requiredParams,
		optional_parameters: optionalParams,
		path_parameters: pathParams,
		type_analysis: typeAnalysis,
		requires_body: ["POST", "PUT", "PATCH"].includes(endpoint.method),
		method_info: getMethodInfo(endpoint.method)
	}
}

FUNCTION extractPathParameters(endpointPath: string) -> PathParameter[] {
	// TDD Anchor: Test path parameter extraction
	
	pathParams = []
	matches = endpointPath.match(/\{([^}]+)\}/g)
	
	IF matches {
		FOR EACH match IN matches {
			paramName = match.slice(1, -1) // Remove { }
			pathParams.push({
				name: paramName,
				placeholder: match,
				position: endpointPath.indexOf(match)
			})
		}
	}
	
	RETURN pathParams
}

FUNCTION analyzeParameterTypes(properties: object) -> TypeAnalysis {
	// TDD Anchor: Test type analysis
	
	typeCounts = {}
	complexTypes = []
	
	FOR EACH [paramName, paramSchema] IN Object.entries(properties) {
		type = paramSchema.type || "unknown"
		typeCounts[type] = (typeCounts[type] || 0) + 1
		
		// Identify complex types
		IF type === "object" OR type === "array" {
			complexTypes.push({
				name: paramName,
				type: type,
				schema: paramSchema
			})
		}
	}
	
	RETURN {
		type_counts: typeCounts,
		complex_types: complexTypes,
		has_complex_types: complexTypes.length > 0
	}
}

FUNCTION getMethodInfo(method: string) -> MethodInfo {
	// TDD Anchor: Test method information
	
	methodDetails = {
		"GET": {
			description: "Retrieve data",
			uses_query_params: true,
			uses_body: false,
			idempotent: true
		},
		"POST": {
			description: "Create new resource",
			uses_query_params: false,
			uses_body: true,
			idempotent: false
		},
		"PUT": {
			description: "Update/replace resource",
			uses_query_params: false,
			uses_body: true,
			idempotent: true
		},
		"DELETE": {
			description: "Remove resource",
			uses_query_params: true,
			uses_body: false,
			idempotent: true
		},
		"PATCH": {
			description: "Partially update resource",
			uses_query_params: false,
			uses_body: true,
			idempotent: false
		}
	}
	
	RETURN methodDetails[method] || {
		description: "Unknown method",
		uses_query_params: false,
		uses_body: false,
		idempotent: false
	}
}
```

## Execution Instructions Generation
```typescript
FUNCTION generateExecutionInstructions(endpoint: MCPToolDef, paramInfo: ParameterAnalysis) -> ExecutionInstructions {
	// TDD Anchor: Test instruction generation for all scenarios
	
	instructions = {
		next_tool: "cms_endpoint_executor",
		overview: generateOverview(endpoint, paramInfo),
		parameter_guidance: generateParameterGuidance(paramInfo),
		example_call: generateExampleCall(endpoint, paramInfo),
		validation_notes: generateValidationNotes(paramInfo)
	}
	
	RETURN instructions
}

FUNCTION generateOverview(endpoint: MCPToolDef, paramInfo: ParameterAnalysis) -> string {
	// TDD Anchor: Test overview generation
	
	RETURN `
Execute ${endpoint.method} request to ${endpoint.endpoint}
Description: ${endpoint.description}
Method: ${paramInfo.method_info.description}
Requires body data: ${paramInfo.requires_body ? "Yes" : "No"}
Total parameters: ${paramInfo.total_parameters}
Required parameters: ${paramInfo.required_parameters.length}
	`.trim()
}

FUNCTION generateParameterGuidance(paramInfo: ParameterAnalysis) -> ParameterGuidance {
	// TDD Anchor: Test parameter guidance generation
	
	guidance = {
		required: [],
		optional: [],
		path_params: [],
		body_structure: null
	}
	
	// Required parameters guidance
	FOR EACH param IN paramInfo.required_parameters {
		guidance.required.push({
			name: param.name,
			type: param.type || "string",
			description: param.description || "No description provided",
			format: param.format || null,
			example: generateParamExample(param)
		})
	}
	
	// Optional parameters guidance
	FOR EACH param IN paramInfo.optional_parameters {
		guidance.optional.push({
			name: param.name,
			type: param.type || "string", 
			description: param.description || "No description provided",
			format: param.format || null,
			example: generateParamExample(param)
		})
	}
	
	// Path parameters guidance
	FOR EACH pathParam IN paramInfo.path_parameters {
		guidance.path_params.push({
			name: pathParam.name,
			placeholder: pathParam.placeholder,
			description: `Path parameter: ${pathParam.name}`
		})
	}
	
	// Body structure for POST/PUT/PATCH
	IF paramInfo.requires_body {
		guidance.body_structure = generateBodyStructure(paramInfo)
	}
	
	RETURN guidance
}

FUNCTION generateParamExample(param: object) -> any {
	// TDD Anchor: Test example generation
	
	type = param.type || "string"
	
	SWITCH type {
		CASE "string":
			IF param.format === "date" {
				RETURN "2024-01-15"
			}
			IF param.format === "email" {
				RETURN "user@example.com"
			}
			RETURN param.example || "example_value"
			
		CASE "number":
		CASE "integer":
			RETURN param.example || 42
			
		CASE "boolean":
			RETURN param.example || true
			
		CASE "array":
			RETURN param.example || ["item1", "item2"]
			
		CASE "object":
			RETURN param.example || {}
			
		DEFAULT:
			RETURN "value"
	}
}

FUNCTION generateExampleCall(endpoint: MCPToolDef, paramInfo: ParameterAnalysis) -> ExampleCall {
	// TDD Anchor: Test example call generation
	
	exampleData = {}
	
	// Add required parameters with examples
	FOR EACH param IN paramInfo.required_parameters {
		exampleData[param.name] = generateParamExample(param)
	}
	
	// Add one optional parameter as example
	IF paramInfo.optional_parameters.length > 0 {
		firstOptional = paramInfo.optional_parameters[0]
		exampleData[firstOptional.name] = generateParamExample(firstOptional)
	}
	
	RETURN {
		tool_name: "cms_endpoint_executor",
		parameters: {
			endpoint_path: endpoint.endpoint,
			method: endpoint.method,
			request_data: exampleData
		},
		description: `Example call to execute ${endpoint.method} ${endpoint.endpoint}`
	}
}

FUNCTION generateValidationNotes(paramInfo: ParameterAnalysis) -> string[] {
	// TDD Anchor: Test validation notes generation
	
	notes = []
	
	IF paramInfo.path_parameters.length > 0 {
		notes.push("Path parameters will be automatically interpolated into the URL")
	}
	
	IF paramInfo.requires_body {
		notes.push("Body parameters will be sent as JSON in the request body")
	} ELSE {
		notes.push("Parameters will be sent as query parameters")
	}
	
	IF paramInfo.type_analysis.has_complex_types {
		notes.push("This endpoint has complex object/array parameters - review the schema carefully")
	}
	
	IF paramInfo.required_parameters.length > 0 {
		notes.push(`${paramInfo.required_parameters.length} parameters are required for this endpoint`)
	}
	
	RETURN notes
}
```

## Error Handling
```typescript
FUNCTION handleSchemaError(error: Error, args: SchemaProviderArgs) -> SchemaProviderErrorResponse {
	// TDD Anchor: Test comprehensive error handling
	
	IF error instanceof ValidationError {
		RETURN {
			success: false,
			error: "Invalid input",
			message: error.message,
			validation_errors: error.details,
			suggestion: "Please check the required parameters and try again"
		}
	}
	
	IF error instanceof EndpointNotFoundError {
		RETURN {
			success: false,
			error: "Endpoint not found",
			message: error.message,
			suggestions: error.suggestions,
			help: "Use cms_endpoint_lister to see all available endpoints"
		}
	}
	
	// Generic error
	logger.error("Schema provider error", { error, args })
	RETURN {
		success: false,
		error: "Schema retrieval failed",
		message: "Unable to retrieve endpoint schema and instructions",
		suggestion: "Please verify the endpoint details and try again"
	}
}
```

## Response Types
```typescript
TYPE SchemaProviderResponse = {
	success: true
	endpoint_info: EndpointInfo
	input_schema: NormalizedSchema
	output_schema: NormalizedSchema
	parameter_info: ParameterAnalysis
	execution_instructions: ExecutionInstructions
}

TYPE SchemaProviderErrorResponse = {
	success: false
	error: string
	message: string
	suggestion?: string
	validation_errors?: string[]
	suggestions?: EndpointSuggestion[]
	help?: string
}

TYPE EndpointInfo = {
	tool_name: string
	method: string
	endpoint_path: string
	description: string
}

TYPE ExtractedSchemas = {
	input: NormalizedSchema
	output: NormalizedSchema
	has_input_schema: boolean
	has_output_schema: boolean
}

TYPE ParameterAnalysis = {
	total_parameters: number
	required_parameters: ParameterDetail[]
	optional_parameters: ParameterDetail[]
	path_parameters: PathParameter[]
	type_analysis: TypeAnalysis
	requires_body: boolean
	method_info: MethodInfo
}

TYPE ExecutionInstructions = {
	next_tool: string
	overview: string
	parameter_guidance: ParameterGuidance
	example_call: ExampleCall
	validation_notes: string[]
}
```

## TDD Test Anchor Summary
1. **Input Validation**: All parameter validation scenarios
2. **Endpoint Lookup**: Exact matches, partial matches, not found
3. **Schema Extraction**: Various schema types and structures
4. **Parameter Analysis**: Required/optional/path parameter categorization
5. **Type Analysis**: All JSON schema types and complex types
6. **Instruction Generation**: Clear execution guidance
7. **Example Generation**: Realistic parameter examples
8. **Error Handling**: All error types with helpful suggestions
9. **Path Parameter Extraction**: Various path parameter patterns
10. **Method Information**: All HTTP method characteristics
11. **Validation Notes**: Contextual guidance generation
12. **Integration**: End-to-end schema provision workflow