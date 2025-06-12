# OAuth Integration Specification for CMS MCP Server

## Overview

This specification defines the integration of OAuth 2.0 authentication flow into all CMS MCP Server tools with automatic token management, 20-minute token caching, and seamless authentication handling.

## Current Architecture Analysis

### Existing Components
- **OAuthManager**: Handles OAuth flow with PKCE (lines 22-339 in oauth-manager.ts)
- **AuthMiddleware**: Manages authentication for requests (lines 9-261 in auth-middleware.ts)
- **TokenStore**: Caches tokens with encryption (lines 8-283 in token-store.ts)
- **ContentTools**: 7 CMS tools without automatic auth checking (lines 10-499 in content-tools.ts)
- **APIClient**: Makes HTTP requests without auth integration (lines 8-403 in api-client.ts)

### Current Issues
1. Tools don't automatically check for valid tokens before execution
2. Token cache uses default expiry (not 20 minutes as required)
3. No automatic OAuth flow initiation on token expiry
4. Authorization header format not standardized across tools

## Requirements

### Functional Requirements
1. **FR-1**: All tools (except `initiate_oauth`) must validate OAuth tokens before execution
2. **FR-2**: Automatic OAuth flow initiation when token is missing/expired
3. **FR-3**: Token caching for exactly 20 minutes (1200 seconds)
4. **FR-4**: Authorization header format: "Authorization: Bearer [token]"
5. **FR-5**: Two-step OAuth process: getAuthorizationCode() → getAccessToken()
6. **FR-6**: No hard-coded environment variables or secrets

### Non-Functional Requirements
1. **NFR-1**: Authentication wrapper must add <50ms latency per tool call
2. **NFR-2**: Token validation must be thread-safe
3. **NFR-3**: Error handling must provide clear authentication failure messages
4. **NFR-4**: All modules must remain under 500 lines

## Technical Design

### 1. Token Validation Logic

#### 1.1 Authentication Wrapper Pattern
```typescript
interface AuthenticatedTool {
	requiresAuth: boolean;
	originalHandler: ToolHandler;
	authWrapper: (params: any) => Promise<ToolResult>;
}
```

#### 1.2 Token Validation Flow
```
START → Check Token Exists → Check Token Valid → Check 20min Expiry
  ↓              ↓                ↓                    ↓
  NO            NO              NO                   YES
  ↓              ↓                ↓                    ↓
Initiate OAuth → Initiate OAuth → Refresh Token → Execute Tool
```

### 2. 20-Minute Token Caching Strategy

#### 2.1 Cache Configuration
- **Cache Duration**: Exactly 1200 seconds (20 minutes)
- **Buffer Time**: 60 seconds before expiry for refresh
- **Storage**: In-memory with encryption
- **Cleanup**: Automatic on expiry

#### 2.2 Cache Management
```typescript
interface TokenCacheConfig {
	ttl: 1200; // 20 minutes in seconds
	refreshBuffer: 60; // 1 minute buffer
	encryptionEnabled: true;
	autoCleanup: true;
}
```

### 3. Automatic OAuth Flow Initiation

#### 3.1 Flow Trigger Conditions
1. No token exists in cache
2. Token expired (past 20 minutes)
3. Token invalid (server rejection)
4. Refresh token expired

#### 3.2 OAuth Flow Steps
```
1. Generate PKCE parameters (code_verifier, code_challenge, state)
2. Build authorization URL with parameters
3. Return authorization URL to user
4. Wait for authorization code callback
5. Exchange code for access token using PKCE
6. Store token with 20-minute expiry
7. Return success/failure status
```

### 4. Authorization Header Format

#### 4.1 Header Structure
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

#### 4.2 Token Format Validation
- Pattern: `^Bearer\s+[A-Za-z0-9._-]+$`
- Minimum token length: 10 characters
- Maximum token length: 2048 characters

### 5. Error Handling Strategy

#### 5.1 Authentication Error Types
```typescript
enum AuthErrorType {
	TOKEN_MISSING = 'TOKEN_MISSING',
	TOKEN_EXPIRED = 'TOKEN_EXPIRED',
	TOKEN_INVALID = 'TOKEN_INVALID',
	OAUTH_FLOW_REQUIRED = 'OAUTH_FLOW_REQUIRED',
	REFRESH_FAILED = 'REFRESH_FAILED'
}
```

#### 5.2 Error Response Format
```typescript
interface AuthErrorResponse {
	error: AuthErrorType;
	message: string;
	requiresAuth: boolean;
	authUrl?: string;
	retryAfter?: number;
}
```

