# Workflow List CLI Tool - Technical Specification

## Overview
CLI utility to test and display results from the `Workflow_ListWorkflowDefinitions` MCP tool. Follows existing CLI patterns with modular architecture, comprehensive error handling, and TDD-ready structure.

## Architecture

### Module Structure
```
src/cli/workflow-list/
├── workflow-list-cli.ts          # Main CLI entry point
├── workflow-list-executor.ts     # Core execution logic
├── workflow-list-formatter.ts    # Output formatting
├── workflow-list-validator.ts    # Input validation
├── workflow-list-types.ts        # Type definitions
└── request-utils.ts              # Shared utilities
```

## Detailed Pseudocode

### 1. workflow-list-types.ts
```typescript
// CLI Options Interface
INTERFACE WorkflowListCLIOptions:
	excludePageCount?: boolean
	pageSize?: number
	startIndex?: number
	format: 'json' | 'table' | 'minimal'
	timeout: number
	verbose: boolean
	help?: boolean

// Request Interface
INTERFACE WorkflowListRequest:
	excludePageCount?: boolean
	pageSize?: number
	startIndex?: number

// Result Interface
INTERFACE WorkflowListResult:
	success: boolean
	data?: WorkflowDefinition[]
	error?: string
	metadata: WorkflowListMetadata

// Metadata Interface
INTERFACE WorkflowListMetadata:
	requestId: string
	timestamp: Date
	duration: number
	endpoint: string
	totalCount?: number

// Workflow Definition Interface
INTERFACE WorkflowDefinition:
	id: string
	name: string
	description?: string
	states: WorkflowState[]
	isActive: boolean
	createdDate: Date
	modifiedDate: Date

// Workflow State Interface
INTERFACE WorkflowState:
	id: string
	name: string
	description?: string
	isInitial: boolean
	isFinal: boolean

// Validation Error Interface
INTERFACE WorkflowListValidationError:
	field: string
	message: string
	code: string

// Formatted Output Interface
INTERFACE FormattedOutput:
	content: string
	exitCode: number
```

### 2. workflow-list-cli.ts
```typescript
CLASS WorkflowListCLI:
	
	// TDD Anchor: CLI Entry Point
	STATIC METHOD main() -> Promise<void>:
		TRY:
			options = parseArguments(process.argv)
			
			IF options.help:
				showHelp()
				EXIT(0)
			
			// TDD Anchor: Validation
			validationErrors = WorkflowListValidator.validateCLIOptions(options)
			IF validationErrors.length > 0:
				displayValidationErrors(validationErrors)
				EXIT(1)
			
			// TDD Anchor: Configuration Loading
			configHandler = NEW CLIConfigHandler()
			config = AWAIT configHandler.loadConfig({
				format: options.format,
				browser: false,
				timeout: options.timeout.toString(),
				verbose: options.verbose
			})
			
			// TDD Anchor: Execution
			executor = NEW WorkflowListExecutor(config)
			request = buildRequest(options)
			result = AWAIT executor.execute(request)
			
			// TDD Anchor: Output Formatting
			formatter = NEW WorkflowListFormatter(config.format)
			output = formatter.formatResult(result)
			
			PRINT(output.content)
			EXIT(output.exitCode)
			
		CATCH error:
			logError(error)
			displayError(error)
			EXIT(1)
	
	// TDD Anchor: Argument Parsing
	STATIC METHOD parseArguments(argv: string[]) -> WorkflowListCLIOptions:
		options = DEFAULT_OPTIONS
		
		FOR i = 2 TO argv.length - 1:
			arg = argv[i]
			
			SWITCH arg:
				CASE '--excludePageCount':
					options.excludePageCount = parseBoolean(getNextArgument(argv, i))
					i++
				CASE '--pageSize':
					options.pageSize = parseInt(getNextArgument(argv, i))
					i++
				CASE '--startIndex':
					options.startIndex = parseInt(getNextArgument(argv, i))
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
					THROW Error("Unknown argument: " + arg)
		
		RETURN options
	
	// TDD Anchor: Help Display
	STATIC METHOD showHelp() -> void:
		helpText = """
		Usage: npm run test-workflow-list -- [options]
		
		Options:
		  --excludePageCount <bool>  Exclude page count from results (default: false)
		  --pageSize <number>        Number of items per page (default: 50)
		  --startIndex <number>      Starting index for pagination (default: 0)
		  --format <format>          Output format: json, table, minimal (default: table)
		  --timeout <seconds>        Request timeout in seconds (default: 300)
		  --verbose                  Enable verbose logging
		  --help                     Show this help message
		
		Examples:
		  npm run test-workflow-list
		  npm run test-workflow-list -- --pageSize 10 --format json
		  npm run test-workflow-list -- --excludePageCount true --verbose
		"""
		PRINT(helpText)
	
	// TDD Anchor: Request Building
	STATIC METHOD buildRequest(options: WorkflowListCLIOptions) -> WorkflowListRequest:
		request = {}
		
		IF options.excludePageCount IS NOT undefined:
			request.excludePageCount = options.excludePageCount
		
		IF options.pageSize IS NOT undefined:
			request.pageSize = options.pageSize
		
		IF options.startIndex IS NOT undefined:
			request.startIndex = options.startIndex
		
		RETURN request
```

