# CLI Authentication Tool

A command-line interface for OAuth 2.0 PKCE authentication with the Ingeniux CMS MCP Server.

## Overview

This CLI tool provides a simple way to authenticate with the CMS and obtain access tokens for API requests. It implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) for secure authentication.

## Prerequisites

1. **Environment Variables**: Set up the required environment variables in your `.env` file:
   ```bash
   CMS_BASE_URL=https://your-cms-instance.com/api
   OAUTH_CLIENT_ID=your_oauth_client_id
   OAUTH_CLIENT_SECRET=your_oauth_client_secret
   OAUTH_REDIRECT_URI=http://localhost:3000/callback
   ```

2. **Node.js**: Ensure you have Node.js 18+ installed.

## Usage

### Basic Authentication

```bash
# Run the CLI tool with default settings
npm run auth

# Or directly with tsx
npx tsx auth-cli.ts
```

### Command Options

```bash
# Display tokens in JSON format
npm run auth -- --format json

# Display tokens in minimal format (environment variables)
npm run auth -- --format minimal

# Skip automatic browser opening
npm run auth -- --no-browser

# Set custom timeout (in seconds)
npm run auth -- --timeout 600

# Enable verbose logging
npm run auth -- --verbose

# Show help
npm run auth -- --help
```

### Output Formats

#### Table Format (Default)
```
🔑 Authentication Tokens:
──────────────────────────────────────────────────────────────────────
Access Token    │ eyJ0eXAiOiJKV1...
Refresh Token   │ def50200...
Token Type      │ Bearer
Expires At      │ 2025-01-01T12:00:00.000Z
Expires In      │ 3600 seconds
Scope           │ read write
```

#### JSON Format
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_at": "2025-01-01T12:00:00.000Z",
  "expires_in": 3600,
  "scope": "read write"
}
```

#### Minimal Format
```bash
# Environment Variables:
ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
REFRESH_TOKEN=def50200...
TOKEN_TYPE=Bearer
EXPIRES_AT=2025-01-01T12:00:00.000Z
EXPIRES_IN=3600
SCOPE=read write
```

## Authentication Flow

1. **Configuration Loading**: The tool loads OAuth configuration from environment variables
2. **Existing Auth Check**: Checks if you're already authenticated with valid tokens
3. **OAuth Flow Initiation**: Generates authorization URL with PKCE parameters
4. **Browser Opening**: Automatically opens the authorization URL in your browser (unless `--no-browser` is used)
5. **Code Input**: Prompts you to enter the authorization code from the callback
6. **Token Exchange**: Exchanges the authorization code for access and refresh tokens
7. **Token Display**: Shows the tokens in your chosen format

## Error Handling

### Configuration Errors
If required environment variables are missing:
```
❌ Configuration Error:
Required environment variables:
- CMS_BASE_URL
- OAUTH_CLIENT_ID
- OAUTH_CLIENT_SECRET
- OAUTH_REDIRECT_URI
```

### Timeout Errors
If authentication takes too long:
```
❌ Authentication Timeout:
Please try again with --timeout option for more time
```

## Security Features

- **PKCE Implementation**: Uses Proof Key for Code Exchange for enhanced security
- **Token Masking**: Sensitive tokens are masked in logs and console output
- **Secure Storage**: Tokens are stored securely using the existing token store
- **State Validation**: Validates OAuth state parameter to prevent CSRF attacks

## Integration with Existing Components

The CLI tool integrates with existing MCP server components:

- **OAuthManager**: Handles OAuth flow and token management
- **AuthMiddleware**: Provides authentication validation
- **ConfigManager**: Manages environment-based configuration
- **Logger**: Provides structured logging
- **TokenStore**: Securely stores and manages tokens

## Examples

### Quick Start
```bash
# Set environment variables
export CMS_BASE_URL="https://your-cms.com/api"
export OAUTH_CLIENT_ID="your_client_id"
export OAUTH_CLIENT_SECRET="your_client_secret"
export OAUTH_REDIRECT_URI="http://localhost:3000/callback"

# Run authentication
npm run auth
```

### Automated Scripts
```bash
# Get tokens in minimal format for use in scripts
npm run auth -- --format minimal --no-browser > .env.tokens
source .env.tokens
echo "Access token: $ACCESS_TOKEN"
```

### CI/CD Integration
```bash
# Use with longer timeout for automated environments
npm run auth -- --format json --no-browser --timeout 900
```

## Troubleshooting

### Browser Issues
If the browser doesn't open automatically:
1. Copy the authorization URL from the console
2. Open it manually in your browser
3. Complete the authentication process

### Network Issues
- Ensure your CMS instance is accessible
- Check firewall settings
- Verify OAuth configuration in your CMS

### Token Issues
- Check if your OAuth client is properly configured in the CMS
- Verify the redirect URI matches your configuration
- Ensure the client has the necessary scopes

## Architecture

The CLI tool follows modular architecture principles:

```
src/cli/
├── types/cli-types.ts          # Type definitions
├── cli-config.ts               # Configuration management
├── oauth-flow-handler.ts       # OAuth flow orchestration
├── token-display.ts            # Token formatting and display
└── auth-cli.ts                 # Main CLI entry point
```

Each module is under 500 lines and handles specific responsibilities while integrating with the existing MCP server infrastructure.