### 6. Integration Points

#### 6.1 Component Dependencies
```
ContentTools → AuthWrapper → TokenValidator → OAuthManager
     ↓              ↓              ↓              ↓
APIClient ← AuthMiddleware ← TokenStore ← OAuthManager
```

#### 6.2 Data Flow
```
Tool Call → Auth Check → Token Valid? → Execute Tool
    ↓           ↓            ↓             ↓
   Fail    Token Missing   Invalid    Success
    ↓           ↓            ↓             ↓
Error Response → OAuth Flow → Refresh → Tool Result
```

## Pseudocode Specifications

### Module 1: AuthenticationWrapper (auth-wrapper.ts)

```typescript
// TDD Anchor: Test token validation before tool execution
class AuthenticationWrapper {
	private tokenValidator: TokenValidator;
	private oauthManager: OAuthManager;
	
	// Wrap tool with authentication check
	public wrapTool(tool: MCPTool): MCPTool {
		// Skip auth for initiate_oauth tool
		if (tool.name === 'initiate_oauth') {
			return tool;
		}
		
		return {
			...tool,
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Step 1: Validate authentication
					const authResult = await this.validateAuthentication();
					
					if (!authResult.isValid) {
						return this.createAuthErrorResult(authResult);
					}
					
					// Step 2: Execute original tool with auth headers
					const authenticatedParams = this.addAuthHeaders(params, authResult.token);
					return await tool.handler(authenticatedParams);
					
				} catch (error) {
					return this.handleAuthError(error);
				}
			}
		};
	}
	
	// Validate current authentication state
	private async validateAuthentication(): Promise<AuthValidationResult> {
		// Check if token exists and is valid
		const token = await this.tokenValidator.getValidToken();
		
		if (!token) {
			// Attempt to refresh or initiate OAuth
			return await this.handleMissingToken();
		}
		
		return { isValid: true, token };
	}
	
	// Handle missing or expired token
	private async handleMissingToken(): Promise<AuthValidationResult> {
		// Try to refresh token first
		try {
			const refreshedToken = await this.oauthManager.refreshToken();
			if (refreshedToken) {
				return { isValid: true, token: refreshedToken.accessToken };
			}
		} catch (error) {
			// Refresh failed, need new OAuth flow
		}
		
		// Initiate new OAuth flow
		const authFlow = this.oauthManager.initiateFlow();
		return {
			isValid: false,
			requiresAuth: true,
			authUrl: authFlow.url
		};
	}
}

// TDD Anchor: Test 20-minute token expiry validation
interface AuthValidationResult {
	isValid: boolean;
	token?: string;
	requiresAuth?: boolean;
	authUrl?: string;
	error?: AuthErrorType;
}
```

### Module 2: TokenValidator (token-validator.ts)

```typescript
// TDD Anchor: Test token validation with 20-minute expiry
class TokenValidator {
	private tokenStore: TokenStore;
	private readonly TOKEN_TTL = 1200; // 20 minutes in seconds
	private readonly REFRESH_BUFFER = 60; // 1 minute buffer
	
	// Get valid token or null if expired/missing
	public async getValidToken(): Promise<string | null> {
		try {
			// Check if token exists
			const tokenData = this.tokenStore.retrieve();
			if (!tokenData) {
				return null;
			}
			
			// Check if token is within 20-minute window
			if (!this.isTokenValid(tokenData)) {
				// Clear expired token
				this.tokenStore.clear();
				return null;
			}
			
			// Check if token needs refresh (within buffer time)
			if (this.needsRefresh(tokenData)) {
				return null; // Trigger refresh
			}
			
			return tokenData.accessToken;
			
		} catch (error) {
			// Clear corrupted token data
			this.tokenStore.clear();
			return null;
		}
	}
	
	// Validate token against 20-minute expiry
	private isTokenValid(tokenData: TokenData): boolean {
		const now = new Date();
		const expiresAt = new Date(tokenData.expiresAt);
		
		// Check if token is within 20-minute window
		const tokenAge = now.getTime() - (expiresAt.getTime() - (this.TOKEN_TTL * 1000));
		return tokenAge < (this.TOKEN_TTL * 1000);
	}
	
	// Check if token needs refresh (within buffer time)
	private needsRefresh(tokenData: TokenData): boolean {
		const now = new Date();
		const expiresAt = new Date(tokenData.expiresAt);
		const bufferTime = this.REFRESH_BUFFER * 1000;
		
		return expiresAt.getTime() <= (now.getTime() + bufferTime);
	}
	
	// Validate authorization header format
	public validateAuthHeader(authHeader: string): boolean {
		const bearerPattern = /^Bearer\s+[A-Za-z0-9._-]{10,2048}$/;
		return bearerPattern.test(authHeader);
	}
}
```

