# Cursor.Directory Publishing Pseudocode

## Module Structure

```
src/marketplace/cursor-directory/
├── validators/
│   ├── repository-validator.ts
│   ├── mcp-compliance-validator.ts
│   └── documentation-validator.ts
├── generators/
│   ├── directory-entry-generator.ts
│   ├── submission-pr-generator.ts
│   └── installation-guide-generator.ts
├── submitters/
│   ├── github-api-client.ts
│   ├── cursor-directory-submitter.ts
│   └── submission-status-tracker.ts
└── orchestrator/
    └── publishing-orchestrator.ts
```

## Core Validation Pseudocode

### Repository Validator (repository-validator.ts)

```typescript
INTERFACE RepositoryValidationResult
	isValid: boolean
	errors: string[]
	warnings: string[]
	requiredFiles: FileCheckResult[]
END INTERFACE

CLASS RepositoryValidator
	METHOD validateRepository(projectPath: string) -> RepositoryValidationResult
		BEGIN
			result = new RepositoryValidationResult()
			
			// TDD: Test required files existence
			requiredFiles = ["package.json", "README.md", "dist/index.js", "LICENSE"]
			FOR EACH file IN requiredFiles
				IF NOT exists(projectPath + "/" + file)
					result.errors.push("Missing required file: " + file)
				END IF
			END FOR
			
			// TDD: Test package.json structure
			packageJson = readPackageJson(projectPath)
			validatePackageJsonStructure(packageJson, result)
			
			// TDD: Test build artifacts
			validateBuildArtifacts(projectPath, result)
			
			// TDD: Test repository URL accessibility
			validateRepositoryUrl(packageJson.repository, result)
			
			result.isValid = result.errors.length === 0
			RETURN result
		END
	END METHOD
	
	PRIVATE METHOD validatePackageJsonStructure(packageJson: object, result: RepositoryValidationResult)
		BEGIN
			requiredFields = ["name", "version", "description", "main", "bin", "repository", "license"]
			FOR EACH field IN requiredFields
				IF NOT packageJson.hasOwnProperty(field)
					result.errors.push("Missing package.json field: " + field)
				END IF
			END FOR
			
			// TDD: Test MCP-specific fields
			IF NOT packageJson.keywords.includes("mcp")
				result.warnings.push("Package should include 'mcp' keyword")
			END IF
			
			// TDD: Test entry point format
			IF packageJson.main !== "dist/index.js"
				result.errors.push("Main entry point must be 'dist/index.js'")
			END IF
		END
	END METHOD
END CLASS
```

### MCP Compliance Validator (mcp-compliance-validator.ts)

```typescript
INTERFACE McpComplianceResult
	isCompliant: boolean
	protocolVersion: string
	toolsRegistered: ToolInfo[]
	errors: string[]
	warnings: string[]
END INTERFACE

CLASS McpComplianceValidator
	METHOD validateMcpCompliance(entryPoint: string) -> McpComplianceResult
		BEGIN
			result = new McpComplianceResult()
			
			// TDD: Test server instantiation
			TRY
				server = importServer(entryPoint)
				result.protocolVersion = server.getProtocolVersion()
			CATCH error
				result.errors.push("Failed to instantiate MCP server: " + error.message)
				RETURN result
			END TRY
			
			// TDD: Test tool registration
			tools = server.getRegisteredTools()
			validateToolStructure(tools, result)
			
			// TDD: Test error handling
			validateErrorHandling(server, result)
			
			// TDD: Test environment configuration
			validateEnvironmentSupport(server, result)
			
			result.isCompliant = result.errors.length === 0
			RETURN result
		END
	END METHOD
	
	PRIVATE METHOD validateToolStructure(tools: Tool[], result: McpComplianceResult)
		BEGIN
			FOR EACH tool IN tools
				// TDD: Test required tool properties
				IF NOT tool.hasProperty("name") OR NOT tool.hasProperty("description")
					result.errors.push("Tool missing required properties: " + tool.name)
				END IF
				
				// TDD: Test input schema validity
				IF tool.inputSchema
					validateJsonSchema(tool.inputSchema, result)
				END IF
				
				result.toolsRegistered.push({
					name: tool.name,
					description: tool.description,
					hasInputSchema: tool.inputSchema !== undefined
				})
			END FOR
		END
	END METHOD
END CLASS
```

