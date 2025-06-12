# CLI Authentication Tool Usage Guide

The CLI Authentication Tool provides a command-line interface for authenticating with the CMS MCP Server using OAuth 2.0 with PKCE (Proof Key for Code Exchange).

## Quick Start

1. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your OAuth configuration
   ```

2. **Run Authentication**
   ```bash
   npx tsx auth-cli.ts
   ```

3. **Follow Browser Instructions**
   - Browser opens automatically
   - Complete OAuth flow
   - Copy authorization code
   - Paste code in terminal

## Installation & Setup

### Prerequisites

- Node.js 18+ with TypeScript support
- Valid OAuth client credentials
- Access to CMS server

### Environment Configuration

Create `.env` file with required variables:

```bash
# Required OAuth Configuration
CMS_BASE_URL=https://your-cms-instance.com/api
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional Settings
API_TIMEOUT=30000
LOG_LEVEL=info
```

### Verification

Test configuration:
```bash
npx tsx auth-cli.ts --help
```

## Command-Line Options

### Basic Usage

```bash
npx tsx auth-cli.ts [options]
```

### Available Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--format <type>` | `-f` | Output format (json\|table\|minimal) | `table` |
| `--no-browser` | | Skip automatic browser opening | `false` |
| `--timeout <seconds>` | `-t` | Authentication timeout | `300` |
| `--verbose` | | Enable verbose logging | `false` |
| `--help` | `-h` | Display help information | |
| `--version` | `-v` | Display version information | |

### Format Options

#### Table Format (Default)
```bash
npx tsx auth-cli.ts --format table
```
Displays tokens in readable table format with usage instructions.

#### JSON Format
```bash
npx tsx auth-cli.ts --format json
```
Outputs structured JSON for programmatic use:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "token_type": "Bearer",
  "expires_at": "2025-06-12T17:30:00.000Z",
  "expires_in": 3600,
  "scope": "read write"
}
```

#### Minimal Format
```bash
npx tsx auth-cli.ts --format minimal
```
Outputs environment variable format:
```bash
ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGc...
REFRESH_TOKEN=def50200a1b2c3d4e5f6...
TOKEN_TYPE=Bearer
EXPIRES_AT=2025-06-12T17:30:00.000Z
```

## Usage Examples

### Standard Authentication
```bash
# Default table output with browser
npx tsx auth-cli.ts
```

### Headless Authentication
```bash
# Manual browser navigation
npx tsx auth-cli.ts --no-browser
```

### Extended Timeout
```bash
# 10-minute timeout for slow authentication
npx tsx auth-cli.ts --timeout 600
```

### JSON Output for Scripts
```bash
# Capture tokens in JSON format
npx tsx auth-cli.ts --format json > tokens.json
```

### Environment Variables Export
```bash
# Generate environment variables
npx tsx auth-cli.ts --format minimal > auth.env
source auth.env
```

### Verbose Debugging
```bash
# Enable detailed logging
npx tsx auth-cli.ts --verbose
```

## Authentication Flow

### Step-by-Step Process

1. **Configuration Loading**
   - Validates environment variables
   - Initializes OAuth configuration
   - Checks existing authentication

2. **OAuth Flow Initiation**
   - Generates PKCE parameters
   - Creates authorization URL
   - Opens browser (unless `--no-browser`)

3. **User Authentication**
   - User completes OAuth flow in browser
   - Authorization code returned to redirect URI
   - User copies code from callback

4. **Token Exchange**
   - Authorization code exchanged for tokens
   - Access and refresh tokens stored securely
   - Token details displayed in chosen format

### Security Features

- **PKCE Implementation**: Prevents authorization code interception
- **State Validation**: Protects against CSRF attacks
- **Secure Token Storage**: Encrypted token persistence
- **Automatic Expiration**: Token validity checking

## Output Formats

### Table Format Example
```
🔑 Authentication Tokens:
──────────────────────────────────────────────────────────────────────
Access Token    │ eyJ0eXAiOi...V1QiLCJhbGc
Refresh Token   │ def50200a1...b2c3d4e5f6
Token Type      │ Bearer
Expires At      │ 2025-06-12T17:30:00.000Z
Expires In      │ 3600 seconds
Scope           │ read write

📋 Usage Instructions:
──────────────────────────────────────────────
• Use the access token for API requests
• Include as Authorization: Bearer <access_token>
• Token expires at: 6/12/2025, 10:30:00 AM
```

### JSON Format Example
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...",
  "refresh_token": "def50200a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...",
  "token_type": "Bearer",
  "expires_at": "2025-06-12T17:30:00.000Z",
  "expires_in": 3600,
  "scope": "read write"
}
```