### Module 3: Enhanced TokenStore (token-store-enhanced.ts)

```typescript
// TDD Anchor: Test 20-minute token caching with automatic cleanup
class EnhancedTokenStore extends TokenStore {
	private readonly TOKEN_TTL = 1200; // 20 minutes in seconds
	private cleanupTimer: NodeJS.Timeout | null = null;
	
	// Store token with 20-minute expiry
	public store(tokens: TokenData): void {
		try {
			// Calculate exact 20-minute expiry
			const expiresAt = new Date(Date.now() + (this.TOKEN_TTL * 1000));
			
			// Override expiry time to enforce 20-minute limit
			const tokenWithFixedExpiry: TokenData = {
				...tokens,
				expiresAt
			};
			
			// Store with encryption
			super.store(tokenWithFixedExpiry);
			
			// Schedule automatic cleanup
			this.scheduleCleanup();
			
		} catch (error) {
			throw new Error(`Failed to store token with 20-minute expiry: ${error.message}`);
		}
	}
	
	// Check if token is valid within 20-minute window
	public isValid(): boolean {
		try {
			const tokenData = this.retrieve();
			if (!tokenData) {
				return false;
			}
			
			// Check against 20-minute expiry
			const now = new Date();
			const expiresAt = new Date(tokenData.expiresAt);
			
			return expiresAt.getTime() > now.getTime();
			
		} catch {
			return false;
		}
	}
	
	// Schedule automatic token cleanup
	private scheduleCleanup(): void {
		// Clear existing timer
		if (this.cleanupTimer) {
			clearTimeout(this.cleanupTimer);
		}
		
		// Schedule cleanup after 20 minutes
		this.cleanupTimer = setTimeout(() => {
			this.clear();
			this.cleanupTimer = null;
		}, this.TOKEN_TTL * 1000);
	}
	
	// Clear token and cleanup timer
	public clear(): void {
		super.clear();
		
		if (this.cleanupTimer) {
			clearTimeout(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}
}
```

### Module 4: Enhanced OAuthManager (oauth-manager-enhanced.ts)

```typescript
// TDD Anchor: Test two-step OAuth process with 20-minute token caching
class EnhancedOAuthManager extends OAuthManager {
	private tokenStore: EnhancedTokenStore;
	
	// Step 1: Get authorization code (initiate flow)
	public getAuthorizationCode(): AuthorizationURL {
		try {
			// Generate PKCE parameters
			const authFlow = this.initiateFlow();
			
			// Log OAuth initiation
			console.log('OAuth authorization code flow initiated');
			
			return authFlow;
			
		} catch (error) {
			throw new Error(`Failed to get authorization code: ${error.message}`);
		}
	}
	
	// Step 2: Get access token (exchange code)
	public async getAccessToken(code: string, state: string): Promise<TokenData> {
		try {
			// Exchange code for token
			const tokenData = await this.exchangeCodeForToken(code, state);
			
			// Store with 20-minute expiry
			this.tokenStore.store(tokenData);
			
			// Log successful token exchange
			console.log('OAuth access token obtained and cached for 20 minutes');
			
			return tokenData;
			
		} catch (error) {
			throw new Error(`Failed to get access token: ${error.message}`);
		}
	}
	
	// Get valid access token with automatic refresh
	public async getValidAccessToken(): Promise<string | null> {
		try {
			// Check if current token is valid
			if (this.tokenStore.isValid()) {
				return this.tokenStore.getAccessToken();
			}
			
			// Try to refresh token
			try {
				const refreshedTokens = await this.refreshToken();
				return refreshedTokens.accessToken;
			} catch {
				// Refresh failed, return null to trigger new OAuth flow
				return null;
			}
			
		} catch {
			return null;
		}
	}
	
	// Enhanced refresh with 20-minute expiry
	public async refreshToken(refreshToken?: string): Promise<TokenData> {
		try {
			// Call parent refresh method
			const tokenData = await super.refreshToken(refreshToken);
			
			// Store with 20-minute expiry
			this.tokenStore.store(tokenData);
			
			return tokenData;
			
		} catch (error) {
			// Clear tokens on refresh failure
			this.tokenStore.clear();
			throw error;
		}
	}
}
```

### Module 5: Enhanced APIClient (api-client-enhanced.ts)