## Directory Entry Generation Pseudocode

### Directory Entry Generator (directory-entry-generator.ts)

```typescript
INTERFACE CursorDirectoryEntry
	name: string
	slug: string
	description: string
	repository: string
	category: string
	tags: string[]
	author: string
	license: string
	version: string
	mcpVersion: string
	installation: InstallationInfo
	configuration: ConfigurationInfo
	tools: string[]
END INTERFACE

CLASS DirectoryEntryGenerator
	METHOD generateEntry(packageJson: object, mcpInfo: McpComplianceResult) -> CursorDirectoryEntry
		BEGIN
			entry = new CursorDirectoryEntry()
			
			// TDD: Test basic metadata extraction
			entry.name = packageJson.name
			entry.slug = generateSlug(packageJson.name)
			entry.description = packageJson.description
			entry.repository = packageJson.repository.url
			entry.author = packageJson.author
			entry.license = packageJson.license
			entry.version = packageJson.version
			entry.mcpVersion = mcpInfo.protocolVersion
			
			// TDD: Test category classification
			entry.category = classifyCategory(packageJson.keywords)
			entry.tags = filterRelevantTags(packageJson.keywords)
			
			// TDD: Test installation info generation
			entry.installation = generateInstallationInfo(packageJson)
			
			// TDD: Test configuration extraction
			entry.configuration = extractConfigurationInfo(packageJson)
			
			// TDD: Test tool list generation
			entry.tools = mcpInfo.toolsRegistered.map(tool => tool.name)
			
			RETURN entry
		END
	END METHOD
	
	PRIVATE METHOD generateSlug(name: string) -> string
		BEGIN
			// TDD: Test slug generation rules
			slug = name.toLowerCase()
			slug = slug.replace(/[^a-z0-9-]/g, "-")
			slug = slug.replace(/-+/g, "-")
			slug = slug.replace(/^-|-$/g, "")
			RETURN slug
		END
	END METHOD
	
	PRIVATE METHOD classifyCategory(keywords: string[]) -> string
		BEGIN
			// TDD: Test category mapping
			categoryMap = {
				["cms", "content"]: "Content Management",
				["api", "rest"]: "API Integration",
				["auth", "oauth"]: "Authentication",
				["data", "database"]: "Data Management"
			}
			
			FOR EACH categoryKeywords, categoryName IN categoryMap
				FOR EACH keyword IN keywords
					IF categoryKeywords.includes(keyword)
						RETURN categoryName
					END IF
				END FOR
			END FOR
			
			RETURN "General"
		END
	END METHOD
END CLASS
```

## Submission Process Pseudocode

### GitHub API Client (github-api-client.ts)

