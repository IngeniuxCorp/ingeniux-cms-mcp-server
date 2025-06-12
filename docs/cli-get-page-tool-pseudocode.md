# CLI Get Page Tool - Pseudocode Implementation

## Module 1: Main CLI Entry Point
**File**: `src/cli/tools/get-page-cli.ts`

```typescript
// Main CLI entry point for get page tool
IMPORT { parseArguments, showHelp } from './get-page-argument-parser'
IMPORT { GetPageExecutor } from './get-page-executor'
IMPORT { GetPageFormatter } from './get-page-formatter'
IMPORT { CLIConfigHandler } from '../cli-config'
IMPORT { logger } from '../../utils/logger'

FUNCTION main():
	TRY:
		// Parse command line arguments
		arguments = parseArguments(process.argv)
		
		// Show help if requested
		IF arguments.help:
			showHelp()
			process.exit(0)
		
		// Load configuration
		configHandler = NEW CLIConfigHandler()
		config = AWAIT configHandler.loadConfig(arguments)
		
		// Initialize executor
		executor = NEW GetPageExecutor(config)
		
		// Execute get page request
		result = AWAIT executor.execute({
			pageId: arguments.pageId,
			path: arguments.path,
			includeContent: arguments.includeContent ?? true
		})
		
		// Format and display output
		formatter = NEW GetPageFormatter(config.format)
		output = formatter.format(result)
		
		console.log(output.content)
		process.exit(output.exitCode)
		
	CATCH error:
		logger.error('CLI execution failed', { error })
		console.error(`Error: ${error.message}`)
		
		IF error.suggestions:
			console.error('Suggestions:')
			FOR suggestion IN error.suggestions:
				console.error(`  - ${suggestion}`)
		
		process.exit(1)

// Export for testing
EXPORT { main }

// Execute if called directly
IF require.main === module:
	main()
```

## Module 2: Argument Parser
**File**: `src/cli/tools/get-page-argument-parser.ts`

```typescript
// Command line argument parsing for get page tool
IMPORT { GetPageCLIOptions } from './types/get-page-types'

FUNCTION parseArguments(argv: string[]): GetPageCLIOptions:
	options = {
		format: 'table',
		timeout: 300,
		verbose: false,
		includeContent: true
	}
	
	// Parse arguments starting from index 2 (skip node and script name)
	FOR i = 2 TO argv.length - 1:
		arg = argv[i]
		
		SWITCH arg:
			CASE '--pageId':
				options.pageId = getNextArgument(argv, i)
				i++
			CASE '--path':
				options.path = getNextArgument(argv, i)
				i++
			CASE '--includeContent':
				options.includeContent = parseBoolean(getNextArgument(argv, i))
				i++
			CASE '--format':
				options.format = validateFormat(getNextArgument(argv, i))
				i++
			CASE '--timeout':
				options.timeout = parseInt(getNextArgument(argv, i))
				i++
			CASE '--verbose':
				options.verbose = true
			CASE '--help':
				options.help = true
			DEFAULT:
				THROW NEW Error(`Unknown argument: ${arg}`)
	
	// Validate required parameters
	validateArguments(options)
	
	RETURN options

FUNCTION getNextArgument(argv: string[], currentIndex: number): string:
	nextIndex = currentIndex + 1
	IF nextIndex >= argv.length:
		THROW NEW Error(`Missing value for argument: ${argv[currentIndex]}`)
	RETURN argv[nextIndex]

FUNCTION parseBoolean(value: string): boolean:
	lowerValue = value.toLowerCase()
	IF lowerValue IN ['true', '1', 'yes', 'on']:
		RETURN true
	IF lowerValue IN ['false', '0', 'no', 'off']:
		RETURN false
	THROW NEW Error(`Invalid boolean value: ${value}`)

FUNCTION validateFormat(format: string): 'json' | 'table' | 'minimal':
	validFormats = ['json', 'table', 'minimal']
	IF format NOT IN validFormats:
		THROW NEW Error(`Invalid format: ${format}. Valid options: ${validFormats.join(', ')}`)
	RETURN format

FUNCTION validateArguments(options: GetPageCLIOptions): void:
	IF NOT options.pageId AND NOT options.path:
		THROW NEW Error('Either --pageId or --path is required')
	
	IF options.pageId AND options.path:
		THROW NEW Error('Cannot specify both --pageId and --path')
	
	IF options.timeout < 30 OR options.timeout > 1800:
		THROW NEW Error('Timeout must be between 30 and 1800 seconds')

FUNCTION showHelp(): void:
	helpText = `