```typescript
// TDD Anchor: Test automatic auth header injection
class EnhancedAPIClient extends APIClient {
	private authWrapper: AuthenticationWrapper;
	
	// Override request method to add authentication
	public async request<T = any>(request: APIRequest): Promise<APIResponse<T>> {
		try {
			// Validate authentication and get token
			const authResult = await this.authWrapper.validateAuthentication();
			
			if (!authResult.isValid) {
				throw new Error(`Authentication required: ${authResult.error}`);
			}
			
			// Add authorization header
			const authenticatedRequest: APIRequest = {
				...request,
				headers: {
					...request.headers,
					'Authorization': `Bearer ${authResult.token}`
				}
			};
			
			// Make authenticated request
			return await super.request<T>(authenticatedRequest);
			
		} catch (error) {
			// Handle authentication errors
			if (this.isAuthError(error)) {
				throw new AuthenticationError(error.message);
			}
			throw error;
		}
	}
	
	// Check if error is authentication-related
	private isAuthError(error: any): boolean {
		if (error.status === 401 || error.status === 403) {
			return true;
		}
		
		const authErrorMessages = [
			'authentication required',
			'invalid token',
			'token expired',
			'unauthorized'
		];
		
		return authErrorMessages.some(msg => 
			error.message?.toLowerCase().includes(msg)
		);
	}
}

// Custom authentication error
class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthenticationError';
	}
}
```

## Testing Strategy

### Unit Tests
1. **Token Validation Tests**
   - Test 20-minute expiry enforcement
   - Test token refresh buffer logic
   - Test invalid token handling

2. **Authentication Wrapper Tests**
   - Test tool wrapping with auth check
   - Test OAuth flow initiation
   - Test error handling

3. **OAuth Manager Tests**
   - Test two-step OAuth process
   - Test PKCE parameter generation
   - Test token exchange

### Integration Tests
1. **End-to-End OAuth Flow**
   - Test complete authentication flow
   - Test token caching and expiry
   - Test automatic refresh

2. **Tool Authentication**
   - Test all 7 CMS tools with authentication
   - Test error responses
   - Test performance impact

### Performance Tests
1. **Authentication Latency**
   - Measure auth wrapper overhead (<50ms)
   - Test token validation performance
   - Test concurrent authentication

## Implementation Plan

### Phase 1: Core Authentication (Week 1)
1. Implement `AuthenticationWrapper`
2. Implement `TokenValidator`
3. Enhance `TokenStore` with 20-minute expiry
4. Unit tests for core components

### Phase 2: OAuth Integration (Week 2)
1. Enhance `OAuthManager` with two-step process
2. Implement automatic flow initiation
3. Integration tests for OAuth flow
4. Error handling implementation

### Phase 3: Tool Integration (Week 3)
1. Wrap all 7 CMS tools with authentication
2. Enhance `APIClient` with auth headers
3. End-to-end testing
4. Performance optimization

### Phase 4: Validation & Documentation (Week 4)
1. Security validation
2. Performance testing
3. Documentation updates
4. Deployment preparation

## Security Considerations

1. **Token Storage**: AES-256 encryption for cached tokens
2. **PKCE Implementation**: Secure code verifier generation
3. **State Validation**: CSRF protection with state parameter
4. **Token Transmission**: HTTPS-only for OAuth endpoints
5. **Error Handling**: No sensitive data in error messages

## Configuration

### Environment Variables (Optional)
```bash
# Optional encryption key (auto-generated if not provided)
TOKEN_ENCRYPTION_KEY=your-32-character-key-here

# OAuth endpoints (configured via config file)
# No hard-coded values in source code
```

### Configuration File Structure
```json
{
  "oauth": {
    "clientId": "configured-client-id",
    "authorizationUrl": "https://cms.example.com/oauth/authorize",
    "tokenUrl": "https://cms.example.com/oauth/token",
    "redirectUri": "http://localhost:3000/callback",
    "scopes": ["read", "write"]
  },
  "tokenCache": {
    "ttl": 1200,
    "refreshBuffer": 60
  }
}
```

## Success Criteria

1. ✅ All 7 CMS tools automatically validate OAuth tokens
2. ✅ Token caching enforces exactly 20-minute expiry
3. ✅ Automatic OAuth flow initiation on token expiry
4. ✅ Authorization header format: "Authorization: Bearer [token]"
5. ✅ Two-step OAuth process implemented
6. ✅ No hard-coded secrets or environment variables
7. ✅ Authentication wrapper adds <50ms latency
8. ✅ All modules remain under 500 lines
9. ✅ Comprehensive error handling with clear messages
10. ✅ Thread-safe token validation