# Debug CMS List Pages Tool - Technical Specification

## Overview

Standalone TypeScript debug script for testing the `cms_list_pages` tool in isolation from the Ingeniux CMS MCP server. The script connects to real CMS API using existing project architecture and provides comprehensive debugging capabilities.

## Requirements

### Functional Requirements
- **FR-1**: Test `cms_list_pages` tool with various parameter combinations
- **FR-2**: Connect to real CMS API using existing authentication flow
- **FR-3**: Load configuration from environment variables (no hard-coded credentials)
- **FR-4**: Provide detailed debug output and error information
- **FR-5**: Handle authentication failures gracefully
- **FR-6**: Support all `cms_list_pages` parameters: `parentId`, `template`, `page`, `limit`

### Non-Functional Requirements
- **NFR-1**: File must be under 500 lines
- **NFR-2**: Use tabs for indentation
- **NFR-3**: Runnable with `tsx debug-cms-list-pages.ts`
- **NFR-4**: Integrate with existing project modules
- **NFR-5**: Comprehensive error handling and logging

## Architecture

### Module Dependencies
```typescript
// Core project modules
import { APIClient } from './src/api/api-client.js'
import { ContentTools } from './src/tools/content-tools.js'
import { configManager } from './src/utils/config-manager.js'
import { OAuthManager } from './src/auth/oauth-manager.js'
import { errorHandler } from './src/utils/error-handler.js'
```

### Test Scenarios
1. **Basic List**: No parameters
2. **Pagination**: Various page/limit combinations
3. **Parent Filter**: Specific parentId values
4. **Template Filter**: Template-based filtering
5. **Combined Parameters**: Multiple filters together
6. **Edge Cases**: Invalid parameters, large limits, non-existent IDs

## Implementation Specification

### 1. Configuration Module (`DebugConfig`)
```typescript
interface DebugConfig {
	scenarios: TestScenario[]
	outputFormat: 'json' | 'table' | 'detailed'
	maxRetries: number
	timeoutMs: number
}

interface TestScenario {
	name: string
	description: string
	parameters: ListPagesParams
	expectedBehavior: 'success' | 'error' | 'empty'
}
```

**Pseudocode:**
```
FUNCTION loadDebugConfig():
	LOAD environment variables using configManager
	VALIDATE required variables exist
	CREATE test scenarios array
	RETURN DebugConfig object
```

### 2. Authentication Module (`AuthHandler`)
```typescript
class AuthHandler {
	private oauthManager: OAuthManager
	private isAuthenticated: boolean
}
```

**Pseudocode:**
```
FUNCTION initializeAuth():
	CREATE OAuthManager instance with config
	CHECK if existing valid token exists
	IF no valid token:
		INITIATE OAuth flow
		WAIT for user authorization
		EXCHANGE code for token
	RETURN authentication status

FUNCTION ensureValidToken():
	CHECK token validity
	IF token expired or expires soon:
		REFRESH token
	RETURN valid access token
```

### 3. Test Executor Module (`TestExecutor`)
```typescript
class TestExecutor {
	private apiClient: APIClient
	private contentTools: ContentTools
	private authHandler: AuthHandler
}
```

**Pseudocode:**
```
FUNCTION executeTestScenario(scenario: TestScenario):
	LOG scenario start
	TRY:
		ENSURE valid authentication
		GET cms_list_pages tool from ContentTools
		EXECUTE tool with scenario parameters
		MEASURE execution time
		VALIDATE response structure
		LOG success with details
		RETURN TestResult
	CATCH error:
		LOG error details
		CLASSIFY error type
		RETURN error TestResult

FUNCTION runAllScenarios():
	FOR each scenario in config.scenarios:
		EXECUTE scenario
		COLLECT results
		WAIT between tests (rate limiting)
	RETURN aggregated results
```

### 4. Output Formatter Module (`OutputFormatter`)
```typescript
interface TestResult {
	scenarioName: string
	success: boolean
	executionTimeMs: number
	responseData?: any
	errorDetails?: string
	timestamp: Date
}
```

