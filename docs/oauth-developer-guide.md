# OAuth Developer Guide

Technical implementation guide for OAuth 2.0 integration in the CMS MCP Server.

## Architecture Overview

### OAuth Integration Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content Tools │────│ Auth Middleware │────│  OAuth Manager  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Client    │────│ Auth Wrapper    │────│   Token Store   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

#### 1. OAuth Manager ([`src/auth/oauth-manager.ts`](../src/auth/oauth-manager.ts:22))
- **Two-step OAuth process**: [`getAuthorizationCode()`](../src/auth/oauth-manager.ts:41) → [`getAccessToken()`](../src/auth/oauth-manager.ts:81)
- **PKCE implementation**: Secure code exchange with SHA256 challenge
- **Token management**: Automatic refresh and validation
- **Error handling**: Comprehensive OAuth error management

#### 2. Token Store ([`src/auth/token-store.ts`](../src/auth/token-store.ts:8))
- **20-minute caching**: Enforced [`TOKEN_TTL = 1200`](../src/auth/token-store.ts:13) seconds
- **AES-256 encryption**: Secure token storage with [`encrypt()`](../src/auth/token-store.ts:250)/[`decrypt()`](../src/auth/token-store.ts:270)
- **Automatic cleanup**: [`scheduleCleanup()`](../src/auth/token-store.ts:301) removes expired tokens
- **Thread-safe operations**: Singleton pattern with validation

#### 3. Auth Middleware ([`src/auth/auth-middleware.ts`](../src/auth/auth-middleware.ts:9))
- **Request authentication**: [`authenticate()`](../src/auth/auth-middleware.ts:32) adds Bearer headers
- **Token validation**: [`validateAuthentication()`](../src/auth/auth-middleware.ts:278) checks expiry
- **Flow initiation**: [`createAuthChallenge()`](../src/auth/auth-middleware.ts:208) starts OAuth
- **Error handling**: [`handleAuthError()`](../src/auth/auth-middleware.ts:94) manages failures

#### 4. Content Tools ([`src/tools/content-tools.ts`](../src/tools/content-tools.ts:12))
- **Authentication wrapper**: [`wrapToolWithAuth()`](../src/tools/content-tools.ts:22) for all CMS tools
- **Automatic validation**: Pre-execution authentication checks
- **Error responses**: Structured authentication error messages
- **Tool integration**: Seamless OAuth for 7 CMS tools

#### 5. API Client ([`src/api/api-client.ts`](../src/api/api-client.ts:9))
- **Automatic headers**: [`addAuthHeaders()`](../src/api/api-client.ts:415) injects Bearer tokens
- **Auth error detection**: [`isAuthError()`](../src/api/api-client.ts:444) identifies 401/403
- **Retry logic**: [`makeRequestWithRetry()`](../src/api/api-client.ts:166) with exponential backoff
- **Rate limiting**: [`checkRateLimit()`](../src/api/api-client.ts:244) prevents abuse

## OAuth Flow Implementation

### Two-Step OAuth Process

#### Step 1: Authorization Code
```typescript
// Generate PKCE parameters and authorization URL
const authFlow = oauthManager.getAuthorizationCode();
// Returns: { url, state, codeVerifier }
```

**Implementation Details**:
- **PKCE generation**: [`generateCodeVerifier()`](../src/auth/oauth-manager.ts:218) creates secure random string
- **Code challenge**: [`generateCodeChallenge()`](../src/auth/oauth-manager.ts:231) uses SHA256
- **State parameter**: [`generateState()`](../src/auth/oauth-manager.ts:245) for CSRF protection
- **URL building**: [`buildAuthorizationUrl()`](../src/auth/oauth-manager.ts:258) with all parameters

#### Step 2: Token Exchange
```typescript
// Exchange authorization code for access token
const tokenData = await oauthManager.getAccessToken(code, state);
// Automatically stores with 20-minute expiry
```