Usage: npm run test-get-page -- [options]

Options:
  --pageId <id>           Page ID to retrieve
  --path <path>           Page path to retrieve (alternative to pageId)
  --includeContent <bool> Include page content (default: true)
  --format <format>       Output format: json, table, minimal (default: table)
  --timeout <seconds>     Request timeout in seconds (default: 300)
  --verbose               Enable verbose logging
  --help                  Show this help message

Examples:
  npm run test-get-page -- --pageId "123"
  npm run test-get-page -- --path "/home" --format json
  npm run test-get-page -- --pageId "456" --includeContent false --verbose
`
	console.log(helpText)

EXPORT { parseArguments, showHelp }
```

## Module 3: Get Page Executor
**File**: `src/cli/tools/get-page-executor.ts`

```typescript
// Core execution logic for get page tool
IMPORT { APIClient } from '../../api/api-client'
IMPORT { ContentTools } from '../../tools/content-tools'
IMPORT { GetPageRequest, GetPageResult } from './types/get-page-types'
IMPORT { CLIConfig } from '../types/cli-types'
IMPORT { logger } from '../../utils/logger'
IMPORT { generateRequestId } from '../../utils/request-utils'

CLASS GetPageExecutor:
	PRIVATE apiClient: APIClient
	PRIVATE contentTools: ContentTools
	PRIVATE config: CLIConfig
	
	CONSTRUCTOR(config: CLIConfig):
		this.config = config
		this.apiClient = APIClient.getInstance(config)
		this.contentTools = NEW ContentTools(this.apiClient)
	
	PUBLIC ASYNC execute(request: GetPageRequest): Promise<GetPageResult>:
		requestId = generateRequestId()
		startTime = Date.now()
		
		TRY:
			// Log request start
			IF this.config.verbose:
				logger.info('Starting get page request', {
					requestId,
					pageId: request.pageId,
					path: request.path,
					includeContent: request.includeContent
				})
			
			// Validate request
			this.validateRequest(request)
			
			// Get the cms_get_page tool
			tools = this.contentTools.getTools()
			getPageTool = tools.find(tool => tool.name === 'cms_get_page')
			
			IF NOT getPageTool:
				THROW NEW Error('cms_get_page tool not found')
			
			// Prepare tool parameters
			toolParams = this.prepareToolParameters(request)
			
			// Execute tool with timeout
			toolResult = AWAIT this.executeWithTimeout(
				getPageTool.handler(toolParams),
				this.config.timeoutSeconds * 1000
			)
			
			// Process tool result
			result = this.processToolResult(toolResult, requestId, startTime)
			
			// Log success
			IF this.config.verbose:
				logger.info('Get page request completed', {
					requestId,
					success: result.success,
					duration: result.metadata.duration
				})
			
			RETURN result
			
		CATCH error:
			duration = Date.now() - startTime
			
			// Log error
			logger.error('Get page request failed', {
				requestId,
				error: error.message,
				duration
			})
			
			// Return error result
			RETURN {
				success: false,
				error: this.formatError(error),
				metadata: {
					requestId,
					timestamp: NEW Date(),
					duration,
					endpoint: this.buildEndpoint(request)
				}
			}
	
	PRIVATE validateRequest(request: GetPageRequest): void:
		IF NOT request.pageId AND NOT request.path:
			THROW NEW Error('Either pageId or path is required')
		
		IF request.pageId AND request.path:
			THROW NEW Error('Cannot specify both pageId and path')
		
		// Validate pageId format if provided
		IF request.pageId:
			IF NOT this.isValidPageId(request.pageId):
				THROW NEW Error('Invalid pageId format')
		
		// Validate path format if provided
		IF request.path:
			IF NOT this.isValidPath(request.path):
				THROW NEW Error('Invalid path format')
	
	PRIVATE prepareToolParameters(request: GetPageRequest): any:
		params = {
			includeContent: request.includeContent
		}
		
		IF request.pageId:
			params.pageId = request.pageId
		ELSE:
			params.path = request.path
		
		RETURN params
	
	PRIVATE ASYNC executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T>:
		timeoutPromise = NEW Promise((_, reject) => {
			setTimeout(() => {
				reject(NEW Error(`Request timed out after ${timeoutMs}ms`))
			}, timeoutMs)
		})
		
		RETURN Promise.race([promise, timeoutPromise])
	
	PRIVATE processToolResult(toolResult: any, requestId: string, startTime: number): GetPageResult:
		duration = Date.now() - startTime
		
		// Check if tool result indicates success
		IF toolResult.content AND toolResult.content.length > 0:
			// Parse JSON content if possible
			TRY:
				data = JSON.parse(toolResult.content[0].text)
				RETURN {
					success: true,
					data,
					metadata: {
						requestId,
						timestamp: NEW Date(),
						duration,
						endpoint: this.buildEndpointFromData(data)
					}
				}
			CATCH parseError:
				// Return raw content if JSON parsing fails
				RETURN {
					success: true,
					data: { rawContent: toolResult.content[0].text },
					metadata: {
						requestId,
						timestamp: NEW Date(),
						duration,
						endpoint: 'unknown'
					}
				}
		ELSE:
			THROW NEW Error('Empty or invalid tool result')
	
	PRIVATE formatError(error: any): string:
		IF error.message:
			RETURN error.message
		IF typeof error === 'string':
			RETURN error
		RETURN 'Unknown error occurred'
	
	PRIVATE buildEndpoint(request: GetPageRequest): string:
		IF request.pageId:
			RETURN `/pages/${request.pageId}`
		IF request.path:
			RETURN `/pages?path=${encodeURIComponent(request.path)}`
		RETURN '/pages'
	
	PRIVATE buildEndpointFromData(data: any): string:
		IF data.id:
			RETURN `/pages/${data.id}`
		IF data.path:
			RETURN `/pages?path=${encodeURIComponent(data.path)}`
		RETURN '/pages'
	
	PRIVATE isValidPageId(pageId: string): boolean:
		// Basic validation - non-empty string, reasonable length
		RETURN pageId.length > 0 AND pageId.length <= 100 AND /^[a-zA-Z0-9\-_]+$/.test(pageId)
	
	PRIVATE isValidPath(path: string): boolean:
		// Basic validation - starts with /, reasonable length
		RETURN path.startsWith('/') AND path.length <= 500

EXPORT { GetPageExecutor }
```