```typescript
CLASS GitHubApiClient
	PRIVATE githubToken: string
	PRIVATE baseUrl: string = "https://api.github.com"
	
	CONSTRUCTOR(token: string)
		BEGIN
			this.githubToken = token
		END
	END CONSTRUCTOR
	
	METHOD forkRepository(owner: string, repo: string) -> ForkResult
		BEGIN
			// TDD: Test repository forking
			endpoint = this.baseUrl + "/repos/" + owner + "/" + repo + "/forks"
			headers = {
				"Authorization": "token " + this.githubToken,
				"Accept": "application/vnd.github.v3+json"
			}
			
			TRY
				response = httpPost(endpoint, {}, headers)
				RETURN {
					success: true,
					forkUrl: response.clone_url,
					forkName: response.full_name
				}
			CATCH error
				RETURN {
					success: false,
					error: error.message
				}
			END TRY
		END
	END METHOD
	
	METHOD createPullRequest(owner: string, repo: string, prData: PullRequestData) -> PullRequestResult
		BEGIN
			// TDD: Test PR creation
			endpoint = this.baseUrl + "/repos/" + owner + "/" + repo + "/pulls"
			headers = {
				"Authorization": "token " + this.githubToken,
				"Accept": "application/vnd.github.v3+json"
			}
			
			payload = {
				title: prData.title,
				body: prData.body,
				head: prData.headBranch,
				base: prData.baseBranch
			}
			
			TRY
				response = httpPost(endpoint, payload, headers)
				RETURN {
					success: true,
					prUrl: response.html_url,
					prNumber: response.number
				}
			CATCH error
				RETURN {
					success: false,
					error: error.message
				}
			END TRY
		END
	END METHOD
END CLASS
```

### Cursor Directory Submitter (cursor-directory-submitter.ts)

```typescript
CLASS CursorDirectorySubmitter
	PRIVATE githubClient: GitHubApiClient
	PRIVATE cursorDirectoryRepo: RepositoryInfo
	
	CONSTRUCTOR(githubToken: string)
		BEGIN
			this.githubClient = new GitHubApiClient(githubToken)
			this.cursorDirectoryRepo = {
				owner: "cursor-ai",
				name: "cursor-directory"
			}
		END
	END CONSTRUCTOR
	
	METHOD submitServer(entry: CursorDirectoryEntry) -> SubmissionResult
		BEGIN
			result = new SubmissionResult()
			
			// TDD: Test fork creation
			forkResult = this.githubClient.forkRepository(
				this.cursorDirectoryRepo.owner,
				this.cursorDirectoryRepo.name
			)
			
			IF NOT forkResult.success
				result.errors.push("Failed to fork cursor-directory: " + forkResult.error)
				RETURN result
			END IF
			
			// TDD: Test branch creation
			branchName = "add-" + entry.slug + "-server"
			branchResult = createSubmissionBranch(forkResult.forkName, branchName)
			
			IF NOT branchResult.success
				result.errors.push("Failed to create branch: " + branchResult.error)
				RETURN result
			END IF
			
			// TDD: Test file creation
			entryFile = generateEntryFile(entry)
			fileResult = addEntryFile(forkResult.forkName, branchName, entryFile)
			
			IF NOT fileResult.success
				result.errors.push("Failed to add entry file: " + fileResult.error)
				RETURN result
			END IF
			
			// TDD: Test PR creation
			prData = {
				title: "Add " + entry.name + " MCP Server",
				body: generatePrDescription(entry),
				headBranch: branchName,
				baseBranch: "main"
			}
			
			prResult = this.githubClient.createPullRequest(
				this.cursorDirectoryRepo.owner,
				this.cursorDirectoryRepo.name,
				prData
			)
			
			IF prResult.success
				result.success = true
				result.prUrl = prResult.prUrl
				result.prNumber = prResult.prNumber
			ELSE
				result.errors.push("Failed to create PR: " + prResult.error)
			END IF
			
			RETURN result
		END
	END METHOD
	
	PRIVATE METHOD generatePrDescription(entry: CursorDirectoryEntry) -> string
		BEGIN
			// TDD: Test PR description generation
			description = "## Adding " + entry.name + "\n\n"
			description += "**Description:** " + entry.description + "\n"
			description += "**Category:** " + entry.category + "\n"
			description += "**Repository:** " + entry.repository + "\n"
			description += "**License:** " + entry.license + "\n\n"
			description += "### Tools Provided:\n"
			
			FOR EACH tool IN entry.tools
				description += "- " + tool + "\n"
			END FOR
			
			description += "\n### Installation:\n"
			description += "```bash\n" + entry.installation.npm + "\n```\n"
			
			RETURN description
		END
	END METHOD
END CLASS
```