**Pseudocode:**
```
FUNCTION formatResults(results: TestResult[]):
	SWITCH config.outputFormat:
		CASE 'json':
			RETURN JSON.stringify(results, null, 2)
		CASE 'table':
			RETURN formatted table view
		CASE 'detailed':
			RETURN comprehensive debug output

FUNCTION logTestResult(result: TestResult):
	LOG scenario name and status
	IF success:
		LOG response summary
		LOG execution time
	ELSE:
		LOG error details
		LOG troubleshooting hints
```

### 5. Main Debug Script Structure
```typescript
// File: debug-cms-list-pages.ts (< 500 lines)
async function main(): Promise<void> {
	// Configuration and setup
	// Authentication initialization  
	// Test execution
	// Results output
	// Cleanup
}
```

**Pseudocode:**
```
FUNCTION main():
	TRY:
		LOG script start
		
		// Setup phase
		LOAD debug configuration
		INITIALIZE authentication handler
		CREATE API client instance
		CREATE ContentTools instance
		
		// Authentication phase
		ENSURE user is authenticated
		VALIDATE API connectivity
		
		// Testing phase
		CREATE test executor
		RUN all test scenarios
		COLLECT results
		
		// Output phase
		FORMAT and DISPLAY results
		GENERATE summary statistics
		
		LOG script completion
		
	CATCH configuration error:
		LOG configuration issues
		DISPLAY setup instructions
		EXIT with code 1
		
	CATCH authentication error:
		LOG auth failure details
		DISPLAY OAuth instructions
		EXIT with code 2
		
	CATCH API error:
		LOG API connectivity issues
		DISPLAY troubleshooting guide
		EXIT with code 3
		
	CATCH unexpected error:
		LOG full error details
		EXIT with code 99
```

## Test Scenarios Definition

### Scenario 1: Basic List Pages
```typescript
{
	name: "basic_list_pages",
	description: "Basic cms_list_pages call without parameters",
	parameters: {},
	expectedBehavior: "success"
}
```

### Scenario 2: Pagination Test
```typescript
{
	name: "list_pages_with_pagination", 
	description: "List pages with pagination parameters",
	parameters: { page: 1, limit: 10 },
	expectedBehavior: "success"
}
```

### Scenario 3: Parent Filter
```typescript
{
	name: "list_pages_with_parent",
	description: "List pages with specific parentId",
	parameters: { parentId: "test-parent-id" },
	expectedBehavior: "success"
}
```

### Scenario 4: Template Filter
```typescript
{
	name: "list_pages_with_template",
	description: "List pages filtered by template",
	parameters: { template: "article" },
	expectedBehavior: "success"
}
```

### Scenario 5: Combined Parameters
```typescript
{
	name: "list_pages_comprehensive",
	description: "List pages with all parameters",
	parameters: {
		parentId: "root",
		page: 1,
		limit: 5,
		template: "page"
	},
	expectedBehavior: "success"
}
```

### Scenario 6: Edge Cases
```typescript
{
	name: "list_pages_large_limit",
	description: "Test with large page limit",
	parameters: { page: 1, limit: 100 },
	expectedBehavior: "success"
},
{
	name: "list_pages_invalid_parent",
	description: "Test with non-existent parentId", 
	parameters: { parentId: "non-existent-parent-id" },
	expectedBehavior: "empty"
},
{
	name: "list_pages_edge_case_pagination",
	description: "Test edge case pagination values",
	parameters: { page: 999, limit: 1 },
	expectedBehavior: "empty"
}
```

## Environment Configuration

### Required Environment Variables
```bash
# From .env file
CMS_BASE_URL=https://your-cms-instance.com/api
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
```

### Optional Environment Variables
```bash
API_TIMEOUT=30000
MAX_RETRIES=3
LOG_LEVEL=debug
DEBUG_OUTPUT_FORMAT=detailed
DEBUG_MAX_SCENARIOS=10
```

## Error Handling Strategy