## Module 4: Output Formatter
**File**: `src/cli/tools/get-page-formatter.ts`

```typescript
// Output formatting for get page tool results
IMPORT { GetPageResult, FormattedOutput } from './types/get-page-types'

CLASS GetPageFormatter:
	PRIVATE format: 'json' | 'table' | 'minimal'
	
	CONSTRUCTOR(format: 'json' | 'table' | 'minimal'):
		this.format = format
	
	PUBLIC format(result: GetPageResult): FormattedOutput:
		SWITCH this.format:
			CASE 'json':
				RETURN this.formatAsJSON(result)
			CASE 'table':
				RETURN this.formatAsTable(result)
			CASE 'minimal':
				RETURN this.formatAsMinimal(result)
			DEFAULT:
				THROW NEW Error(`Unsupported format: ${this.format}`)
	
	PRIVATE formatAsJSON(result: GetPageResult): FormattedOutput:
		content = JSON.stringify(result, null, 2)
		exitCode = result.success ? 0 : 1
		RETURN { content, exitCode }
	
	PRIVATE formatAsTable(result: GetPageResult): FormattedOutput:
		IF NOT result.success:
			RETURN this.formatError(result)
		
		lines = []
		lines.push('┌─────────────────┬──────────────────────────────────┐')
		lines.push('│ Property        │ Value                            │')
		lines.push('├─────────────────┼──────────────────────────────────┤')
		
		// Add data rows
		IF result.data:
			FOR key, value IN result.data:
				IF key !== 'content' OR this.shouldShowContent(value):
					formattedValue = this.formatTableValue(value)
					lines.push(`│ ${this.padRight(key, 15)} │ ${this.padRight(formattedValue, 32)} │`)
		
		// Add metadata
		lines.push('├─────────────────┼──────────────────────────────────┤')
		lines.push(`│ Request ID      │ ${this.padRight(result.metadata.requestId, 32)} │`)
		lines.push(`│ Duration        │ ${this.padRight(result.metadata.duration + 'ms', 32)} │`)
		lines.push(`│ Timestamp       │ ${this.padRight(result.metadata.timestamp.toISOString(), 32)} │`)
		lines.push('└─────────────────┴──────────────────────────────────┘')
		
		RETURN {
			content: lines.join('\n'),
			exitCode: 0
		}
	
	PRIVATE formatAsMinimal(result: GetPageResult): FormattedOutput:
		IF NOT result.success:
			RETURN {
				content: `Error: ${result.error}`,
				exitCode: 1
			}
		
		lines = []
		
		IF result.data:
			IF result.data.id:
				lines.push(`Page ID: ${result.data.id}`)
			IF result.data.title:
				lines.push(`Title: ${result.data.title}`)
			IF result.data.path:
				lines.push(`Path: ${result.data.path}`)
			IF result.data.status:
				lines.push(`Status: ${result.data.status}`)
		
		lines.push(`Result: Success (${result.metadata.duration}ms)`)
		
		RETURN {
			content: lines.join('\n'),
			exitCode: 0
		}
	
	PRIVATE formatError(result: GetPageResult): FormattedOutput:
		lines = []
		lines.push('┌─────────────────┬──────────────────────────────────┐')
		lines.push('│ Error Details   │                                  │')
		lines.push('├─────────────────┼──────────────────────────────────┤')
		lines.push(`│ Message         │ ${this.padRight(result.error || 'Unknown error', 32)} │`)
		lines.push(`│ Request ID      │ ${this.padRight(result.metadata.requestId, 32)} │`)
		lines.push(`│ Duration        │ ${this.padRight(result.metadata.duration + 'ms', 32)} │`)
		lines.push('└─────────────────┴──────────────────────────────────┘')
		
		RETURN {
			content: lines.join('\n'),
			exitCode: 1
		}
	
	PRIVATE formatTableValue(value: any): string:
		IF value === null OR value === undefined:
			RETURN 'N/A'
		IF typeof value === 'object':
			RETURN JSON.stringify(value).substring(0, 30) + '...'
		IF typeof value === 'string' AND value.length > 30:
			RETURN value.substring(0, 30) + '...'
		RETURN String(value)
	
	PRIVATE padRight(str: string, length: number): string:
		IF str.length >= length:
			RETURN str.substring(0, length)
		RETURN str + ' '.repeat(length - str.length)
	
	PRIVATE shouldShowContent(content: any): boolean:
		// Only show content if it's short enough for table display
		IF typeof content === 'string':
			RETURN content.length <= 100
		RETURN true

EXPORT { GetPageFormatter }
```

