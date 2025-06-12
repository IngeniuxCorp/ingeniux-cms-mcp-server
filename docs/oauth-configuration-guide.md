# OAuth Configuration Guide

Complete configuration reference for OAuth 2.0 integration setup and management.

## Overview

The OAuth integration requires proper configuration of environment variables, OAuth application setup in your CMS, and optional security settings for production deployment.

## Prerequisites

### CMS Requirements
- **Ingeniux CMS**: Version 10.6.378 or higher
- **OAuth Support**: CMS must have OAuth 2.0 endpoints enabled
- **API Access**: WebAPI must be accessible from MCP server
- **Admin Access**: Required to create OAuth applications

### Network Requirements
- **HTTPS**: Required for production OAuth flows
- **Firewall**: Allow outbound HTTPS to CMS OAuth endpoints
- **DNS**: Proper hostname resolution for CMS base URL
- **Ports**: Default port 3000 or custom port for redirect URI

## OAuth Application Setup

### 1. Create OAuth Application in CMS
Access your Ingeniux CMS admin panel and create a new OAuth application:

**Application Settings**:
- **Name**: `MCP Server Integration`
- **Type**: `Confidential Client`
- **Grant Types**: `Authorization Code`, `Refresh Token`
- **Scopes**: `read`, `write`
- **PKCE**: `Required` (recommended for security)

**Redirect URIs**:
```
# Development
http://localhost:3000/callback

# Production
https://your-mcp-server.example.com/callback
```

### 2. Obtain OAuth Credentials
After creating the application, note these values:
- **Client ID**: Public identifier for your application
- **Client Secret**: Private secret (keep secure)
- **Authorization URL**: `{CMS_BASE_URL}/oauth/authorize`
- **Token URL**: `{CMS_BASE_URL}/oauth/token`

## Environment Configuration

### Required Variables
```bash
# CMS Connection
CMS_BASE_URL=https://cms.example.com/api

# OAuth Application Credentials
OAUTH_CLIENT_ID=your_client_id_here
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_REDIRECT_URI=http://localhost:3000/callback
```

### Optional Security Variables
```bash
# Token Encryption (recommended for production)
TOKEN_ENCRYPTION_KEY=your_32_character_encryption_key

# Server Configuration
PORT=3000
HOST=localhost
LOG_LEVEL=info
```

### Environment File Setup

#### Development (.env)
```bash
# Development environment configuration
CMS_BASE_URL=https://dev-cms.example.com/api
OAUTH_CLIENT_ID=dev_client_12345
OAUTH_CLIENT_SECRET=dev_secret_abcdef
OAUTH_REDIRECT_URI=http://localhost:3000/callback
TOKEN_ENCRYPTION_KEY=dev_encryption_key_32_characters
LOG_LEVEL=debug
PORT=3000
```

#### Production (.env.production)
```bash
# Production environment configuration
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=prod_client_67890
OAUTH_CLIENT_SECRET=prod_secret_xyz789
OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
TOKEN_ENCRYPTION_KEY=prod_encryption_key_32_characters
LOG_LEVEL=warn
PORT=443
```

## Configuration Validation

### Startup Validation
The server validates all OAuth configuration on startup:

```bash
[INFO] Loading OAuth configuration...
[INFO] Validating CMS connectivity...
[INFO] OAuth manager initialized successfully
[INFO] Token store configured with encryption
[INFO] Server ready for OAuth authentication
```

### Common Validation Errors

#### Missing Required Variables
```bash
Error: Missing required environment variables: OAUTH_CLIENT_ID
Solution: Set all required OAuth environment variables
```

#### Invalid CMS URL
```bash
Error: Configuration validation failed: cmsBaseUrl: Invalid url
Solution: Ensure CMS_BASE_URL is a valid HTTPS URL
```

#### OAuth Application Mismatch
```bash
Error: OAuth request failed: invalid_client
Solution: Verify client ID and secret match CMS application
```

#### Redirect URI Mismatch
```bash
Error: OAuth request failed: invalid_redirect_uri
Solution: Ensure redirect URI matches CMS application configuration
```

## Security Configuration

### Token Encryption
```bash
# Generate secure encryption key (32 characters)
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 16)
```

**Key Requirements**:
- **Length**: Exactly 32 characters
- **Randomness**: Cryptographically secure random generation
- **Storage**: Secure environment variable storage
- **Rotation**: Regular key rotation recommended

### HTTPS Configuration
For production deployments, ensure HTTPS is properly configured:

```bash
# Production HTTPS settings
OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
CMS_BASE_URL=https://cms.example.com/api
```

### Network Security
- **Firewall Rules**: Allow only necessary outbound HTTPS
- **DNS Security**: Use secure DNS resolution
- **Certificate Validation**: Verify SSL certificates
- **Rate Limiting**: Configure appropriate request limits

## OAuth Scopes

### Available Scopes
The server requests these OAuth scopes by default:

| Scope | Description | Required For |
|-------|-------------|--------------|
| `read` | Read access to CMS content | [`cms_get_page`](api-reference.md:54), [`cms_list_pages`](api-reference.md:177), [`cms_search_content`](api-reference.md:234) |
| `write` | Write access to CMS content | [`cms_create_page`](api-reference.md:84), [`cms_update_page`](api-reference.md:120), [`cms_delete_page`](api-reference.md:150), [`cms_publish_page`](api-reference.md:207) |