## Publishing Orchestrator Pseudocode

### Main Orchestrator (publishing-orchestrator.ts)

```typescript
CLASS PublishingOrchestrator
	PRIVATE repositoryValidator: RepositoryValidator
	PRIVATE mcpValidator: McpComplianceValidator
	PRIVATE entryGenerator: DirectoryEntryGenerator
	PRIVATE submitter: CursorDirectorySubmitter
	
	CONSTRUCTOR(githubToken: string)
		BEGIN
			this.repositoryValidator = new RepositoryValidator()
			this.mcpValidator = new McpComplianceValidator()
			this.entryGenerator = new DirectoryEntryGenerator()
			this.submitter = new CursorDirectorySubmitter(githubToken)
		END
	END CONSTRUCTOR
	
	METHOD publishToCursorDirectory(projectPath: string) -> PublishingResult
		BEGIN
			result = new PublishingResult()
			
			// Phase 1: Repository Validation
			// TDD: Test repository structure validation
			repoValidation = this.repositoryValidator.validateRepository(projectPath)
			IF NOT repoValidation.isValid
				result.errors.addAll(repoValidation.errors)
				result.phase = "Repository Validation"
				RETURN result
			END IF
			
			// Phase 2: MCP Compliance Check
			// TDD: Test MCP server compliance
			entryPoint = projectPath + "/dist/index.js"
			mcpValidation = this.mcpValidator.validateMcpCompliance(entryPoint)
			IF NOT mcpValidation.isCompliant
				result.errors.addAll(mcpValidation.errors)
				result.phase = "MCP Compliance"
				RETURN result
			END IF
			
			// Phase 3: Directory Entry Generation
			// TDD: Test entry generation
			packageJson = readPackageJson(projectPath + "/package.json")
			directoryEntry = this.entryGenerator.generateEntry(packageJson, mcpValidation)
			
			// Phase 4: Submission
			// TDD: Test submission process
			submissionResult = this.submitter.submitServer(directoryEntry)
			IF NOT submissionResult.success
				result.errors.addAll(submissionResult.errors)
				result.phase = "Submission"
				RETURN result
			END IF
			
			// Success
			result.success = true
			result.prUrl = submissionResult.prUrl
			result.prNumber = submissionResult.prNumber
			result.directoryEntry = directoryEntry
			
			RETURN result
		END
	END METHOD
	
	METHOD validateOnly(projectPath: string) -> ValidationSummary
		BEGIN
			// TDD: Test validation-only mode
			summary = new ValidationSummary()
			
			repoValidation = this.repositoryValidator.validateRepository(projectPath)
			summary.repositoryValidation = repoValidation
			
			IF repoValidation.isValid
				entryPoint = projectPath + "/dist/index.js"
				mcpValidation = this.mcpValidator.validateMcpCompliance(entryPoint)
				summary.mcpValidation = mcpValidation
			END IF
			
			summary.overallValid = repoValidation.isValid AND mcpValidation.isCompliant
			
			RETURN summary
		END
	END METHOD
END CLASS
```

## CLI Integration Pseudocode

### Submission Script (scripts/submit-to-cursor-directory.ts)