### Error Categories
1. **Configuration Errors**: Missing env vars, invalid config
2. **Authentication Errors**: OAuth failures, token issues
3. **API Errors**: Network issues, server errors
4. **Tool Errors**: cms_list_pages specific failures
5. **Validation Errors**: Invalid parameters

### Error Recovery
```typescript
// Retry logic for transient errors
const retryableErrors = ['NETWORK_ERROR', 'HTTP_5XX', 'TIMEOUT']

async function executeWithRetry(operation: () => Promise<any>): Promise<any> {
	for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
		try {
			return await operation()
		} catch (error) {
			if (attempt === config.maxRetries || !isRetryable(error)) {
				throw error
			}
			await sleep(1000 * attempt) // Exponential backoff
		}
	}
}
```

## Output Format Examples

### JSON Format
```json
{
	"summary": {
		"totalScenarios": 7,
		"successful": 5,
		"failed": 2,
		"executionTimeMs": 2340
	},
	"results": [
		{
			"scenarioName": "basic_list_pages",
			"success": true,
			"executionTimeMs": 234,
			"responseData": { "pages": [...], "total": 42 },
			"timestamp": "2025-01-11T17:27:00.000Z"
		}
	]
}
```

### Table Format
```
┌─────────────────────────────┬─────────┬──────────┬─────────────┐
│ Scenario                    │ Status  │ Time(ms) │ Records     │
├─────────────────────────────┼─────────┼──────────┼─────────────┤
│ basic_list_pages           │ ✓ PASS  │ 234      │ 42 pages    │
│ list_pages_with_pagination │ ✓ PASS  │ 187      │ 10 pages    │
│ list_pages_invalid_parent  │ ✗ FAIL  │ 156      │ Auth Error  │
└─────────────────────────────┴─────────┴──────────┴─────────────┘
```

## File Structure

```
debug-cms-list-pages.ts (< 500 lines)
├── Imports and interfaces (50 lines)
├── DebugConfig class (80 lines)
├── AuthHandler class (100 lines)  
├── TestExecutor class (120 lines)
├── OutputFormatter class (80 lines)
└── Main function and execution (70 lines)
```

## Usage Instructions

### Installation
```bash
# Ensure dependencies are installed
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your CMS credentials
```

### Execution
```bash
# Run debug script
tsx debug-cms-list-pages.ts

# Run with specific output format
DEBUG_OUTPUT_FORMAT=json tsx debug-cms-list-pages.ts

# Run with debug logging
LOG_LEVEL=debug tsx debug-cms-list-pages.ts
```

### Expected Output
1. Configuration validation
2. Authentication status
3. Test scenario execution progress
4. Detailed results for each scenario
5. Summary statistics
6. Troubleshooting recommendations (if errors)

## Testing Strategy

### Unit Test Anchors
- `DebugConfig.loadConfiguration()` - Config validation
- `AuthHandler.initializeAuth()` - Authentication flow
- `TestExecutor.executeTestScenario()` - Individual test execution
- `OutputFormatter.formatResults()` - Output formatting

### Integration Test Points
- End-to-end scenario execution
- Error handling workflows
- Authentication token refresh
- API connectivity validation

## Security Considerations

1. **No Hard-coded Credentials**: All sensitive data from environment
2. **Token Security**: Secure token storage and refresh
3. **Input Validation**: Validate all test parameters
4. **Error Sanitization**: Don't expose sensitive data in logs
5. **Rate Limiting**: Respect API rate limits

## Performance Considerations

1. **Concurrent Execution**: Run scenarios sequentially to avoid rate limits
2. **Memory Management**: Clean up resources after each test
3. **Timeout Handling**: Configurable timeouts for all operations
4. **Progress Reporting**: Real-time progress updates for long runs

## Maintenance and Extensibility

1. **Modular Design**: Easy to add new test scenarios
2. **Configuration Driven**: Scenarios defined in config, not code
3. **Plugin Architecture**: Easy to extend with new output formats
4. **Version Compatibility**: Compatible with existing project structure