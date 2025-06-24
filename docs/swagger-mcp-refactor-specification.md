# Swagger MCP Tools Refactor Specification

## Overview
Refactor the current monolithic `swagger-mcp-tools.ts` into a 3-tool system with clear separation of concerns for improved LLM decision-making and better user experience.

## Current System Analysis
- Single tool system loads all Swagger endpoints as individual MCP tools
- No structured way for LLM to discover available endpoints
- Direct execution without proper schema validation
- 126 lines in single file

## Requirements
- Each file < 500 lines
- No hard-coded environment variables
- Modular, testable, maintainable architecture
- Tab indentation only
- English code/comments
- Clear LLM decision workflow
- Comprehensive schema validation

## Architecture

### Tool 1: Endpoint Lister Tool
**File**: `src/tools/endpoint-lister.ts`
**Purpose**: Provide comprehensive endpoint listing for LLM decision-making

**Key Components**:
- Endpoint discovery and categorization
- Structured endpoint presentation
- Search and filtering capabilities
- Clear descriptions for LLM understanding

### Tool 2: Schema Provider Tool
**File**: `src/tools/schema-provider.ts`
**Purpose**: Provide endpoint schemas and execution instructions based on LLM selection

**Key Components**:
- Endpoint validation and lookup
- Input/output schema extraction
- Parameter guidance generation
- Execution instruction formatting

### Tool 3: Endpoint Executor Tool
**File**: `src/tools/endpoint-executor.ts`
**Purpose**: Execute validated API calls with resolved endpoint paths

**Key Components**:
- HTTP method handling (GET, POST, PUT, DELETE, PATCH)
- Parameter validation and transformation
- Response formatting
- Error handling and logging

## Implementation Details

### 3-Tool Workflow
1. **LLM calls `cms_endpoint_lister`** → Gets organized endpoint listing
2. **LLM selects endpoint and calls `cms_schema_provider`** → Gets schemas and execution instructions
3. **LLM calls `cms_endpoint_executor`** → Executes the API request

### Endpoint Lister Logic Flow
1. Receive optional filters (category, method, search term)
2. Load and validate all Swagger endpoints
3. Apply filtering based on user criteria
4. Categorize endpoints by tags/path analysis
5. Format endpoints with appropriate detail level
6. Return organized listing with LLM selection instructions

### Schema Provider Logic Flow
1. Receive LLM-selected endpoint details (tool_name, method, path)
2. Find exact matching endpoint definition
3. Extract and normalize input/output schemas
4. Analyze parameter types and requirements
5. Generate comprehensive execution instructions
6. Return schemas with detailed parameter guidance

### Endpoint Executor Logic Flow
1. Receive endpoint path, method, and parameters from LLM
2. Validate endpoint exists and parameters match schema
3. Prepare HTTP request based on method type
4. Execute HTTP request via APIClient
5. Format and return response with metadata
6. Handle errors with detailed logging

### LLM Selection Instructions Format
**From Endpoint Lister:**
```
Use cms_schema_provider with:
{
  "tool_name": "get_page_by_id",
  "method": "GET",
  "endpoint_path": "/api/pages/{id}"
}
```

**From Schema Provider:**
```javascript
{
  "tool_name": "cms_endpoint_executor",
  "parameters": {
    "endpoint_path": "/api/pages/{id}",
    "method": "GET",
    "request_data": {
      "id": "page123"
    }
  }
}
```

## TDD Anchor Points

### Endpoint Lister Tests
- Endpoint loading and validation
- Filtering logic (category, method, search)
- Categorization accuracy
- Sorting and formatting
- Error handling scenarios
- LLM instruction generation

### Schema Provider Tests
- Endpoint lookup and matching
- Schema extraction and normalization
- Parameter analysis and categorization
- Execution instruction generation
- Example generation
- Comprehensive error handling

### Endpoint Executor Tests
- HTTP method handling
- Parameter validation and separation
- Request preparation and execution
- Response formatting
- Error logging and recovery
- APIClient integration

### Integration Tests
- End-to-end 3-tool workflow
- LLM decision-making workflow
- Cross-tool data validation
- Error propagation across tools
- Performance benchmarks

## File Structure
```
src/tools/
├── endpoint-lister.ts           (< 500 lines)
├── schema-provider.ts           (< 500 lines)
├── endpoint-executor.ts         (< 500 lines)
├── utils/
│   ├── endpoint-categorizer.ts  (< 500 lines)
│   ├── schema-normalizer.ts     (< 500 lines)
│   └── instruction-builder.ts   (< 500 lines)
└── types/
    └── tool-types.ts            (< 500 lines)
```

## Migration Strategy
1. Create new 3-tool files with comprehensive tests
2. Implement Endpoint Lister with categorization logic
3. Implement Schema Provider with parameter analysis
4. Implement Endpoint Executor
5. Update tool registry to use new 3-tool system
6. Deprecate old swagger-mcp-tools.ts
7. Update documentation and examples
8. Test LLM workflow integration

## Success Criteria
- Clear endpoint discovery workflow for LLM
- Structured schema provision with execution guidance
- All HTTP methods supported with proper validation
- Comprehensive error handling with helpful suggestions
- < 500 lines per file maintained
- 100% test coverage for all core logic
- Seamless LLM decision-making workflow