```typescript
MAIN FUNCTION submitToCursorDirectory()
	BEGIN
		// TDD: Test CLI argument parsing
		args = parseCommandLineArgs()
		IF NOT args.isValid
			printUsage()
			EXIT(1)
		END IF
		
		// TDD: Test GitHub token validation
		githubToken = getGitHubToken(args)
		IF NOT githubToken
			printError("GitHub token required for submission")
			EXIT(1)
		END IF
		
		// TDD: Test project path validation
		projectPath = args.projectPath || getCurrentDirectory()
		IF NOT directoryExists(projectPath)
			printError("Invalid project path: " + projectPath)
			EXIT(1)
		END IF
		
		orchestrator = new PublishingOrchestrator(githubToken)
		
		// TDD: Test validation mode
		IF args.validateOnly
			summary = orchestrator.validateOnly(projectPath)
			printValidationSummary(summary)
			EXIT(summary.overallValid ? 0 : 1)
		END IF
		
		// TDD: Test full publishing flow
		printInfo("Starting cursor.directory submission...")
		result = orchestrator.publishToCursorDirectory(projectPath)
		
		IF result.success
			printSuccess("Successfully submitted to cursor.directory!")
			printInfo("Pull Request: " + result.prUrl)
			printInfo("PR Number: #" + result.prNumber)
			EXIT(0)
		ELSE
			printError("Submission failed in phase: " + result.phase)
			FOR EACH error IN result.errors
				printError("  - " + error)
			END FOR
			EXIT(1)
		END IF
	END
END FUNCTION

FUNCTION getGitHubToken(args: CliArgs) -> string
	BEGIN
		// TDD: Test token source priority
		IF args.token
			RETURN args.token
		END IF
		
		IF environmentVariable("GITHUB_TOKEN")
			RETURN environmentVariable("GITHUB_TOKEN")
		END IF
		
		IF fileExists(".github-token")
			RETURN readFile(".github-token").trim()
		END IF
		
		RETURN promptUserForToken()
	END
END FUNCTION
```

## Testing Strategy Pseudocode

### TDD Test Structure

```typescript
// TDD: Repository Validator Tests
DESCRIBE "RepositoryValidator"
	TEST "should validate required files exist"
	TEST "should validate package.json structure"
	TEST "should validate build artifacts"
	TEST "should validate repository URL"
	TEST "should handle missing files gracefully"
END DESCRIBE

// TDD: MCP Compliance Tests
DESCRIBE "McpComplianceValidator"
	TEST "should validate MCP server instantiation"
	TEST "should validate tool registration"
	TEST "should validate input schemas"
	TEST "should validate error handling"
	TEST "should handle invalid servers gracefully"
END DESCRIBE

// TDD: Directory Entry Generator Tests
DESCRIBE "DirectoryEntryGenerator"
	TEST "should generate valid directory entry"
	TEST "should classify categories correctly"
	TEST "should generate proper slugs"
	TEST "should extract configuration info"
	TEST "should handle edge cases in package.json"
END DESCRIBE

// TDD: Submission Tests
DESCRIBE "CursorDirectorySubmitter"
	TEST "should fork repository successfully"
	TEST "should create submission branch"
	TEST "should add entry file"
	TEST "should create pull request"
	TEST "should handle GitHub API errors"
END DESCRIBE

// TDD: Integration Tests
DESCRIBE "PublishingOrchestrator"
	TEST "should complete full publishing flow"
	TEST "should validate only when requested"
	TEST "should handle validation failures"
	TEST "should handle submission failures"
	TEST "should provide detailed error reporting"
END DESCRIBE
```

## Error Handling Strategy

```typescript
CLASS PublishingError EXTENDS Error
	PROPERTIES
		phase: string
		code: string
		details: object
	END PROPERTIES
	
	CONSTRUCTOR(message: string, phase: string, code: string, details: object)
		BEGIN
			super(message)
			this.phase = phase
			this.code = code
			this.details = details
		END
	END CONSTRUCTOR
END CLASS

// TDD: Error handling patterns
FUNCTION handleValidationError(error: ValidationError) -> PublishingError
	BEGIN
		RETURN new PublishingError(
			"Validation failed: " + error.message,
			"validation",
			"VALIDATION_FAILED",
			{ validationErrors: error.errors }
		)
	END
END FUNCTION

FUNCTION handleSubmissionError(error: SubmissionError) -> PublishingError
	BEGIN
		RETURN new PublishingError(
			"Submission failed: " + error.message,
			"submission",
			"SUBMISSION_FAILED",
			{ githubError: error.githubError }
		)
	END
END FUNCTION