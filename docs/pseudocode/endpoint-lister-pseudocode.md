# Endpoint Lister Tool Pseudocode

## Core Interface
```typescript
INTERFACE EndpointListerTool {
	name: "cms_endpoint_lister"
	description: "List available CMS endpoints for LLM selection and decision-making"
	inputSchema: {
		type: "object"
		properties: {
			category_filter: { type: "string", optional: true, description: "Filter by endpoint category" }
			method_filter: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], optional: true }
			search_term: { type: "string", optional: true, description: "Search term for endpoint names/descriptions" }
			include_details: { type: "boolean", default: false, description: "Include detailed endpoint information" }
		}
		required: []
	}
	handler: listEndpoints
}
```

## Main Handler Logic
```typescript
FUNCTION listEndpoints(args: EndpointListerArgs) -> EndpointListingResponse {
	TRY {
		// TDD Anchor: Test input validation
		validatedArgs = validateListerInput(args)
		
		// TDD Anchor: Test endpoint loading
		allEndpoints = loadSwaggerToolDefs()
		
		// TDD Anchor: Test filtering logic
		filteredEndpoints = applyFilters(allEndpoints, validatedArgs)
		
		// TDD Anchor: Test categorization
		categorizedEndpoints = categorizeEndpoints(filteredEndpoints)
		
		// TDD Anchor: Test formatting
		formattedListing = formatEndpointListing(categorizedEndpoints, validatedArgs.include_details)
		
		// TDD Anchor: Test response generation
		RETURN {
			success: true,
			total_endpoints: filteredEndpoints.length,
			categories: Object.keys(categorizedEndpoints),
			endpoints: formattedListing,
			instructions: generateLLMSelectionInstructions()
		}
	} CATCH (error) {
		// TDD Anchor: Test error handling
		RETURN handleListerError(error)
	}
}
```

## Input Validation
```typescript
FUNCTION validateListerInput(args: EndpointListerArgs) -> ValidatedListerArgs {
	// TDD Anchor: Test all validation scenarios
	
	validatedArgs = {
		category_filter: args.category_filter?.trim() || null,
		method_filter: args.method_filter?.toUpperCase() || null,
		search_term: args.search_term?.trim().toLowerCase() || null,
		include_details: args.include_details === true
	}
	
	// Validate method filter
	IF validatedArgs.method_filter {
		validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"]
		IF !validMethods.includes(validatedArgs.method_filter) {
			THROW new ValidationError(`Invalid method filter: ${args.method_filter}`)
		}
	}
	
	// Validate search term length
	IF validatedArgs.search_term AND validatedArgs.search_term.length < 2 {
		THROW new ValidationError("Search term must be at least 2 characters")
	}
	
	RETURN validatedArgs
}
```

## Filtering Logic
```typescript
FUNCTION applyFilters(endpoints: MCPToolDef[], filters: ValidatedListerArgs) -> MCPToolDef[] {
	// TDD Anchor: Test filtering accuracy
	
	filtered = [...endpoints]
	
	// Apply method filter
	IF filters.method_filter {
		filtered = filtered.filter(endpoint => 
			endpoint.method.toUpperCase() === filters.method_filter
		)
	}
	
	// Apply category filter
	IF filters.category_filter {
		filtered = filtered.filter(endpoint => 
			endpoint.tags && endpoint.tags.some(tag => 
				tag.toLowerCase().includes(filters.category_filter.toLowerCase())
			)
		)
	}
	
	// Apply search filter
	IF filters.search_term {
		filtered = filtered.filter(endpoint => 
			endpoint.tool_name.toLowerCase().includes(filters.search_term) OR
			endpoint.description.toLowerCase().includes(filters.search_term) OR
			endpoint.endpoint.toLowerCase().includes(filters.search_term)
		)
	}
	
	// TDD Anchor: Test sorting
	RETURN sortEndpoints(filtered)
}

FUNCTION sortEndpoints(endpoints: MCPToolDef[]) -> MCPToolDef[] {
	// TDD Anchor: Test sorting logic
	
	RETURN endpoints.sort((a, b) => {
		// Sort by method first (GET, POST, PUT, DELETE, PATCH)
		methodOrder = ["GET", "POST", "PUT", "DELETE", "PATCH"]
		methodComparison = methodOrder.indexOf(a.method) - methodOrder.indexOf(b.method)
		IF methodComparison !== 0 {
			RETURN methodComparison
		}
		
		// Then by endpoint path
		RETURN a.endpoint.localeCompare(b.endpoint)
	})
}
```

## Categorization Logic
```typescript
FUNCTION categorizeEndpoints(endpoints: MCPToolDef[]) -> CategorizedEndpoints {
	// TDD Anchor: Test categorization accuracy
	
	categories = {}
	
	FOR EACH endpoint IN endpoints {
		// Determine primary category
		primaryCategory = determinePrimaryCategory(endpoint)
		
		IF !categories[primaryCategory] {
			categories[primaryCategory] = []
		}
		
		categories[primaryCategory].push(endpoint)
	}
	
	RETURN categories
}

FUNCTION determinePrimaryCategory(endpoint: MCPToolDef) -> string {
	// TDD Anchor: Test category determination
	
	// Use tags if available
	IF endpoint.tags AND endpoint.tags.length > 0 {
		RETURN endpoint.tags[0].toLowerCase()
	}
	
	// Fallback to endpoint path analysis
	pathSegments = endpoint.endpoint.split("/").filter(s => s.length > 0)
	IF pathSegments.length > 0 {
		firstSegment = pathSegments[0].toLowerCase()
		
		// Map common API patterns to categories
		categoryMap = {
			"pages": "content",
			"assets": "media",
			"users": "user-management",
			"workflows": "workflow",
			"schemas": "schema",
			"site": "site-management"
		}
		
		RETURN categoryMap[firstSegment] || firstSegment
	}
	
	// Default category
	RETURN "general"
}
```