### Minimal Format Example
```bash
# Environment Variables:
ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...
REFRESH_TOKEN=def50200a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...
TOKEN_TYPE=Bearer
EXPIRES_AT=2025-06-12T17:30:00.000Z
EXPIRES_IN=3600
SCOPE=read write
```

## Integration with MCP Server

### Using Obtained Tokens

After successful authentication, use tokens with MCP server:

```bash
# Export tokens as environment variables
npx tsx auth-cli.ts --format minimal > auth.env
source auth.env

# Start MCP server with authentication
npm start
```

### Token Management

- **Automatic Refresh**: Tokens refresh automatically when expired
- **Persistent Storage**: Tokens stored securely between sessions
- **Validation**: Token validity checked before use

### MCP Client Configuration

Configure MCP client with obtained tokens:
```json
{
  "mcpServers": {
    "cms-server": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "ACCESS_TOKEN": "your_access_token_here"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### Configuration Errors
**Problem**: Missing environment variables
```
❌ Configuration Error:
Required environment variables:
- CMS_BASE_URL
- OAUTH_CLIENT_ID
- OAUTH_CLIENT_SECRET
- OAUTH_REDIRECT_URI
```

**Solution**: 
1. Copy `.env.example` to `.env`
2. Fill in all required values
3. Verify URLs are accessible

#### Authentication Timeout
**Problem**: Authentication takes too long
```
❌ Authentication Timeout:
Please try again with --timeout option for more time
```

**Solution**:
```bash
# Increase timeout to 10 minutes
npx tsx auth-cli.ts --timeout 600
```

#### Browser Issues
**Problem**: Browser doesn't open automatically
```
⚠️ Could not open browser automatically
```

**Solution**:
```bash
# Use manual browser navigation
npx tsx auth-cli.ts --no-browser
# Copy URL from terminal and open manually
```

#### Invalid Authorization Code
**Problem**: Code exchange fails
```
❌ Token exchange failed: Invalid authorization code
```

**Solution**:
1. Ensure code is copied completely
2. Don't include extra spaces or characters
3. Complete authentication quickly (codes expire)

#### Network Connectivity
**Problem**: Cannot reach OAuth server
```
❌ OAuth flow initiation failed: Network error
```

**Solution**:
1. Check internet connectivity
2. Verify `CMS_BASE_URL` is correct
3. Check firewall/proxy settings

### Debug Mode

Enable verbose logging for detailed troubleshooting:
```bash
npx tsx auth-cli.ts --verbose
```

This provides:
- Configuration validation details
- OAuth flow step-by-step logging
- Network request/response information
- Token exchange debugging

### Log Files

Check application logs for additional details:
```bash
# View recent logs
tail -f logs/mcp-server.log

# Search for authentication errors
grep -i "auth\|oauth\|token" logs/mcp-server.log
```

### Environment Validation

Verify environment setup:
```bash
# Check required variables
echo $CMS_BASE_URL
echo $OAUTH_CLIENT_ID
echo $OAUTH_REDIRECT_URI

# Test URL accessibility
curl -I $CMS_BASE_URL
```

### Getting Help

1. **Check Documentation**: Review OAuth configuration guides
2. **Enable Verbose Mode**: Use `--verbose` for detailed output
3. **Verify Configuration**: Ensure all environment variables are correct
4. **Test Connectivity**: Verify network access to CMS server
5. **Check Logs**: Review application logs for specific errors

## Advanced Usage

### Scripting Integration

```bash
#!/bin/bash
# Automated authentication script

# Authenticate and capture tokens
npx tsx auth-cli.ts --format json > tokens.json

# Extract access token
ACCESS_TOKEN=$(jq -r '.access_token' tokens.json)

# Use token in API calls
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
     "$CMS_BASE_URL/pages"
```

### CI/CD Integration

For automated environments, consider using service account authentication instead of interactive OAuth flow.

### Token Refresh

The tool automatically handles token refresh, but you can manually refresh:
```bash
# Re-run authentication to refresh tokens
npx tsx auth-cli.ts
```

### Multiple Environments

Use different `.env` files for different environments:
```bash
# Development
cp .env.dev .env
npx tsx auth-cli.ts

# Production
cp .env.prod .env
npx tsx auth-cli.ts