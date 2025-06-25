# Ingeniux CMS MCP Server

A Model Context Protocol (MCP) server that provides programmatic access to Ingeniux CMS WebAPI v10.6.378 with OAuth authentication.

## Features

- **OAuth 2.0 Authentication**: Secure authentication with PKCE support
- **Modular Architecture**: Clean separation of concerns with <500 line files
- **Content Management**: Tools for creating, updating, and managing CMS content
- **Error Handling**: Comprehensive error handling and validation
- **Type Safety**: Full TypeScript implementation with strict typing
- **Configuration Management**: Environment-based configuration with validation

## Prerequisites

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Access to Ingeniux CMS instance with OAuth configured

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ingeniux-cms-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp .env.example .env
```

4. Configure environment variables in `.env`:
```bash
# Required
CMS_BASE_URL=https://your-cms-instance.com/api
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional
API_TIMEOUT=30000
MAX_RETRIES=3
LOG_LEVEL=info
```

## Build

```bash
npm run build
```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Available Tools

### Authentication
- `health_check` - Check server health and authentication status
- `auth_status` - Get current authentication status
- `initiate_oauth` - Start OAuth authentication flow

### Content Management
- `cms_get_page` - Retrieve a specific page by ID or path
- `cms_create_page` - Create a new page in the CMS
- `cms_update_page` - Update an existing page
- `cms_delete_page` - Delete a page from the CMS
- `cms_list_pages` - List pages with optional filtering
- `cms_publish_page` - Publish a page to make it live
- `cms_search_content` - Search for content in the CMS

## Architecture

The server follows a modular architecture with clear separation of concerns:

```
src/
├── core/           # Core MCP server functionality
├── auth/           # OAuth authentication and token management
├── api/            # HTTP client and API integration
├── tools/          # MCP tool implementations
├── utils/          # Shared utilities and helpers
└── types/          # TypeScript type definitions
```

## Configuration

All configuration is managed through environment variables. See `.env.example` for all available options.

### Required Variables
- `CMS_BASE_URL` - Base URL for your Ingeniux CMS instance
- `OAUTH_CLIENT_ID` - OAuth application client ID
- `OAUTH_CLIENT_SECRET` - OAuth application client secret
- `OAUTH_REDIRECT_URI` - OAuth callback URL

### Optional Variables
- `API_TIMEOUT` - Request timeout in milliseconds (default: 30000)
- `MAX_RETRIES` - Maximum retry attempts (default: 3)
- `LOG_LEVEL` - Logging level (default: 'info')
- `CACHE_TTL` - Cache time-to-live in seconds (default: 300)

## Security

- OAuth 2.0 with PKCE for secure authentication
- Encrypted token storage with AES-256
- Input validation and sanitization
- Rate limiting and request throttling
- No hardcoded secrets or configuration values

## Error Handling

The server implements comprehensive error handling:
- Authentication errors trigger re-authentication flow
- Network errors use exponential backoff retry
- Validation errors provide detailed feedback
- All errors are logged with context

## Development

### Project Structure
Each module is kept under 500 lines for maintainability. The codebase uses:
- TypeScript with strict typing
- Modular design patterns
- Environment-based configuration
- Comprehensive error handling

### Adding New Tools
1. Create tool implementation in `src/tools/`
2. Register tool in the appropriate tool class
3. Add tool to the registry in `src/core/mcp-server.ts`

## Cursor Directory Publishing

This MCP server is ready for submission to [cursor.directory](https://cursor.directory) with automated compliance validation and publishing workflow.

### Publishing Workflow

The project includes a comprehensive publishing system in [`src/marketplace/cursor-directory/`](src/marketplace/cursor-directory/):

- **Validators**: [`repository-validator.ts`](src/marketplace/cursor-directory/validators/repository-validator.ts), [`mcp-compliance-validator.ts`](src/marketplace/cursor-directory/validators/mcp-compliance-validator.ts), [`documentation-validator.ts`](src/marketplace/cursor-directory/validators/documentation-validator.ts)
- **Generators**: [`directory-entry-generator.ts`](src/marketplace/cursor-directory/generators/directory-entry-generator.ts), [`submission-pr-generator.ts`](src/marketplace/cursor-directory/generators/submission-pr-generator.ts), [`installation-guide-generator.ts`](src/marketplace/cursor-directory/generators/installation-guide-generator.ts)
- **Orchestrator**: [`publishing-orchestrator.ts`](src/marketplace/cursor-directory/orchestrator/publishing-orchestrator.ts)
- **Submitters**: [`cursor-directory-submitter.ts`](src/marketplace/cursor-directory/submitters/cursor-directory-submitter.ts), [`github-api-client.ts`](src/marketplace/cursor-directory/submitters/github-api-client.ts)

### Submission Script Usage

Use [`scripts/submit-to-cursor-directory.ts`](scripts/submit-to-cursor-directory.ts) for validation and submission:

#### Validation Only
```bash
# Validate project structure and compliance
bun run scripts/submit-to-cursor-directory.ts --validate-only