## Module 5: Type Definitions
**File**: `src/cli/tools/types/get-page-types.ts`

```typescript
// Type definitions for get page CLI tool

INTERFACE GetPageCLIOptions:
	pageId?: string
	path?: string
	includeContent?: boolean
	format: 'json' | 'table' | 'minimal'
	timeout: number
	verbose: boolean
	help?: boolean

INTERFACE GetPageRequest:
	pageId?: string
	path?: string
	includeContent: boolean

INTERFACE GetPageResult:
	success: boolean
	data?: any
	error?: string
	metadata: GetPageMetadata

INTERFACE GetPageMetadata:
	requestId: string
	timestamp: Date
	duration: number
	endpoint: string

INTERFACE FormattedOutput:
	content: string
	exitCode: number

INTERFACE GetPageValidationError:
	field: string
	message: string
	code: string

EXPORT {
	GetPageCLIOptions,
	GetPageRequest,
	GetPageResult,
	GetPageMetadata,
	FormattedOutput,
	GetPageValidationError
}
```

## Module 6: Request Utilities
**File**: `src/utils/request-utils.ts`

```typescript
// Utility functions for request handling

IMPORT { randomBytes } from 'crypto'

FUNCTION generateRequestId(): string:
	// Generate unique request ID
	timestamp = Date.now().toString(36)
	random = randomBytes(4).toString('hex')
	RETURN `req_${timestamp}_${random}`

FUNCTION validateTimeout(timeout: number): number:
	IF timeout < 30:
		RETURN 30
	IF timeout > 1800:
		RETURN 1800
	RETURN timeout

FUNCTION sanitizeForLogging(data: any): any:
	// Remove sensitive data from logging
	IF typeof data !== 'object' OR data === null:
		RETURN data
	
	sanitized = { ...data }
	
	// Remove common sensitive fields
	sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization']
	FOR field IN sensitiveFields:
		IF field IN sanitized:
			sanitized[field] = '[REDACTED]'
	
	RETURN sanitized

EXPORT {
	generateRequestId,
	validateTimeout,
	sanitizeForLogging
}
```

