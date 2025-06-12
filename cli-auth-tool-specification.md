# CLI Authentication Tool Technical Specification

## Overview

A minimal CLI tool for the CMS MCP Server project that initiates OAuth 2.0 PKCE authentication flow directly in the terminal and displays the resulting tokens. This tool leverages existing authentication components and provides a simple interface for developers to authenticate and retrieve access tokens.

## Architecture

### Core Components

#### 1. CLI Main Module (`cli-auth.ts`)
- **Purpose**: Entry point and user interface orchestration
- **Dependencies**: ConfigManager, OAuthManager, TokenDisplay
- **Responsibilities**:
  - Command-line argument parsing
  - Environment validation
  - Component initialization
  - Flow orchestration
  - Error handling and user feedback

#### 2. OAuth Flow Handler (`oauth-flow-handler.ts`)
- **Purpose**: Manages OAuth authentication flow
- **Dependencies**: OAuthManager, AuthMiddleware
- **Responsibilities**:
  - OAuth flow initiation
  - Authorization URL generation
  - Token exchange coordination
  - State management

#### 3. Token Display Module (`token-display.ts`)
- **Purpose**: Formats and displays authentication tokens
- **Dependencies**: None (pure utility)
- **Responsibilities**:
  - Token formatting (JSON, table, minimal)
  - Sensitive data masking for logs
  - Output customization

#### 4. CLI Config Handler (`cli-config.ts`)
- **Purpose**: CLI-specific configuration management
- **Dependencies**: ConfigManager
- **Responsibilities**:
  - CLI argument parsing
  - Environment variable validation
  - Configuration merging
  - Default value management

## Integration Points

### Existing Components Used

1. **OAuthManager** (`src/auth/oauth-manager.ts`)
   - `initiateFlow()`: Start OAuth PKCE flow
   - `getAuthorizationCode()`: Get authorization URL and PKCE data
   - `exchangeCodeForToken()`: Exchange auth code for tokens
   - `getValidAccessToken()`: Retrieve valid access token

2. **ConfigManager** (`src/utils/config-manager.ts`)
   - `loadConfiguration()`: Load environment-based config
   - `checkRequiredEnvVars()`: Validate required variables
   - `getConfig()`: Access configuration data

3. **AuthMiddleware** (`src/auth/auth-middleware.ts`)
   - `initialize()`: Initialize with OAuth manager
   - `isAuthenticated()`: Check authentication status

## Command Structure

### Basic Usage
```bash
npx tsx cli-auth.ts [options]
```

### Command Options
- `--format <json|table|minimal>`: Output format (default: table)
- `--no-browser`: Skip automatic browser opening
- `--timeout <seconds>`: Authentication timeout (default: 300)
- `--help`: Display help information
- `--version`: Display version information

### Environment Variables Required
- `CMS_BASE_URL`: Base URL for CMS server
- `OAUTH_CLIENT_ID`: OAuth client identifier
- `OAUTH_CLIENT_SECRET`: OAuth client secret
- `OAUTH_REDIRECT_URI`: OAuth redirect URI

## Authentication Flow

### Step-by-Step Process

1. **Initialization Phase**
   - Load and validate configuration
   - Initialize OAuth manager
   - Check existing authentication status

2. **OAuth Flow Phase**
   - Generate PKCE parameters
   - Build authorization URL
   - Display URL to user
   - Wait for authorization code input

3. **Token Exchange Phase**
   - Exchange authorization code for tokens
   - Validate token response
   - Store tokens securely

4. **Display Phase**
   - Format tokens according to specified format
   - Display tokens to user
   - Provide usage instructions

## Token Display Formats

### JSON Format
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...",
  "refresh_token": "def50200...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "expires_at": "2025-01-01T12:00:00.000Z",
  "scope": "read write"
}
```

### Table Format
```
┌─────────────────┬──────────────────────────────────────┐
│ Token Type      │ Value                                │
├─────────────────┼──────────────────────────────────────┤
│ Access Token    │ eyJ0...                              │
│ Refresh Token   │ def5...                              │
│ Token Type      │ Bearer                               │
│ Expires In      │ 3600 seconds                         │
│ Expires At      │ 2025-01-01T12:00:00.000Z             │
│ Scope           │ read write                           │
└─────────────────┴──────────────────────────────────────┘
```

### Minimal Format
```
ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
REFRESH_TOKEN=def50200...
EXPIRES_AT=2025-01-01T12:00:00.000Z
```

## Error Handling Strategy

### Error Categories

1. **Configuration Errors**
   - Missing environment variables
   - Invalid configuration values
   - Network connectivity issues

2. **Authentication Errors**
   - OAuth flow failures
   - Invalid authorization codes
   - Token exchange failures

3. **Runtime Errors**
   - Timeout errors
   - Network errors
   - Unexpected exceptions

### Error Response Format
```json
{
  "error": true,
  "error_code": "CONFIG_MISSING",
  "message": "Missing required environment variable: CMS_BASE_URL",
  "suggestions": [
    "Set CMS_BASE_URL environment variable",
    "Check .env file configuration"
  ]
}
```

## Security Considerations

### Token Security
- Never log complete tokens
- Mask sensitive data in console output
- Use secure token storage mechanisms
- Implement token expiration handling

### PKCE Implementation
- Generate cryptographically secure code verifier
- Use SHA256 for code challenge
- Validate state parameter to prevent CSRF
- Clear sensitive data after use

## File Structure

```
cli-auth-tool/
├── cli-auth.ts              # Main CLI entry point
├── oauth-flow-handler.ts    # OAuth flow management
├── token-display.ts         # Token formatting and display
├── cli-config.ts           # CLI configuration handling
└── types/
    └── cli-types.ts        # CLI-specific type definitions
```

## Dependencies

### External Dependencies
- `commander`: Command-line argument parsing
- `chalk`: Terminal color output
- `ora`: Loading spinners
- `open`: Browser opening utility

### Internal Dependencies
- `src/auth/oauth-manager.ts`
- `src/auth/auth-middleware.ts`
- `src/utils/config-manager.ts`
- `src/utils/logger.ts`
- `src/types/config-types.ts`

## Testing Strategy

### Unit Tests
- CLI argument parsing
- Token formatting functions
- Error handling scenarios
- Configuration validation

### Integration Tests
- OAuth flow end-to-end
- Token exchange process
- Error recovery scenarios
- Configuration loading

### Manual Testing
- Different output formats
- Various error conditions
- Browser integration
- Token expiration handling

## Performance Requirements

- **Startup Time**: < 2 seconds
- **Authentication Flow**: < 5 minutes (user-dependent)
- **Token Display**: < 1 second
- **Memory Usage**: < 50MB
- **File Size**: < 500 lines per module

## Constraints and Limitations

### Technical Constraints
- Must use existing OAuth components
- Environment-based configuration only
- No hardcoded secrets or URLs
- Tab-only indentation
- English language only

### Functional Limitations
- Manual authorization code input required
- Single-user authentication only
- No token refresh automation in CLI
- No persistent session management

## Future Enhancements

### Potential Features
- Automatic browser callback handling
- Token refresh automation
- Multiple authentication profiles
- Configuration file support
- Interactive configuration wizard

### Extensibility Points
- Plugin system for custom formatters
- Additional OAuth providers
- Custom authentication flows
- Integration with external tools