# Validate specific project path
bun run scripts/submit-to-cursor-directory.ts --validate-only --project-path /path/to/project
```

#### Full Submission
```bash
# Submit with GitHub token (environment variable)
GITHUB_TOKEN=your_token bun run scripts/submit-to-cursor-directory.ts

# Submit with explicit token
bun run scripts/submit-to-cursor-directory.ts --github-token your_token

# Dry run (simulate without creating PR)
bun run scripts/submit-to-cursor-directory.ts --dry-run
```

#### Available Options
- `--validate-only` - Run validation checks without submitting
- `--project-path` - Path to project directory (default: current directory)
- `--github-token` - GitHub token for API access (or use `GITHUB_TOKEN` env var)
- `--dry-run` - Simulate submission without creating actual PR
- `--verbose` - Enable verbose output
- `--help` - Show help message

### Prerequisites for Submission

Before submitting to Cursor Directory, ensure:

1. **Built Project**: Run `npm run build` to generate `dist/index.js`
2. **Valid Package**: [`package.json`](package.json) with required fields (name, description, repository, license)
3. **Documentation**: Complete [`README.md`](README.md) and [`LICENSE`](LICENSE) files
4. **GitHub Repository**: Public repository with proper URL in [`package.json`](package.json)
5. **GitHub Token**: Personal access token with repo permissions for submission

### Validation Process

The submission script validates:

1. **Repository Structure** - Required files and build artifacts
2. **MCP Compliance** - Protocol implementation and tool registration
3. **Documentation** - README completeness and examples
4. **Entry Generation** - Cursor Directory metadata creation
5. **Submission** - Pull request creation to cursor.directory

## Troubleshooting

### Common Issues

#### Authentication Problems
- **Error**: `OAuth authentication failed`
  - **Solution**: Verify your `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `OAUTH_REDIRECT_URI` in `.env`
  - **Check**: Ensure the OAuth app is properly configured in your Ingeniux CMS instance

#### Connection Issues
- **Error**: `Connection timeout` or `ECONNREFUSED`
  - **Solution**: Check your `CMS_BASE_URL` and ensure the CMS instance is accessible
  - **Check**: Verify network connectivity and firewall settings

#### Build Errors
- **Error**: TypeScript compilation errors
  - **Solution**: Run `npm install` to ensure all dependencies are installed
  - **Check**: Verify Node.js version is >= 18.0.0

#### Runtime Errors
- **Error**: `Environment validation failed`
  - **Solution**: Copy `.env.example` to `.env` and configure all required variables
  - **Check**: Ensure all required environment variables are set

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

### Getting Help

1. Check the [Issues](https://github.com/IngeniuxCorp/ingeniux-cms-mcp-server/issues) page for known problems
2. Review the error logs in the console output
3. Verify your environment configuration matches the requirements
4. For Ingeniux CMS specific issues, consult the official documentation

## License

MIT License - see LICENSE file for details.