### 3. workflow-list-executor.ts
```typescript
CLASS WorkflowListExecutor:
	PRIVATE apiClient: APIClient
	PRIVATE swaggerTools: SwaggerMcpTools
	PRIVATE config: CLIConfig
	
	CONSTRUCTOR(config: CLIConfig):
		this.config = config
		this.apiClient = APIClient.getInstance(convertToServerConfig(config))
		this.swaggerTools = NEW SwaggerMcpTools(this.apiClient)
	
	// TDD Anchor: Main Execution
	METHOD execute(request: WorkflowListRequest) -> Promise<WorkflowListResult>:
		requestId = generateRequestId()
		startTime = Date.now()
		
		TRY:
			// TDD Anchor: Request Logging
			IF this.config.verbose:
				logRequestStart(requestId, request)
			
			// TDD Anchor: Request Validation
			validateRequest(request)
			
			// TDD Anchor: Tool Discovery
			tools = this.swaggerTools.getTools()
			workflowListTool = findTool(tools, 'Workflow_ListWorkflowDefinitions')
			
			IF NOT workflowListTool:
				THROW Error('Workflow_ListWorkflowDefinitions tool not found')
			
			// TDD Anchor: Parameter Preparation
			toolParams = prepareToolParameters(request)
			
			// TDD Anchor: Tool Execution with Timeout
			toolResult = AWAIT executeWithTimeout(
				workflowListTool.handler(toolParams),
				this.config.timeoutSeconds * 1000
			)
			
			// TDD Anchor: Result Processing
			result = processToolResult(toolResult, requestId, startTime)
			
			// TDD Anchor: Success Logging
			IF this.config.verbose:
				logRequestSuccess(requestId, result)
			
			RETURN result
			
		CATCH error:
			duration = Date.now() - startTime
			
			// TDD Anchor: Error Logging
			logRequestError(requestId, error, duration)
			
			// TDD Anchor: Error Result
			RETURN {
				success: false,
				error: formatError(error),
				metadata: {
					requestId: requestId,
					timestamp: NEW Date(),
					duration: duration,
					endpoint: buildEndpoint(request)
				}
			}
	
	// TDD Anchor: Request Validation
	PRIVATE METHOD validateRequest(request: WorkflowListRequest) -> void:
		errors = WorkflowListValidator.validateRequest(request)
		IF errors.length > 0:
			errorMessages = errors.map(e => e.message).join(', ')
			THROW Error('Validation failed: ' + errorMessages)
	
	// TDD Anchor: Parameter Preparation
	PRIVATE METHOD prepareToolParameters(request: WorkflowListRequest) -> object:
		params = {}
		
		IF request.excludePageCount IS NOT undefined:
			params.ExcludePageCount = request.excludePageCount
		
		IF request.pageSize IS NOT undefined:
			params.PageSize = request.pageSize
		
		IF request.startIndex IS NOT undefined:
			params.StartIndex = request.startIndex
		
		RETURN params
	
	// TDD Anchor: Timeout Execution
	PRIVATE METHOD executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number) -> Promise<T>:
		timeoutPromise = NEW Promise((_, reject) => {
			setTimeout(() => {
				reject(NEW Error('Request timed out after ' + timeoutMs + 'ms'))
			}, timeoutMs)
		})
		
		RETURN Promise.race([promise, timeoutPromise])
	
	// TDD Anchor: Result Processing
	PRIVATE METHOD processToolResult(toolResult: any, requestId: string, startTime: number) -> WorkflowListResult:
		duration = Date.now() - startTime
		
		TRY:
			IF toolResult AND toolResult.content AND toolResult.content.length > 0:
				TRY:
					data = JSON.parse(toolResult.content[0].text)
					
					// TDD Anchor: Data Transformation
					workflowDefinitions = transformToWorkflowDefinitions(data)
					
					RETURN {
						success: true,
						data: workflowDefinitions,
						metadata: {
							requestId: requestId,
							timestamp: NEW Date(),
							duration: duration,
							endpoint: '/api/v1/workflows/definitions',
							totalCount: workflowDefinitions.length
						}
					}
				CATCH parseError:
					RETURN {
						success: true,
						data: [{ rawContent: toolResult.content[0].text }],
						metadata: {
							requestId: requestId,
							timestamp: NEW Date(),
							duration: duration,
							endpoint: '/api/v1/workflows/definitions'
						}
					}
			ELSE:
				THROW Error('Empty or invalid tool result')
		CATCH error:
			THROW Error('Failed to process tool result: ' + error.message)
	
	// TDD Anchor: Data Transformation
	PRIVATE METHOD transformToWorkflowDefinitions(data: any) -> WorkflowDefinition[]:
		IF NOT data OR NOT Array.isArray(data):
			RETURN []
		
		RETURN data.map(item => ({
			id: item.id || 'unknown',
			name: item.name || 'Unnamed Workflow',
			description: item.description,
			states: transformWorkflowStates(item.states || []),
			isActive: item.isActive || false,
			createdDate: parseDate(item.createdDate),
			modifiedDate: parseDate(item.modifiedDate)
		}))
	
	// TDD Anchor: State Transformation
	PRIVATE METHOD transformWorkflowStates(states: any[]) -> WorkflowState[]:
		RETURN states.map(state => ({
			id: state.id || 'unknown',
			name: state.name || 'Unnamed State',
			description: state.description,
			isInitial: state.isInitial || false,
			isFinal: state.isFinal || false
		}))
```

