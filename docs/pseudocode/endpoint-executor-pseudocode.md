# Endpoint Executor Tool Pseudocode

## Core Interface
```typescript
INTERFACE EndpointExecutorTool {
	name: "cms_endpoint_executor"
	description: "Execute validated CMS API calls with resolved endpoint paths"
	inputSchema: {
		type: "object"
		properties: {
			endpoint_path: { type: "string", description: "Resolved API endpoint path" }
			method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] }
			request_data: { type: "object", description: "Request parameters and body data" }
			validation_required: { type: "boolean", default: true }
		}
		required: ["endpoint_path", "method"]
	}
	handler: executeEndpoint
}
```

## Main Handler Logic
```typescript
FUNCTION executeEndpoint(args: EndpointExecutorArgs) -> EndpointExecutorResponse {
	TRY {
		// TDD Anchor: Test input validation
		validatedArgs = validateExecutorInput(args)
		
		// TDD Anchor: Test endpoint resolution
		resolvedEndpoint = resolveEndpointDefinition(validatedArgs.endpoint_path, validatedArgs.method)
		
		// TDD Anchor: Test parameter validation
		validatedParams = validateRequestParameters(validatedArgs.request_data, resolvedEndpoint)
		
		// TDD Anchor: Test request preparation
		preparedRequest = prepareHttpRequest(validatedArgs, validatedParams, resolvedEndpoint)
		
		// TDD Anchor: Test API client execution
		apiResponse = executeHttpRequest(preparedRequest)
		
		// TDD Anchor: Test response formatting
		formattedResponse = formatResponse(apiResponse, resolvedEndpoint)
		
		// TDD Anchor: Test success logging
		logSuccessfulExecution(validatedArgs, apiResponse)
		
		RETURN formattedResponse
	} CATCH (error) {
		// TDD Anchor: Test error handling and logging
		RETURN handleExecutionError(error, args)
	}
}
```

## Input Validation
```typescript
FUNCTION validateExecutorInput(args: EndpointExecutorArgs) -> ValidatedExecutorArgs {
	// TDD Anchor: Test all validation scenarios
	
	errors = []
	
	// Validate endpoint path
	IF !args.endpoint_path OR !isValidEndpointPath(args.endpoint_path) {
		errors.push("Invalid or missing endpoint_path")
	}
	
	// Validate HTTP method
	validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
	IF !args.method OR !validMethods.includes(args.method.toUpperCase()) {
		errors.push("Invalid or missing HTTP method")
	}
	
	// Validate request data structure
	IF args.request_data AND !isValidObject(args.request_data) {
		errors.push("request_data must be a valid object")
	}
	
	IF errors.length > 0 {
		THROW new ValidationError("Input validation failed", errors)
	}
	
	RETURN {
		endpoint_path: args.endpoint_path.trim(),
		method: args.method.toUpperCase(),
		request_data: args.request_data || {},
		validation_required: args.validation_required !== false
	}
}

FUNCTION isValidEndpointPath(path: string) -> boolean {
	// TDD Anchor: Test endpoint path validation
	
	// Must start with /
	IF !path.startsWith("/") {
		RETURN false
	}
	
	// Must not contain invalid characters
	invalidChars = ["<", ">", "\"", "|", "?", "*"]
	FOR EACH char IN invalidChars {
		IF path.includes(char) {
			RETURN false
		}
	}
	
	RETURN true
}
```

## Endpoint Resolution
```typescript
FUNCTION resolveEndpointDefinition(path: string, method: string) -> MCPToolDef {
	// TDD Anchor: Test endpoint lookup accuracy
	
	// Load available endpoints from generated tools
	availableEndpoints = loadSwaggerToolDefs()
	
	// Find exact match
	matchingEndpoint = availableEndpoints.find(endpoint => 
		endpoint.endpoint === path AND endpoint.method.toUpperCase() === method
	)
	
	IF !matchingEndpoint {
		// TDD Anchor: Test endpoint not found scenarios
		THROW new EndpointNotFoundError(
			`No endpoint found for ${method} ${path}`,
			suggestSimilarEndpoints(path, method, availableEndpoints)
		)
	}
	
	RETURN matchingEndpoint
}

FUNCTION suggestSimilarEndpoints(path: string, method: string, endpoints: MCPToolDef[]) -> string[] {
	// TDD Anchor: Test suggestion generation
	
	suggestions = []
	
	// Find endpoints with same method
	sameMethodEndpoints = endpoints.filter(e => e.method.toUpperCase() === method)
	suggestions.push(...sameMethodEndpoints.slice(0, 3).map(e => `${e.method} ${e.endpoint}`))
	
	// Find endpoints with similar paths
	similarPaths = endpoints.filter(e => calculatePathSimilarity(path, e.endpoint) > 0.5)
	suggestions.push(...similarPaths.slice(0, 3).map(e => `${e.method} ${e.endpoint}`))
	
	RETURN unique(suggestions).slice(0, 5)
}
```

