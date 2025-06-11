# MCP Server Registry Guide

## Overview

This document describes the Ingeniux CMS MCP server registration in the Roo Code MCP server registry system.

## Registry Files

### 1. Project MCP Configuration (`.roo/mcp.json`)

The main MCP configuration file for the Roo Code system:

```json
{
	"mcpServers": {
		"ingeniux-cms": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "./",
			"env": {
				"CMS_BASE_URL": "${CMS_BASE_URL}",
				"OAUTH_CLIENT_ID": "${OAUTH_CLIENT_ID}",
				"OAUTH_CLIENT_SECRET": "${OAUTH_CLIENT_SECRET}",
				"OAUTH_REDIRECT_URI": "${OAUTH_REDIRECT_URI:-http://localhost:3000/callback}",
				"API_TIMEOUT": "${API_TIMEOUT:-30000}",
				"MAX_RETRIES": "${MAX_RETRIES:-3}",
				"LOG_LEVEL": "${LOG_LEVEL:-info}",
				"CACHE_TTL": "${CACHE_TTL:-300}"
			}
		}
	}
}
```

### 2. Server Registry Entry (`registry/ingeniux-cms-mcp-server.json`)

Comprehensive metadata and configuration for the Ingeniux CMS MCP server including:
- Server capabilities and tools
- Installation instructions
- Configuration requirements
- Security specifications
- Usage examples

### 3. Global Registry (`roo-mcp-registry.json`)

Master registry containing all MCP servers with validation rules and deployment configurations.

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CMS_BASE_URL` | Base URL for Ingeniux CMS instance | `https://cms.example.com/api` |
| `OAUTH_CLIENT_ID` | OAuth application client ID | `your_client_id` |
| `OAUTH_CLIENT_SECRET` | OAuth application client secret | `your_client_secret` |
| `OAUTH_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/callback` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_TIMEOUT` | Request timeout in milliseconds | `30000` |
| `MAX_RETRIES` | Maximum retry attempts | `3` |
| `LOG_LEVEL` | Logging level | `info` |
| `CACHE_TTL` | Cache time-to-live in seconds | `300` |

## Server Capabilities

### Authentication Tools
- `health_check` - Check server health and authentication status
- `auth_status` - Get current authentication status
- `initiate_oauth` - Start OAuth authentication flow

### Content Management Tools
- `cms_get_page` - Retrieve a specific page by ID or path
- `cms_create_page` - Create a new page in the CMS
- `cms_update_page` - Update an existing page
- `cms_delete_page` - Delete a page from the CMS
- `cms_list_pages` - List pages with optional filtering
- `cms_publish_page` - Publish a page to make it live
- `cms_search_content` - Search for content in the CMS

## Setup Instructions

### 1. Environment Configuration

Create or update your `.env` file with required variables:

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
CACHE_TTL=300
```

### 2. Build and Start

```bash
# Build the server
npm run build

# Start the server
npm start
```

### 3. Verification

The server will be available at the configured endpoint and can be tested using the health check tool.

## Security Considerations

- OAuth 2.0 with PKCE for secure authentication
- Encrypted token storage using AES-256
- No hardcoded secrets (environment variables only)
- Input validation and sanitization
- Rate limiting and request throttling
- HTTPS required for all communications

## Troubleshooting

### Common Issues

1. **MCP Connection Error (-32000: Connection closed)**
   - Ensure server is built: `npm run build`
   - Check environment variables are set correctly
   - Verify the server path in `.roo/mcp.json` is correct: `"./dist/index.js"`
   - Test server startup: `node test-mcp-connection.js`
   - Check server logs for startup errors

2. **Authentication Failures**
   - Verify OAuth credentials are correct
   - Check CMS instance is accessible
   - Ensure redirect URI matches configuration

3. **Connection Timeouts**
   - Increase `API_TIMEOUT` value
   - Check network connectivity to CMS
   - Verify firewall settings

4. **Tool Execution Errors**
   - Check authentication status
   - Validate input parameters
   - Review server logs for details

5. **Environment Variable Issues**
   - Copy `.env.example` to `.env`
   - Set all required variables
   - Use proper URL formats (include protocol)
   - Avoid spaces in environment values

### Debugging and Logs

For detailed debugging information, see the [Logging Guide](logging-guide.md) which covers:
- How to view MCP server logs
- Setting log levels for debugging
- Enabling file logging
- Common log patterns and troubleshooting

Quick debugging commands:
```bash
# Test server connection
node test-mcp-connection.js

# Start with debug logging
LOG_LEVEL=debug node dist/index.js

# Enable file logging
ENABLE_FILE_LOGGING=true node dist/index.js
```

### Support

- Issues: https://github.com/ingeniux/ingeniux-cms-mcp-server/issues
- Documentation: https://github.com/ingeniux/ingeniux-cms-mcp-server/tree/main/docs
- Discussions: https://github.com/ingeniux/ingeniux-cms-mcp-server/discussions
- Logging Guide: [docs/logging-guide.md](logging-guide.md)

## Registry Validation

The registry includes validation rules for:
- Environment variable formats
- Security requirements
- Compatibility checks
- Performance requirements
- Tool naming conventions

All servers must pass validation before being added to the registry.