### 4. workflow-list-validator.ts
```typescript
CLASS WorkflowListValidator:
	
	// TDD Anchor: CLI Options Validation
	STATIC METHOD validateCLIOptions(options: WorkflowListCLIOptions) -> WorkflowListValidationError[]:
		errors = []
		
		// TDD Anchor: Page Size Validation
		IF options.pageSize IS NOT undefined:
			IF options.pageSize <= 0:
				errors.push({
					field: 'pageSize',
					message: 'Page size must be greater than 0',
					code: 'INVALID_PAGE_SIZE'
				})
			ELSE IF options.pageSize > 1000:
				errors.push({
					field: 'pageSize',
					message: 'Page size cannot exceed 1000',
					code: 'PAGE_SIZE_TOO_LARGE'
				})
		
		// TDD Anchor: Start Index Validation
		IF options.startIndex IS NOT undefined:
			IF options.startIndex < 0:
				errors.push({
					field: 'startIndex',
					message: 'Start index cannot be negative',
					code: 'INVALID_START_INDEX'
				})
		
		// TDD Anchor: Timeout Validation
		IF options.timeout <= 0:
			errors.push({
				field: 'timeout',
				message: 'Timeout must be greater than 0',
				code: 'INVALID_TIMEOUT'
			})
		ELSE IF options.timeout > 3600:
			errors.push({
				field: 'timeout',
				message: 'Timeout cannot exceed 3600 seconds',
				code: 'TIMEOUT_TOO_LARGE'
			})
		
		// TDD Anchor: Format Validation
		validFormats = ['json', 'table', 'minimal']
		IF NOT validFormats.includes(options.format):
			errors.push({
				field: 'format',
				message: 'Format must be one of: ' + validFormats.join(', '),
				code: 'INVALID_FORMAT'
			})
		
		RETURN errors
	
	// TDD Anchor: Request Validation
	STATIC METHOD validateRequest(request: WorkflowListRequest) -> WorkflowListValidationError[]:
		errors = []
		
		// TDD Anchor: Page Size Range Check
		IF request.pageSize IS NOT undefined:
			IF request.pageSize <= 0 OR request.pageSize > 1000:
				errors.push({
					field: 'pageSize',
					message: 'Page size must be between 1 and 1000',
					code: 'PAGE_SIZE_OUT_OF_RANGE'
				})
		
		// TDD Anchor: Start Index Check
		IF request.startIndex IS NOT undefined:
			IF request.startIndex < 0:
				errors.push({
					field: 'startIndex',
					message: 'Start index cannot be negative',
					code: 'NEGATIVE_START_INDEX'
				})
		
		RETURN errors
	
	// TDD Anchor: Format Validation
	STATIC METHOD validateFormat(format: string) -> 'json' | 'table' | 'minimal':
		validFormats = ['json', 'table', 'minimal']
		IF validFormats.includes(format):
			RETURN format as ValidFormat
		ELSE:
			THROW Error('Invalid format: ' + format + '. Must be one of: ' + validFormats.join(', '))
	
	// TDD Anchor: Boolean Parsing
	STATIC METHOD parseBoolean(value: string) -> boolean:
		lowerValue = value.toLowerCase()
		IF lowerValue IN ['true', '1', 'yes', 'on']:
			RETURN true
		ELSE IF lowerValue IN ['false', '0', 'no', 'off']:
			RETURN false
		ELSE:
			THROW Error('Invalid boolean value: ' + value)
```