## Parameter Validation
```typescript
FUNCTION validateRequestParameters(requestData: object, endpoint: MCPToolDef) -> ValidatedParams {
	// TDD Anchor: Test parameter validation for all schema types
	
	IF !endpoint.validation_required {
		RETURN { params: requestData, body: requestData }
	}
	
	inputSchema = endpoint.input_schema
	required = inputSchema.required || []
	properties = inputSchema.properties || {}
	
	// Check required parameters
	missingRequired = []
	FOR EACH requiredParam IN required {
		IF !requestData.hasOwnProperty(requiredParam) {
			missingRequired.push(requiredParam)
		}
	}
	
	IF missingRequired.length > 0 {
		THROW new ParameterValidationError(
			"Missing required parameters",
			missingRequired
		)
	}
	
	// Validate parameter types and formats
	validationErrors = []
	validatedData = {}
	
	FOR EACH [paramName, paramValue] IN Object.entries(requestData) {
		paramSchema = properties[paramName]
		
		IF !paramSchema {
			// TDD Anchor: Test unknown parameter handling
			validationErrors.push(`Unknown parameter: ${paramName}`)
			CONTINUE
		}
		
		// TDD Anchor: Test type validation
		validatedValue = validateParameterType(paramValue, paramSchema, paramName)
		validatedData[paramName] = validatedValue
	}
	
	IF validationErrors.length > 0 {
		THROW new ParameterValidationError("Parameter validation failed", validationErrors)
	}
	
	// Separate path params, query params, and body data
	RETURN separateParameterTypes(validatedData, endpoint)
}

FUNCTION validateParameterType(value: any, schema: object, paramName: string) -> any {
	// TDD Anchor: Test all JSON schema type validations
	
	type = schema.type
	
	SWITCH type {
		CASE "string":
			IF typeof value !== "string" {
				THROW new TypeValidationError(`${paramName} must be a string`)
			}
			RETURN validateStringConstraints(value, schema, paramName)
			
		CASE "number":
		CASE "integer":
			numValue = Number(value)
			IF isNaN(numValue) {
				THROW new TypeValidationError(`${paramName} must be a number`)
			}
			RETURN validateNumberConstraints(numValue, schema, paramName)
			
		CASE "boolean":
			IF typeof value === "boolean" {
				RETURN value
			}
			IF value === "true" OR value === "false" {
				RETURN value === "true"
			}
			THROW new TypeValidationError(`${paramName} must be a boolean`)
			
		CASE "array":
			IF !Array.isArray(value) {
				THROW new TypeValidationError(`${paramName} must be an array`)
			}
			RETURN validateArrayConstraints(value, schema, paramName)
			
		CASE "object":
			IF typeof value !== "object" OR value === null {
				THROW new TypeValidationError(`${paramName} must be an object`)
			}
			RETURN validateObjectConstraints(value, schema, paramName)
			
		DEFAULT:
			RETURN value
	}
}
```

## HTTP Request Preparation
```typescript
FUNCTION prepareHttpRequest(args: ValidatedExecutorArgs, params: ValidatedParams, endpoint: MCPToolDef) -> HttpRequest {
	// TDD Anchor: Test request preparation for all HTTP methods
	
	method = args.method
	url = interpolatePathParameters(endpoint.endpoint, params.pathParams)
	
	request = {
		method: method,
		url: url,
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json"
		}
	}
	
	// TDD Anchor: Test method-specific parameter handling
	SWITCH method {
		CASE "GET":
			request.params = params.queryParams
			
		CASE "DELETE":
			request.params = params.queryParams
			
		CASE "POST":
		CASE "PUT":
		CASE "PATCH":
			request.data = params.bodyData
			request.params = params.queryParams
			
		DEFAULT:
			THROW new UnsupportedMethodError(`HTTP method ${method} not supported`)
	}
	
	RETURN request
}

FUNCTION interpolatePathParameters(endpointPath: string, pathParams: object) -> string {
	// TDD Anchor: Test path parameter interpolation
	
	url = endpointPath
	
	// Replace {param} with actual values
	FOR EACH [paramName, paramValue] IN Object.entries(pathParams) {
		placeholder = `{${paramName}}`
		IF url.includes(placeholder) {
			url = url.replace(placeholder, encodeURIComponent(String(paramValue)))
		}
	}
	
	// Check for unresolved parameters
	unresolvedParams = url.match(/\{[^}]+\}/g)
	IF unresolvedParams {
		THROW new PathParameterError(
			"Unresolved path parameters",
			unresolvedParams.map(p => p.slice(1, -1))
		)
	}
	
	RETURN url
}

FUNCTION separateParameterTypes(validatedData: object, endpoint: MCPToolDef) -> ValidatedParams {
	// TDD Anchor: Test parameter type separation logic
	
	pathParams = {}
	queryParams = {}
	bodyData = {}
	
	endpointPath = endpoint.endpoint
	pathParamNames = extractPathParameterNames(endpointPath)
	
	FOR EACH [paramName, paramValue] IN Object.entries(validatedData) {
		IF pathParamNames.includes(paramName) {
			pathParams[paramName] = paramValue
		} ELSE IF endpoint.method === "GET" OR endpoint.method === "DELETE" {
			queryParams[paramName] = paramValue
		} ELSE {
			bodyData[paramName] = paramValue
		}
	}
	
	RETURN { pathParams, queryParams, bodyData }
}
```