**Implementation Details**:
- **State validation**: Verifies CSRF protection parameter
- **Code exchange**: [`exchangeCodeForToken()`](../src/auth/oauth-manager.ts:100) with PKCE verifier
- **Token processing**: [`processTokenResponse()`](../src/auth/oauth-manager.ts:319) normalizes response
- **Automatic storage**: [`tokenStore.store()`](../src/auth/token-store.ts:30) with encryption

### Token Caching Strategy

#### 20-Minute Expiry Enforcement
```typescript
// Fixed 20-minute TTL regardless of server response
const expiresAt = new Date(Date.now() + (this.TOKEN_TTL * 1000));
const tokenWithFixedExpiry = { ...tokens, expiresAt };
```

**Key Features**:
- **Override server expiry**: Always enforces 20-minute limit
- **Automatic cleanup**: [`scheduleCleanup()`](../src/auth/token-store.ts:301) sets timer
- **Validation checks**: [`isValid()`](../src/auth/token-store.ts:106) against current time
- **Refresh buffer**: 60-second buffer before expiry

#### Token Validation Logic
```typescript
// Multi-layer validation
const isValid = tokenStore.isValid() && 
                !tokenStore.expiresWithin(1) && 
                authMiddleware.validateAuthHeader(token);
```

## Authentication Wrapper Pattern

### Tool Wrapping Implementation
```typescript
// Wrap all CMS tools with authentication
private wrapToolWithAuth(tool: MCPTool): MCPTool {
	// Skip auth for initiate_oauth tool
	if (tool.name === 'initiate_oauth') {
		return tool;
	}

	return {
		...tool,
		handler: async (params: any): Promise<ToolResult> => {
			// Step 1: Validate authentication
			const isAuthenticated = await authMiddleware.isAuthenticated();
			
			if (!isAuthenticated) {
				// Return auth challenge
				const authChallenge = authMiddleware.createAuthChallenge();
				return createAuthErrorResponse(authChallenge);
			}

			// Step 2: Execute original tool
			return await tool.handler(params);
		}
	};
}
```

### Authentication Flow
1. **Pre-execution check**: [`isAuthenticated()`](../src/auth/auth-middleware.ts:64) validates token
2. **Token retrieval**: [`getValidAccessToken()`](../src/auth/oauth-manager.ts:172) with refresh
3. **Header injection**: Automatic Bearer token addition
4. **Error handling**: Structured authentication error responses

## Security Implementation

### PKCE (Proof Key for Code Exchange)
```typescript
// Secure code verifier generation
private generateCodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

// SHA256 code challenge
private generateCodeChallenge(codeVerifier: string): string {
	return createHash('sha256')
		.update(codeVerifier)
		.digest('base64url');
}
```

### Token Encryption
```typescript
// AES-256-CBC encryption for token storage
private encrypt(data: string): string {
	const iv = randomBytes(16);
	const key = createHash('sha256').update(this.encryptionKey).digest();
	const cipher = createCipheriv('aes-256-cbc', key, iv);
	
	let encrypted = cipher.update(data, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	
	return iv.toString('hex') + ':' + encrypted;
}
```

### State Validation
```typescript
// CSRF protection with state parameter
const pkceData = this.pendingAuth.get(state);
if (!pkceData) {
	throw new Error('Invalid or expired state parameter');
}
```

## Error Handling Strategy

### Authentication Error Types
```typescript
enum AuthErrorType {
	TOKEN_MISSING = 'TOKEN_MISSING',
	TOKEN_EXPIRED = 'TOKEN_EXPIRED', 
	TOKEN_INVALID = 'TOKEN_INVALID',
	OAUTH_FLOW_REQUIRED = 'OAUTH_FLOW_REQUIRED',
	REFRESH_FAILED = 'REFRESH_FAILED'
}
```

### Error Response Format
```typescript
interface AuthErrorResponse {
	error: AuthErrorType;
	message: string;
	requiresAuth: boolean;
	authUrl?: string;
	retryAfter?: number;
}
```

