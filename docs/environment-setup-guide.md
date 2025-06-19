# Environment Setup Guide

Guide for configuring environment variables when running the MCP server from different locations.

## Problem Overview

When running the MCP server from a different location, you may encounter:
```json
{
	"errors": ["Missing required environment variables: CMS_BASE_URL, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET"],
	"level": "error",
	"message": "Environment validation failed",
	"service": "ingeniux-cms-mcp-server"
}
```

This occurs because the server cannot locate the required environment variables.

## Required Environment Variables

The server requires these environment variables:
- [`CMS_BASE_URL`](src/utils/config-manager.ts:137) - Base URL for your CMS instance
- [`OAUTH_CLIENT_ID`](src/utils/config-manager.ts:137) - OAuth application client ID
- [`OAUTH_CLIENT_SECRET`](src/utils/config-manager.ts:137) - OAuth application client secret

## Solution Methods

### Method 1: Copy .env File

Copy the [`.env`](.env) file to your execution directory:

```bash
# Copy .env file to target directory
cp /path/to/cms-mcp-server/.env /your/execution/directory/

# Run from new location
cd /your/execution/directory
node /path/to/cms-mcp-server/dist/index.js
```

### Method 2: Set Environment Variables

Set variables directly in your shell:

```bash
# Export required variables
export CMS_BASE_URL="https://cms.example.com/api"
export OAUTH_CLIENT_ID="your_client_id"
export OAUTH_CLIENT_SECRET="your_client_secret"

# Run server
node /path/to/cms-mcp-server/dist/index.js
```

### Method 3: Use .env in Execution Directory

Create a new [`.env`](.env) file in your execution directory:

```bash
# Create .env file
cat > .env << EOF
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
EOF
```

### Method 4: Inline Environment Variables

Pass variables directly when running:

```bash
CMS_BASE_URL="https://cms.example.com/api" \
OAUTH_CLIENT_ID="your_client_id" \
OAUTH_CLIENT_SECRET="your_client_secret" \
node /path/to/cms-mcp-server/dist/index.js
```

## MCP Client Configuration

### Roo MCP Configuration

Update your [`roo-mcp-registry.json`](roo-mcp-registry.json) with proper environment setup:

```json
{
	"servers": {
		"ingeniux-cms": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "/path/to/cms-mcp-server",
			"env": {
				"CMS_BASE_URL": "${CMS_BASE_URL}",
				"OAUTH_CLIENT_ID": "${OAUTH_CLIENT_ID}",
				"OAUTH_CLIENT_SECRET": "${OAUTH_CLIENT_SECRET}",
				"OAUTH_REDIRECT_URI": "${OAUTH_REDIRECT_URI:-http://localhost:3000/callback}"
			}
		}
	}
}
```

### Claude Desktop Configuration

For Claude Desktop, ensure environment variables are available:

```json
{
	"mcpServers": {
		"ingeniux-cms": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "/path/to/cms-mcp-server",
			"env": {
				"CMS_BASE_URL": "https://cms.example.com/api",
				"OAUTH_CLIENT_ID": "your_client_id",
				"OAUTH_CLIENT_SECRET": "your_client_secret"
			}
		}
	}
}
```

## Environment Variable Loading

The server uses [`dotenv`](src/utils/config-manager.ts:5) to load environment variables:

1. **Process Environment** - Variables set in shell
2. **Local .env File** - File in current working directory
3. **Default Values** - Fallback values where applicable

## Validation Process

The [`ConfigManager.checkRequiredEnvVars()`](src/utils/config-manager.ts:136) method validates:

```typescript
const required = ['CMS_BASE_URL', 'OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET'];
```

Missing variables trigger the validation error you encountered.

## Troubleshooting

### Check Current Environment

Verify variables are set:
```bash
echo $CMS_BASE_URL
echo $OAUTH_CLIENT_ID
echo $OAUTH_CLIENT_SECRET
```

### Debug Environment Loading

Enable debug logging:
```bash
LOG_LEVEL=debug node dist/index.js
```

### Verify Working Directory

Ensure `.env` file is in the current working directory:
```bash
pwd
ls -la .env
```

## Security Considerations

- Never commit `.env` files with real credentials
- Use environment-specific configuration files
- Rotate OAuth credentials regularly
- Use secure methods for credential distribution

## Related Documentation

- [Configuration Guide](docs/configuration-guide.md) - Complete configuration reference
- [Installation Guide](docs/installation-guide.md) - Initial setup instructions
- [OAuth Configuration Guide](docs/oauth-configuration-guide.md) - OAuth setup details