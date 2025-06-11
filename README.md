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

## License

MIT License - see LICENSE file for details.