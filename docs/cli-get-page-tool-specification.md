# CLI Get Page Tool - Technical Specification

## Overview
A command-line interface tool for testing the `createGetPageTool` handler from the Ingeniux CMS MCP Server. This tool provides direct access to the `cms_get_page` functionality with comprehensive error handling and output formatting.

## Requirements

### Functional Requirements
1. **CLI Interface**: Accept command-line arguments for pageId, path, and includeContent parameters
2. **Configuration Management**: Load environment variables and configuration files without hard-coding secrets
3. **Authentication Integration**: Leverage existing OAuth flow and token management
4. **Output Formatting**: Support multiple output formats (JSON, table, minimal)
5. **Error Handling**: Comprehensive error reporting with actionable suggestions
6. **Validation**: Input parameter validation and API response validation

### Non-Functional Requirements
1. **Modularity**: Each component under 500 lines, split across logical modules
2. **Testability**: TDD-compatible structure with clear interfaces
3. **Performance**: Configurable timeouts and efficient API calls
4. **Usability**: Clear help text and intuitive command structure
5. **Maintainability**: TypeScript with proper type definitions

## Architecture

### Module Structure
```
src/cli/tools/
├── get-page-cli.ts           # Main CLI entry point
├── get-page-executor.ts      # Tool execution logic
├── get-page-formatter.ts     # Output formatting
├── get-page-validator.ts     # Input validation
└── types/
    └── get-page-types.ts     # Type definitions
```

### Integration Points
- **APIClient**: Reuse existing HTTP client with authentication
- **ContentTools**: Direct integration with createGetPageTool handler
- **CLIConfig**: Leverage existing configuration management
- **Error Handler**: Use existing error handling utilities

## CLI Interface

### Command Structure
```bash
npm run test-get-page -- [options]
```

### Arguments
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `--pageId` | string | No* | Unique identifier of the page |
| `--path` | string | No* | Path of the page (alternative to pageId) |
| `--includeContent` | boolean | No | Include page content (default: true) |
| `--format` | string | No | Output format: json, table, minimal (default: table) |
| `--timeout` | number | No | Request timeout in seconds (default: 300) |
| `--verbose` | boolean | No | Enable verbose logging (default: false) |
| `--help` | boolean | No | Show help information |

*Either pageId or path is required

### Examples
```bash
# Get page by ID
npm run test-get-page -- --pageId "123" --format json

# Get page by path
npm run test-get-page -- --path "/home" --includeContent false

# Verbose output with custom timeout
npm run test-get-page -- --pageId "456" --verbose --timeout 60
```

## Configuration

### Environment Variables
- `CMS_BASE_URL`: Base URL for CMS API
- `OAUTH_CLIENT_ID`: OAuth client identifier
- `OAUTH_CLIENT_SECRET`: OAuth client secret
- `OAUTH_AUTHORIZATION_URL`: OAuth authorization endpoint
- `OAUTH_TOKEN_URL`: OAuth token endpoint
- `OAUTH_REDIRECT_URI`: OAuth redirect URI

### Configuration Files
- `.env`: Environment-specific variables
- `dev-config.json`: Development configuration overrides

## Data Structures

### Input Types
```typescript
interface GetPageCLIOptions {
	pageId?: string;
	path?: string;
	includeContent?: boolean;
	format: 'json' | 'table' | 'minimal';
	timeout: number;
	verbose: boolean;
	help?: boolean;
}

interface GetPageRequest {
	pageId?: string;
	path?: string;
	includeContent: boolean;
}
```

### Output Types
```typescript
interface GetPageResult {
	success: boolean;
	data?: any;
	error?: string;
	metadata: {
		requestId: string;
		timestamp: Date;
		duration: number;
		endpoint: string;
	};
}

interface FormattedOutput {
	content: string;
	exitCode: number;
}
```

## Error Handling

### Error Categories
1. **Configuration Errors**: Missing environment variables, invalid config
2. **Authentication Errors**: OAuth failures, token issues
3. **Validation Errors**: Invalid parameters, missing required fields
4. **API Errors**: Network issues, HTTP errors, CMS-specific errors
5. **System Errors**: Timeouts, resource constraints

### Error Response Format
```typescript
interface CLIError {
	code: string;
	message: string;
	suggestions: string[];
	recoverable: boolean;
	context?: Record<string, any>;
}
```

## Output Formats

### JSON Format
```json
{
	"success": true,
	"data": {
		"id": "123",
		"title": "Home Page",
		"path": "/home",
		"content": "...",
		"metadata": {...}
	},
	"metadata": {
		"requestId": "req_123",
		"timestamp": "2025-01-01T00:00:00Z",
		"duration": 250,
		"endpoint": "/pages/123"
	}
}
```

### Table Format
```
┌─────────────┬──────────────────────────────────┐
│ Property    │ Value                            │
├─────────────┼──────────────────────────────────┤
│ ID          │ 123                              │
│ Title       │ Home Page                        │
│ Path        │ /home                            │
│ Status      │ Published                        │
│ Modified    │ 2025-01-01T00:00:00Z            │
└─────────────┴──────────────────────────────────┘
```

### Minimal Format
```
Page ID: 123
Title: Home Page
Path: /home
Status: Success (250ms)
```

## Security Considerations

### Token Management
- No tokens stored in CLI arguments or logs
- Secure token retrieval from existing token store
- Automatic token refresh when expired

### Input Sanitization
- Validate all CLI arguments
- Sanitize path parameters
- Prevent injection attacks

### Logging
- Mask sensitive data in logs
- Configurable log levels
- Separate audit trail for API calls

## Testing Strategy

### Unit Tests
- Input validation logic
- Output formatting functions
- Error handling scenarios
- Configuration loading

### Integration Tests
- End-to-end CLI execution
- API client integration
- Authentication flow
- Error recovery

### Test Data
```typescript
const testCases = [
	{
		name: 'valid_page_id',
		input: { pageId: '123' },
		expected: { success: true }
	},
	{
		name: 'valid_path',
		input: { path: '/home' },
		expected: { success: true }
	},
	{
		name: 'missing_parameters',
		input: {},
		expected: { success: false, error: 'Either pageId or path is required' }
	}
];
```

## Performance Requirements

### Response Times
- CLI startup: < 2 seconds
- API request: < 30 seconds (configurable)
- Output formatting: < 1 second

### Resource Usage
- Memory: < 100MB
- CPU: Minimal during idle
- Network: Single API request per execution

## Deployment

### NPM Script Integration
```json
{
	"scripts": {
		"test-get-page": "tsx src/cli/tools/get-page-cli.ts"
	}
}
```

### Build Requirements
- TypeScript compilation
- Type checking
- Dependency resolution

## Monitoring and Logging

### Log Levels
- ERROR: Critical failures
- WARN: Recoverable issues
- INFO: Normal operations
- DEBUG: Detailed execution flow

### Metrics
- Request success/failure rates
- Response times
- Authentication success rates
- Error frequency by type

## Future Enhancements

### Planned Features
1. Batch page retrieval
2. Output to file
3. Configuration profiles
4. Interactive mode
5. Shell completion

### Extensibility
- Plugin architecture for custom formatters
- Configurable validation rules
- Custom authentication providers