### Custom Scope Configuration
To modify requested scopes, update the OAuth configuration:

```typescript
// Custom scope configuration
const oauthConfig: OAuthConfig = {
	// ... other config
	scopes: ['read', 'write', 'admin'] // Add custom scopes
};
```

## Token Configuration

### Token Caching Settings
The server enforces a 20-minute token cache with these settings:

```typescript
// Fixed token configuration
const TOKEN_CONFIG = {
	ttl: 1200,        // 20 minutes in seconds
	refreshBuffer: 60, // 1 minute refresh buffer
	encryption: true,  // Always encrypted
	autoCleanup: true  // Automatic expired token removal
};
```

### Token Refresh Behavior
- **Automatic Refresh**: Tokens refreshed 1 minute before expiry
- **Refresh Failure**: Initiates new OAuth flow
- **Concurrent Requests**: Thread-safe token management
- **Error Handling**: Graceful degradation on refresh failures

## Configuration Testing

### Validate OAuth Setup
Use these commands to test your OAuth configuration:

```bash
# Test CMS connectivity
curl -f "${CMS_BASE_URL}/health" || echo "CMS not accessible"

# Test OAuth endpoints
curl -f "${CMS_BASE_URL}/oauth/authorize" || echo "OAuth not configured"

# Start server with debug logging
LOG_LEVEL=debug npm start
```

### Test Authentication Flow
1. **Start server**: `npm start`
2. **Check health**: Use [`health_check`](api-reference.md:7) tool
3. **Initiate OAuth**: Use [`initiate_oauth`](api-reference.md:37) tool
4. **Complete flow**: Visit authorization URL
5. **Test tools**: Use any CMS tool to verify authentication

### Debug Configuration Issues
Enable debug logging to troubleshoot configuration:

```bash
# Debug environment loading
LOG_LEVEL=debug npm start

# Check specific configuration values
node -e "console.log(process.env.OAUTH_CLIENT_ID ? 'Client ID set' : 'Missing client ID')"
```

## Environment-Specific Configuration

### Development Environment
```bash
# Relaxed security for development
CMS_BASE_URL=http://localhost:8080/api  # HTTP allowed
OAUTH_REDIRECT_URI=http://localhost:3000/callback
LOG_LEVEL=debug
TOKEN_ENCRYPTION_KEY=dev_key_32_chars_for_testing_only
```

### Staging Environment
```bash
# Production-like with debug logging
CMS_BASE_URL=https://staging-cms.example.com/api
OAUTH_REDIRECT_URI=https://staging-mcp.example.com/callback
LOG_LEVEL=info
TOKEN_ENCRYPTION_KEY=staging_secure_key_32_characters
```

### Production Environment
```bash
# Maximum security configuration
CMS_BASE_URL=https://cms.example.com/api
OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
LOG_LEVEL=warn
TOKEN_ENCRYPTION_KEY=prod_secure_key_32_characters_here
```

## Configuration Management

### Environment Variable Precedence
1. **System Environment**: Highest priority
2. **Docker Environment**: Container-specific
3. **Process Environment**: Application-specific
4. **Default Values**: Fallback values

### Configuration Updates
- **Runtime Updates**: OAuth config can be updated at runtime
- **Server Restart**: Required for base URL changes
- **Token Refresh**: Automatic after configuration updates
- **Validation**: Immediate validation of new configuration

### Backup and Recovery
- **Configuration Backup**: Store environment templates securely
- **Secret Rotation**: Regular OAuth secret updates
- **Disaster Recovery**: Documented configuration restoration
- **Monitoring**: Alert on configuration validation failures

## Best Practices

### Security Best Practices
1. **Never commit secrets** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate OAuth secrets** regularly (quarterly recommended)
4. **Use HTTPS** in all non-development environments
5. **Monitor OAuth usage** for suspicious activity

### Operational Best Practices
1. **Document configuration** for each environment
2. **Test configuration changes** in staging first
3. **Monitor token refresh rates** for performance
4. **Set up alerting** for OAuth failures
5. **Regular security audits** of OAuth applications

### Development Best Practices
1. **Use separate OAuth apps** for each environment
2. **Local development** with HTTP allowed
3. **Debug logging** enabled in development
4. **Configuration validation** in CI/CD pipelines
5. **Automated testing** of OAuth flows

## Troubleshooting

### Common Configuration Issues

#### Client Authentication Failed
**Error**: `invalid_client`
**Cause**: Incorrect client ID or secret
**Solution**: Verify credentials match CMS OAuth application

#### Redirect URI Mismatch
**Error**: `invalid_redirect_uri`
**Cause**: Redirect URI doesn't match CMS configuration
**Solution**: Update CMS application or environment variable

#### Network Connectivity
**Error**: `Network error: Unable to connect`
**Cause**: CMS not accessible or firewall blocking
**Solution**: Test network connectivity and firewall rules

#### Token Encryption Issues
**Error**: `Failed to decrypt token`
**Cause**: Encryption key changed or corrupted
**Solution**: Clear token cache and re-authenticate

For detailed troubleshooting steps, see [OAuth Troubleshooting Guide](oauth-troubleshooting-guide.md).