## HTTP Request Execution
```typescript
FUNCTION executeHttpRequest(request: HttpRequest) -> ApiResponse {
	// TDD Anchor: Test API client integration
	
	apiClient = getApiClient()
	
	TRY {
		// TDD Anchor: Test request execution with different methods
		SWITCH request.method {
			CASE "GET":
				response = AWAIT apiClient.get(request.url, request.params)
				
			CASE "POST":
				response = AWAIT apiClient.post(request.url, request.data, { params: request.params })
				
			CASE "PUT":
				response = AWAIT apiClient.put(request.url, request.data, { params: request.params })
				
			CASE "DELETE":
				response = AWAIT apiClient.request({
					method: "DELETE",
					url: request.url,
					params: request.params
				})
				
			CASE "PATCH":
				response = AWAIT apiClient.request({
					method: "PATCH", 
					url: request.url,
					data: request.data,
					params: request.params
				})
		}
		
		RETURN response
	} CATCH (error) {
		// TDD Anchor: Test API error handling
		THROW new ApiExecutionError("API request failed", error)
	}
}
```

## Response Formatting
```typescript
FUNCTION formatResponse(apiResponse: any, endpoint: MCPToolDef) -> MCPResponse {
	// TDD Anchor: Test response formatting for all response types
	
	// Handle different response types
	IF typeof apiResponse === "string" {
		responseText = apiResponse
	} ELSE IF apiResponse && typeof apiResponse === "object" {
		responseText = JSON.stringify(apiResponse, null, 2)
	} ELSE {
		responseText = String(apiResponse)
	}
	
	// TDD Anchor: Test output schema validation
	IF endpoint.output_schema {
		validateResponseAgainstSchema(apiResponse, endpoint.output_schema)
	}
	
	RETURN {
		content: [
			{
				type: "text" as const,
				text: responseText
			}
		],
		metadata: {
			endpoint: endpoint.endpoint,
			method: endpoint.method,
			timestamp: new Date().toISOString(),
			success: true
		}
	}
}

FUNCTION validateResponseAgainstSchema(response: any, schema: object) -> void {
	// TDD Anchor: Test response schema validation
	
	// Basic schema validation for common types
	IF schema.type === "object" AND typeof response !== "object" {
		logger.warn("Response type mismatch: expected object", { response, schema })
	}
	
	IF schema.type === "array" AND !Array.isArray(response) {
		logger.warn("Response type mismatch: expected array", { response, schema })
	}
	
	// Additional validation can be added based on schema complexity
}
```

