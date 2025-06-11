# Configuration Guide

Comprehensive configuration reference for the Ingeniux CMS MCP Server.

## Configuration Overview

The server uses environment-based configuration with validation and defaults. All sensitive data must be provided via environment variables.

## Configuration Sources

### Priority Order
1. **Environment Variables** (highest priority)
2. **Default Values** (fallback)

### Configuration Loading
```typescript
// Configuration is loaded on server startup
const config = configManager.loadConfiguration();
```

## Server Configuration

### Basic Server Settings
```bash
# Server binding
PORT=3000                    # Server port (1-65535)
HOST=localhost              # Server hostname

# Performance
API_TIMEOUT=30000           # Request timeout in milliseconds
MAX_RETRIES=3               # Maximum retry attempts (0-10)
RATE_LIMIT_RPM=100         # Requests per minute limit
```

### CMS Connection
```bash
# Required: Base URL for Ingeniux CMS
CMS_BASE_URL=https://cms.example.com/api

# The server automatically builds OAuth URLs:
# Authorization: {CMS_BASE_URL}/oauth/authorize
# Token: {CMS_BASE_URL}/oauth/token
```

## OAuth Configuration

### Required OAuth Settings
```bash
# OAuth Application Credentials
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
```

### OAuth URL Construction
The server automatically constructs OAuth URLs from `CMS_BASE_URL`:
- **Authorization URL**: `{CMS_BASE_URL}/oauth/authorize`
- **Token URL**: `{CMS_BASE_URL}/oauth/token`

### OAuth Scopes
Default scopes are automatically configured:
- `read` - Read access to CMS content
- `write` - Write access to CMS content

## Caching Configuration

### Cache Settings
```bash
# Cache time-to-live in seconds
CACHE_TTL=300               # Default: 5 minutes (0-3600)

# Cache is automatically configured with:
# - Max size: 1000 items
# - Eviction policy: LRU (Least Recently Used)
```

### Cache Behavior
- **API Responses**: Cached based on endpoint and parameters
- **Token Data**: Cached until expiration
- **Configuration**: Cached for application lifetime

## Logging Configuration

### Log Levels
```bash
LOG_LEVEL=info              # error, warn, info, debug
```

### Log Level Details
| Level | Description | Use Case |
|-------|-------------|----------|
| `error` | Error messages only | Production |
| `warn` | Warnings and errors | Production |
| `info` | General information | Default |
| `debug` | Detailed debugging | Development |

### Log Format
- **Format**: JSON structured logging
- **Destination**: Console output
- **Fields**: timestamp, level, message, metadata

## Security Configuration

### Token Security
```bash
# Optional: Custom encryption key for token storage
TOKEN_ENCRYPTION_KEY=your_32_character_key_here
```

### Security Features
- **PKCE**: Automatically enabled for OAuth flows
- **State Validation**: CSRF protection for OAuth
- **Token Encryption**: AES-256 encryption for stored tokens
- **Input Sanitization**: All inputs validated and sanitized

## Validation Rules

### URL Validation
- All URLs must be valid HTTP/HTTPS
- CMS_BASE_URL must be accessible
- Redirect URI must match OAuth app configuration

### Numeric Validation
- Port: 1-65535
- Timeout: 1000-120000 milliseconds
- Retries: 0-10 attempts
- Rate limit: 1-1000 requests per minute
- Cache TTL: 0-3600 seconds

### String Validation
- Client ID/Secret: Non-empty strings
- Log level: Must be valid level
- Host: Valid hostname or IP

## Environment Examples

### Development Environment
```bash
# Development .env file
CMS_BASE_URL=https://dev-cms.example.com/api
OAUTH_CLIENT_ID=dev_client_id
OAUTH_CLIENT_SECRET=dev_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
LOG_LEVEL=debug
API_TIMEOUT=10000
```

### Production Environment
```bash
# Production environment variables
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
LOG_LEVEL=warn
API_TIMEOUT=30000
RATE_LIMIT_RPM=500
```

## Configuration Validation

### Startup Validation
The server validates configuration on startup:
```bash
[INFO] Configuration loaded successfully
[INFO] OAuth manager initialized
[INFO] API client initialized
```

### Validation Errors
Common validation errors and solutions:

**Invalid URL format**
```bash
Error: Configuration validation failed: cmsBaseUrl: Invalid url
Solution: Ensure CMS_BASE_URL is a valid HTTP/HTTPS URL
```

**Missing required variables**
```bash
Error: Missing required environment variables: OAUTH_CLIENT_ID
Solution: Set all required environment variables
```

**Invalid numeric values**
```bash
Error: Configuration validation failed: port: Number must be greater than or equal to 1
Solution: Check numeric ranges for all configuration values
```

## Dynamic Configuration

### Runtime Configuration Access
```typescript
// Get configuration value
const timeout = configManager.getConfigValue<number>('apiTimeout');
const oauthClientId = configManager.getConfigValue<string>('oauth.clientId');
```

### Configuration Updates
- OAuth configuration can be updated at runtime
- Server restart required for other configuration changes
- Environment variables take precedence over runtime updates

## Best Practices

### Security Best Practices
1. **Never hardcode secrets** in configuration files
2. **Use environment variables** for all sensitive data
3. **Rotate client secrets** regularly
4. **Use HTTPS** in production environments
5. **Validate redirect URIs** in OAuth applications

### Performance Best Practices
1. **Tune timeouts** based on network conditions
2. **Adjust cache TTL** for optimal performance
3. **Set appropriate rate limits** for your usage
4. **Monitor memory usage** with large cache sizes

### Operational Best Practices
1. **Use structured logging** in production
2. **Set appropriate log levels** for environment
3. **Monitor configuration validation** errors
4. **Document environment-specific settings**

## Troubleshooting

### Configuration Issues
1. **Check environment variables** are set correctly
2. **Validate URL formats** and accessibility
3. **Verify OAuth application** configuration
4. **Test network connectivity** to CMS

### Debug Configuration
Enable debug logging to troubleshoot:
```bash
LOG_LEVEL=debug npm start
```

This will show detailed configuration loading and validation information.