### Automatic Error Recovery
```typescript
// Automatic token refresh on expiry
private async handleMissingToken(): Promise<AuthValidationResult> {
	try {
		// Try refresh first
		const refreshedToken = await this.oauthManager.refreshToken();
		if (refreshedToken) {
			return { isValid: true, token: refreshedToken.accessToken };
		}
	} catch {
		// Refresh failed, initiate new OAuth flow
	}
	
	// Generate new authorization URL
	const authFlow = this.oauthManager.getAuthorizationCode();
	return {
		isValid: false,
		requiresAuth: true,
		authUrl: authFlow.url
	};
}
```

## Performance Optimizations

### Authentication Overhead
- **Target latency**: <50ms per tool call
- **Token validation**: In-memory cache lookup
- **Header injection**: Minimal string operations
- **Error handling**: Fast-path for valid tokens

### Memory Management
- **Automatic cleanup**: Expired token removal
- **Singleton patterns**: Shared instances
- **Efficient encryption**: Minimal memory allocation
- **Connection pooling**: HTTP connection reuse

### Caching Strategy
- **Token cache**: 20-minute TTL with automatic refresh
- **Configuration cache**: Application lifetime
- **Request cache**: Optional response caching
- **Rate limit cache**: Per-endpoint tracking

## Integration Points

### MCP Tool Integration
```typescript
// All CMS tools automatically wrapped
public getTools(): MCPTool[] {
	const authTools = new AuthTools();
	const cmsTools = [
		this.createGetPageTool(),
		this.createCreatePageTool(),
		// ... other CMS tools
	];

	return [
		...authTools.getTools(), // No wrapper needed
		...cmsTools.map(tool => this.wrapToolWithAuth(tool))
	];
}
```

### API Client Integration
```typescript
// Automatic authentication for all requests
public async request<T>(request: APIRequest): Promise<APIResponse<T>> {
	// Add authentication headers automatically
	const authenticatedRequest = await this.addAuthHeaders(request);
	
	// Make authenticated request
	return await this.makeRequestWithRetry(url, options);
}
```

## Testing Strategy

### Unit Tests
- **Token validation**: 20-minute expiry enforcement
- **PKCE generation**: Secure parameter creation
- **Encryption/decryption**: Token security validation
- **Error handling**: All error scenarios covered

### Integration Tests
- **End-to-end OAuth flow**: Complete authentication process
- **Tool authentication**: All CMS tools with auth wrapper
- **Token refresh**: Automatic refresh scenarios
- **Error recovery**: Authentication failure handling

### Performance Tests
- **Authentication latency**: <50ms target validation
- **Memory usage**: Token cache efficiency
- **Concurrent requests**: Thread safety validation
- **Rate limiting**: API abuse prevention

## Configuration

### Environment Variables
```bash
# OAuth configuration (required)
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional security configuration
TOKEN_ENCRYPTION_KEY=your_32_character_key_here
```

### Runtime Configuration
```typescript
// OAuth manager configuration
const oauthConfig: OAuthConfig = {
	clientId: process.env.OAUTH_CLIENT_ID!,
	clientSecret: process.env.OAUTH_CLIENT_SECRET!,
	authorizationUrl: `${cmsBaseUrl}/oauth/authorize`,
	tokenUrl: `${cmsBaseUrl}/oauth/token`,
	redirectUri: process.env.OAUTH_REDIRECT_URI!,
	scopes: ['read', 'write']
};
```

## Best Practices

### Security
1. **Never log tokens** - Exclude from all logging
2. **Use HTTPS only** - Secure transmission required
3. **Rotate secrets** - Regular client secret updates
4. **Validate inputs** - All OAuth parameters sanitized

### Performance
1. **Cache tokens** - Minimize OAuth requests
2. **Batch operations** - Group related API calls
3. **Monitor latency** - Track authentication overhead
4. **Handle errors** - Graceful degradation

### Maintenance
1. **Monitor token usage** - Track refresh patterns
2. **Log authentication events** - Audit trail maintenance
3. **Update dependencies** - Security patch management
4. **Test regularly** - Automated OAuth flow validation

For implementation examples and troubleshooting, see [OAuth User Guide](oauth-user-guide.md) and [OAuth Troubleshooting Guide](oauth-troubleshooting-guide.md).