## Error Handling
```typescript
FUNCTION handleExecutionError(error: Error, args: EndpointExecutorArgs) -> MCPErrorResponse {
	// TDD Anchor: Test comprehensive error handling
	
	// Collect detailed error information
	errorDetails = collectErrorDetails(error)
	
	// Log error with context
	logger.error(
		`Endpoint execution failed for ${args.method} ${args.endpoint_path}`,
		{ error: errorDetails, args }
	)
	
	// TDD Anchor: Test specific error type handling
	IF error instanceof ValidationError {
		RETURN {
			content: [{ type: "text", text: `Validation Error: ${error.message}` }],
			isError: true,
			metadata: { errorType: "validation", details: error.details }
		}
	}
	
	IF error instanceof EndpointNotFoundError {
		RETURN {
			content: [{ 
				type: "text", 
				text: `Endpoint not found: ${error.message}\nSuggestions: ${error.suggestions.join(", ")}` 
			}],
			isError: true,
			metadata: { errorType: "not_found", suggestions: error.suggestions }
		}
	}
	
	IF error instanceof ParameterValidationError {
		RETURN {
			content: [{ 
				type: "text", 
				text: `Parameter validation failed: ${error.message}\nErrors: ${error.errors.join(", ")}` 
			}],
			isError: true,
			metadata: { errorType: "parameter_validation", errors: error.errors }
		}
	}
	
	IF error instanceof ApiExecutionError {
		RETURN {
			content: [{ 
				type: "text", 
				text: `API execution failed: ${error.message}` 
			}],
			isError: true,
			metadata: { errorType: "api_execution", originalError: error.originalError }
		}
	}
	
	// Generic error handling
	RETURN {
		content: [{ 
			type: "text", 
			text: `Execution failed: ${error.message || String(error)}` 
		}],
		isError: true,
		metadata: { errorType: "generic", error: errorDetails }
	}
}

FUNCTION collectErrorDetails(error: any) -> object {
	// TDD Anchor: Test error detail collection
	
	details = {}
	
	IF error && typeof error === "object" {
		details.message = error.message || ""
		details.stack = error.stack || ""
		details.code = error.code || ""
		details.data = error.data || ""
		details.response = error.response || ""
		
		// Include all enumerable properties
		FOR EACH key IN Object.keys(error) {
			IF !(key in details) {
				details[key] = error[key]
			}
		}
	} ELSE {
		details.raw = String(error)
	}
	
	RETURN details
}
```

## Success Logging
```typescript
FUNCTION logSuccessfulExecution(args: ValidatedExecutorArgs, response: any) -> void {
	// TDD Anchor: Test success logging
	
	logger.info(
		`Endpoint executed successfully: ${args.method} ${args.endpoint_path}`,
		{
			endpoint: args.endpoint_path,
			method: args.method,
			timestamp: new Date().toISOString(),
			responseSize: typeof response === "string" ? response.length : JSON.stringify(response).length
		}
	)
}
```

## Utility Functions
```typescript
FUNCTION extractPathParameterNames(endpointPath: string) -> string[] {
	// TDD Anchor: Test path parameter extraction
	
	matches = endpointPath.match(/\{([^}]+)\}/g)
	IF !matches {
		RETURN []
	}
	
	RETURN matches.map(match => match.slice(1, -1))
}

FUNCTION calculatePathSimilarity(path1: string, path2: string) -> number {
	// TDD Anchor: Test path similarity calculation
	
	// Simple similarity based on common segments
	segments1 = path1.split("/").filter(s => s.length > 0)
	segments2 = path2.split("/").filter(s => s.length > 0)
	
	commonSegments = 0
	maxSegments = Math.max(segments1.length, segments2.length)
	
	FOR i = 0 TO Math.min(segments1.length, segments2.length) - 1 {
		IF segments1[i] === segments2[i] OR 
		   segments1[i].startsWith("{") OR 
		   segments2[i].startsWith("{") {
			commonSegments++
		}
	}
	
	RETURN commonSegments / maxSegments
}

FUNCTION unique(array: any[]) -> any[] {
	// TDD Anchor: Test array deduplication
	RETURN [...new Set(array)]
}
```

## Constants and Types
```typescript
CONSTANTS {
	SUPPORTED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
	DEFAULT_CONTENT_TYPE = "application/json"
	PATH_SIMILARITY_THRESHOLD = 0.5
}

TYPE ValidatedParams = {
	pathParams: object
	queryParams: object  
	bodyData: object
}

TYPE HttpRequest = {
	method: string
	url: string
	headers: object
	params?: object
	data?: object
}

TYPE MCPResponse = {
	content: Array<{ type: "text", text: string }>
	metadata?: object
}

TYPE MCPErrorResponse = {
	content: Array<{ type: "text", text: string }>
	isError: true
	metadata?: object
}
```

## TDD Test Anchor Summary
1. **Input Validation**: Valid/invalid inputs, edge cases
2. **Endpoint Resolution**: Exact matches, not found scenarios
3. **Parameter Validation**: All schema types, required/optional
4. **Type Validation**: String/number/boolean/array/object validation
5. **Request Preparation**: All HTTP methods, parameter separation
6. **Path Interpolation**: Parameter replacement, unresolved params
7. **HTTP Execution**: API client integration, method handling
8. **Response Formatting**: Different response types, schema validation
9. **Error Handling**: All error types, detail collection
10. **Success Logging**: Execution metrics and timestamps
11. **Utility Functions**: Path extraction, similarity calculation
12. **Integration**: End-to-end execution flow
13. **Performance**: Response time and memory usage
14. **Security**: Input sanitization, parameter validation