## Module 7: Test Specifications

### Unit Test Structure
```typescript
// Test file: src/cli/tools/__tests__/get-page-cli.test.ts

DESCRIBE 'GetPageCLI':
	DESCRIBE 'argument parsing':
		TEST 'should parse pageId argument':
			args = ['node', 'script', '--pageId', '123']
			result = parseArguments(args)
			EXPECT result.pageId TO_EQUAL '123'
		
		TEST 'should parse path argument':
			args = ['node', 'script', '--path', '/home']
			result = parseArguments(args)
			EXPECT result.path TO_EQUAL '/home'
		
		TEST 'should throw error for missing required arguments':
			args = ['node', 'script']
			EXPECT parseArguments(args) TO_THROW 'Either --pageId or --path is required'
		
		TEST 'should throw error for both pageId and path':
			args = ['node', 'script', '--pageId', '123', '--path', '/home']
			EXPECT parseArguments(args) TO_THROW 'Cannot specify both --pageId and --path'
	
	DESCRIBE 'execution':
		TEST 'should execute get page by ID successfully':
			executor = NEW GetPageExecutor(mockConfig)
			result = AWAIT executor.execute({ pageId: '123', includeContent: true })
			EXPECT result.success TO_BE true
			EXPECT result.data TO_BE_DEFINED
		
		TEST 'should handle API errors gracefully':
			executor = NEW GetPageExecutor(mockConfig)
			mockApiClient.get.mockRejectedValue(NEW Error('API Error'))
			result = AWAIT executor.execute({ pageId: '123', includeContent: true })
			EXPECT result.success TO_BE false
			EXPECT result.error TO_CONTAIN 'API Error'
	
	DESCRIBE 'formatting':
		TEST 'should format JSON output correctly':
			formatter = NEW GetPageFormatter('json')
			result = { success: true, data: { id: '123' }, metadata: mockMetadata }
			output = formatter.format(result)
			EXPECT JSON.parse(output.content) TO_DEEP_EQUAL result
		
		TEST 'should format table output correctly':
			formatter = NEW GetPageFormatter('table')
			result = { success: true, data: { id: '123', title: 'Test' }, metadata: mockMetadata }
			output = formatter.format(result)
			EXPECT output.content TO_CONTAIN '│ id              │ 123'
			EXPECT output.content TO_CONTAIN '│ title           │ Test'
```

### Integration Test Structure
```typescript
// Test file: src/cli/tools/__tests__/get-page-integration.test.ts

DESCRIBE 'GetPage Integration':
	TEST 'should complete full CLI workflow':
		// Mock environment
		process.env.CMS_BASE_URL = 'https://test-cms.com'
		process.env.OAUTH_CLIENT_ID = 'test-client'
		
		// Mock API responses
		mockApiResponse = { data: { id: '123', title: 'Test Page' } }
		
		// Execute CLI
		result = AWAIT executeCliCommand(['--pageId', '123', '--format', 'json'])
		
		// Verify results
		EXPECT result.exitCode TO_EQUAL 0
		parsedOutput = JSON.parse(result.stdout)
		EXPECT parsedOutput.success TO_BE true
		EXPECT parsedOutput.data.id TO_EQUAL '123'
```

## TDD Implementation Flow

### Phase 1: Core Structure
1. Create type definitions
2. Implement argument parser with tests
3. Create basic executor structure
4. Add configuration loading

### Phase 2: Tool Integration
1. Integrate with ContentTools
2. Add API client integration
3. Implement error handling
4. Add timeout management

### Phase 3: Output Formatting
1. Implement JSON formatter
2. Add table formatter
3. Create minimal formatter
4. Add error formatting

### Phase 4: CLI Integration
1. Create main entry point
2. Add help system
3. Integrate with npm scripts
4. Add comprehensive logging

### Phase 5: Testing & Validation
1. Unit tests for all modules
2. Integration tests
3. Error scenario testing
4. Performance validation