## Formatting Logic
```typescript
FUNCTION formatEndpointListing(categorized: CategorizedEndpoints, includeDetails: boolean) -> FormattedListing {
	// TDD Anchor: Test formatting for both detail levels
	
	formatted = {}
	
	FOR EACH [category, endpoints] IN Object.entries(categorized) {
		formatted[category] = endpoints.map(endpoint => 
			formatSingleEndpoint(endpoint, includeDetails)
		)
	}
	
	RETURN formatted
}

FUNCTION formatSingleEndpoint(endpoint: MCPToolDef, includeDetails: boolean) -> FormattedEndpoint {
	// TDD Anchor: Test endpoint formatting
	
	basic = {
		tool_name: endpoint.tool_name,
		method: endpoint.method,
		endpoint: endpoint.endpoint,
		description: endpoint.description
	}
	
	IF !includeDetails {
		RETURN basic
	}
	
	// Add detailed information
	detailed = {
		...basic,
		tags: endpoint.tags || [],
		has_path_params: hasPathParameters(endpoint.endpoint),
		requires_body: ["POST", "PUT", "PATCH"].includes(endpoint.method),
		parameter_count: countParameters(endpoint.input_schema)
	}
	
	RETURN detailed
}

FUNCTION hasPathParameters(endpointPath: string) -> boolean {
	// TDD Anchor: Test path parameter detection
	RETURN endpointPath.includes("{") AND endpointPath.includes("}")
}

FUNCTION countParameters(inputSchema: object) -> number {
	// TDD Anchor: Test parameter counting
	
	IF !inputSchema OR !inputSchema.properties {
		RETURN 0
	}
	
	RETURN Object.keys(inputSchema.properties).length
}
```

## LLM Selection Instructions
```typescript
FUNCTION generateLLMSelectionInstructions() -> string {
	// TDD Anchor: Test instruction generation
	
	RETURN `
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
	`.trim()
}
```

## Error Handling
```typescript
FUNCTION handleListerError(error: Error) -> EndpointListerErrorResponse {
	// TDD Anchor: Test error handling scenarios
	
	IF error instanceof ValidationError {
		RETURN {
			success: false,
			error: "Invalid input",
			message: error.message,
			available_filters: {
				methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
				categories: getAvailableCategories()
			}
		}
	}
	
	IF error instanceof EndpointLoadError {
		RETURN {
			success: false,
			error: "Failed to load endpoints",
			message: "Unable to load Swagger endpoint definitions",
			suggestion: "Check if mcp-tools-generated directory contains valid tool definitions"
		}
	}
	
	// Generic error
	logger.error("Endpoint lister error", error)
	RETURN {
		success: false,
		error: "Listing failed",
		message: "Unable to generate endpoint listing",
		suggestion: "Please try again or contact support"
	}
}

FUNCTION getAvailableCategories() -> string[] {
	// TDD Anchor: Test category discovery
	
	TRY {
		allEndpoints = loadSwaggerToolDefs()
		categories = new Set()
		
		FOR EACH endpoint IN allEndpoints {
			category = determinePrimaryCategory(endpoint)
			categories.add(category)
		}
		
		RETURN Array.from(categories).sort()
	} CATCH (error) {
		RETURN []
	}
}
```

## Response Types
```typescript
TYPE EndpointListingResponse = {
	success: true
	total_endpoints: number
	categories: string[]
	endpoints: FormattedListing
	instructions: string
}

TYPE EndpointListerErrorResponse = {
	success: false
	error: string
	message: string
	suggestion?: string
	available_filters?: object
}

TYPE FormattedListing = {
	[category: string]: FormattedEndpoint[]
}

TYPE FormattedEndpoint = {
	tool_name: string
	method: string
	endpoint: string
	description: string
	tags?: string[]
	has_path_params?: boolean
	requires_body?: boolean
	parameter_count?: number
}

TYPE CategorizedEndpoints = {
	[category: string]: MCPToolDef[]
}

TYPE ValidatedListerArgs = {
	category_filter: string | null
	method_filter: string | null
	search_term: string | null
	include_details: boolean
}
```

## Constants
```typescript
CONSTANTS {
	MINIMUM_SEARCH_LENGTH = 2
	DEFAULT_INCLUDE_DETAILS = false
	SUPPORTED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]
	DEFAULT_CATEGORY = "general"
}
```

## TDD Test Anchor Summary
1. **Input Validation**: Filter validation, search term validation
2. **Endpoint Loading**: Successful/failed loading scenarios
3. **Filtering Logic**: Method, category, search term filters
4. **Categorization**: Tag-based and path-based categorization
5. **Sorting**: Method and path-based sorting
6. **Formatting**: Basic and detailed formatting modes
7. **Parameter Detection**: Path parameters, body requirements
8. **Instruction Generation**: Clear LLM guidance
9. **Error Handling**: All error types and edge cases
10. **Performance**: Large endpoint set handling
11. **Integration**: End-to-end listing workflow
12. **Category Discovery**: Dynamic category detection