### 5. workflow-list-formatter.ts
```typescript
CLASS WorkflowListFormatter:
	PRIVATE format: 'json' | 'table' | 'minimal'
	
	CONSTRUCTOR(format: 'json' | 'table' | 'minimal'):
		this.format = format
	
	// TDD Anchor: Main Formatting
	METHOD formatResult(result: WorkflowListResult) -> FormattedOutput:
		IF NOT result.success:
			RETURN formatError(result)
		
		SWITCH this.format:
			CASE 'json':
				RETURN formatAsJson(result)
			CASE 'table':
				RETURN formatAsTable(result)
			CASE 'minimal':
				RETURN formatAsMinimal(result)
			DEFAULT:
				RETURN formatAsTable(result)
	
	// TDD Anchor: JSON Formatting
	PRIVATE METHOD formatAsJson(result: WorkflowListResult) -> FormattedOutput:
		output = {
			success: result.success,
			data: result.data,
			metadata: result.metadata
		}
		
		RETURN {
			content: JSON.stringify(output, null, 2),
			exitCode: 0
		}
	
	// TDD Anchor: Table Formatting
	PRIVATE METHOD formatAsTable(result: WorkflowListResult) -> FormattedOutput:
		IF NOT result.data OR result.data.length === 0:
			RETURN {
				content: 'No workflow definitions found.',
				exitCode: 0
			}
		
		// TDD Anchor: Table Header
		table = createTableHeader(['ID', 'Name', 'States', 'Active', 'Created', 'Modified'])
		
		// TDD Anchor: Table Rows
		FOR workflow IN result.data:
			row = [
				workflow.id,
				workflow.name,
				workflow.states.length.toString(),
				workflow.isActive ? 'Yes' : 'No',
				formatDate(workflow.createdDate),
				formatDate(workflow.modifiedDate)
			]
			table.addRow(row)
		
		// TDD Anchor: Metadata Footer
		footer = formatMetadata(result.metadata)
		
		RETURN {
			content: table.toString() + '\n\n' + footer,
			exitCode: 0
		}
	
	// TDD Anchor: Minimal Formatting
	PRIVATE METHOD formatAsMinimal(result: WorkflowListResult) -> FormattedOutput:
		IF NOT result.data OR result.data.length === 0:
			RETURN {
				content: 'No workflows found',
				exitCode: 0
			}
		
		lines = []
		FOR workflow IN result.data:
			status = workflow.isActive ? '[ACTIVE]' : '[INACTIVE]'
			line = workflow.id + ' - ' + workflow.name + ' ' + status
			lines.push(line)
		
		summary = 'Total: ' + result.data.length + ' workflows'
		
		RETURN {
			content: lines.join('\n') + '\n\n' + summary,
			exitCode: 0
		}
	
	// TDD Anchor: Error Formatting
	PRIVATE METHOD formatError(result: WorkflowListResult) -> FormattedOutput:
		errorOutput = 'Error: ' + (result.error || 'Unknown error')
		
		IF result.metadata:
			errorOutput += '\n\nRequest Details:'
			errorOutput += '\n  Request ID: ' + result.metadata.requestId
			errorOutput += '\n  Duration: ' + result.metadata.duration + 'ms'
			errorOutput += '\n  Endpoint: ' + result.metadata.endpoint
		
		RETURN {
			content: errorOutput,
			exitCode: 1
		}
	
	// TDD Anchor: Date Formatting
	PRIVATE METHOD formatDate(date: Date) -> string:
		IF NOT date:
			RETURN 'N/A'
		
		RETURN date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
	
	// TDD Anchor: Metadata Formatting
	PRIVATE METHOD formatMetadata(metadata: WorkflowListMetadata) -> string:
		lines = [
			'Request completed successfully',
			'Request ID: ' + metadata.requestId,
			'Duration: ' + metadata.duration + 'ms',
			'Endpoint: ' + metadata.endpoint
		]
		
		IF metadata.totalCount IS NOT undefined:
			lines.push('Total Count: ' + metadata.totalCount)
		
		RETURN lines.join('\n')
```

## TDD Test Anchors

### Unit Test Structure
```typescript
// workflow-list-cli.test.ts
DESCRIBE 'WorkflowListCLI':
	DESCRIBE 'parseArguments':
		TEST 'should parse valid arguments correctly'
		TEST 'should handle boolean flags'
		TEST 'should validate numeric arguments'
		TEST 'should throw error for unknown arguments'
	
	DESCRIBE 'buildRequest':
		TEST 'should build request with all parameters'
		TEST 'should handle optional parameters'
		TEST 'should exclude undefined values'

// workflow-list-executor.test.ts
DESCRIBE 'WorkflowListExecutor':
	DESCRIBE 'execute':
		TEST 'should execute workflow list request successfully'
		TEST 'should handle tool not found error'
		TEST 'should handle timeout errors'
		TEST 'should handle API errors'
	
	DESCRIBE 'transformToWorkflowDefinitions':
		TEST 'should transform valid data correctly'
		TEST 'should handle empty data'
		TEST 'should handle malformed data'

// workflow-list-validator.test.ts
DESCRIBE 'WorkflowListValidator':
	DESCRIBE 'validateCLIOptions':
		TEST 'should validate page size limits'
		TEST 'should validate start index'
		TEST 'should validate timeout ranges'
		TEST 'should validate format options'
	
	DESCRIBE 'parseBoolean':
		TEST 'should parse true values'
		TEST 'should parse false values'
		TEST 'should throw error for invalid values'

// workflow-list-formatter.test.ts
DESCRIBE 'WorkflowListFormatter':
	DESCRIBE 'formatResult':
		TEST 'should format JSON output correctly'
		TEST 'should format table output correctly'
		TEST 'should format minimal output correctly'
		TEST 'should format error output correctly'
```

## Integration Points

### MCP Tool Integration
- Uses existing `SwaggerMcpTools` to discover `Workflow_ListWorkflowDefinitions`
- Follows MCP protocol for tool invocation
- Handles MCP response format consistently

### Configuration Integration
- Leverages existing `CLIConfigHandler` for configuration loading
- Uses existing OAuth configuration and authentication flow
- Integrates with existing logging infrastructure

### Error Handling Integration
- Uses existing error handling patterns from get-page CLI
- Provides consistent error messages and exit codes
- Includes suggestion system for common errors

## Security Considerations
- No hardcoded secrets or configuration values
- Uses existing OAuth authentication flow
- Validates all input parameters to prevent injection
- Implements request timeouts to prevent hanging

## Performance Considerations
- Implements request timeout with configurable limits
- Uses pagination parameters to limit response size
- Includes request ID tracking for debugging
- Provides verbose logging option for troubleshooting