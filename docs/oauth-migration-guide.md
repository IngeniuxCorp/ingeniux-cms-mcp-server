# OAuth Migration Guide

Migration guide for upgrading to OAuth-enabled CMS MCP Server from previous versions.

## Overview

The OAuth integration introduces automatic authentication for all CMS tools with 20-minute token caching. This guide helps you migrate from manual authentication to the new OAuth system.

## Breaking Changes

### Authentication Requirements
- **All CMS tools now require OAuth authentication**
- **Manual authorization headers no longer supported**
- **Token management is now automatic**
- **New OAuth configuration required**

### Tool Behavior Changes
- **Authentication wrapper**: All CMS tools wrapped with automatic auth
- **Error responses**: New authentication error format
- **Flow initiation**: Automatic OAuth flow when tokens missing
- **Token refresh**: Automatic 20-minute token refresh

### Configuration Changes
- **New environment variables**: OAuth credentials required
- **Removed manual auth**: No more manual Bearer tokens
- **Automatic URLs**: OAuth URLs built from CMS_BASE_URL
- **Security enhancement**: Token encryption enabled by default

## Migration Steps

### 1. Update Environment Configuration

#### Add OAuth Variables
```bash
# Add to your .env file
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional security enhancement
TOKEN_ENCRYPTION_KEY=your_32_character_key_here
```

#### Remove Deprecated Variables
```bash
# Remove these if present (no longer used)
# MANUAL_AUTH_TOKEN=...
# BEARER_TOKEN=...
# API_KEY=...
```

### 2. Create OAuth Application in CMS

#### Application Setup
1. **Access CMS Admin**: Log into your Ingeniux CMS admin panel
2. **Create OAuth App**: Navigate to OAuth applications
3. **Configure Application**:
   - **Name**: `MCP Server Integration`
   - **Type**: `Confidential Client`
   - **Grant Types**: `Authorization Code`, `Refresh Token`
   - **Scopes**: `read`, `write`
   - **PKCE**: `Required`

#### Redirect URI Configuration
```bash
# Development
http://localhost:3000/callback

# Production
https://your-mcp-server.example.com/callback
```

### 3. Update Client Code

#### Remove Manual Authentication
**Before (v1.0)**:
```typescript
// Manual authorization headers (deprecated)
const response = await apiClient.get('/pages', {}, {
	'Authorization': 'Bearer your_manual_token'
});
```

**After (v2.0)**:
```typescript
// Automatic authentication (new)
const response = await apiClient.get('/pages');
// Authorization headers added automatically
```

#### Update Error Handling
**Before (v1.0)**:
```typescript
// Simple error handling
try {
	const result = await tool.execute(params);
} catch (error) {
	console.error('Tool failed:', error.message);
}
```

**After (v2.0)**:
```typescript
// OAuth-aware error handling
try {
	const result = await tool.execute(params);
} catch (error) {
	if (error.requiresAuth) {
		// Handle authentication requirement
		const authUrl = error.authUrl;
		console.log('Please authenticate:', authUrl);
	} else {
		console.error('Tool failed:', error.message);
	}
}
```

#### Update Tool Usage
**Before (v1.0)**:
```typescript
// Manual authentication check
if (!isAuthenticated()) {
	throw new Error('Authentication required');
}
const pages = await cmsGetPage({ pageId: '123' });
```

**After (v2.0)**:
```typescript
// Automatic authentication
const pages = await cmsGetPage({ pageId: '123' });
// Authentication handled automatically
```

### 4. Test Migration

#### Verify Configuration
```bash
# Check environment variables
env | grep -E "(OAUTH|CMS)_"

# Test server startup
npm start
```

#### Test Authentication Flow
1. **Start server**: `npm start`
2. **Check health**: Use [`health_check`](api-reference.md:7) tool
3. **Initiate OAuth**: Use [`initiate_oauth`](api-reference.md:37) tool
4. **Complete authentication**: Visit authorization URL
5. **Test CMS tools**: Verify automatic authentication

#### Validate Tool Functionality
```bash
# Test each CMS tool
{"tool": "cms_list_pages", "parameters": {"limit": 5}}
{"tool": "cms_get_page", "parameters": {"pageId": "test-page"}}
{"tool": "cms_search_content", "parameters": {"query": "test"}}
```

## Compatibility Matrix

### Version Compatibility
| Feature | v1.0 (Manual Auth) | v2.0 (OAuth) | Migration Required |
|---------|-------------------|--------------|-------------------|
| Manual Bearer tokens | ✅ | ❌ | Yes - Remove manual headers |
| OAuth authentication | ❌ | ✅ | Yes - Add OAuth config |
| Tool interfaces | ✅ | ✅ | No - Same parameters |
| Error handling | Basic | Enhanced | Recommended - Update error handling |
| Token management | Manual | Automatic | Yes - Remove manual token code |

### Environment Compatibility
| Environment | v1.0 Config | v2.0 Config | Migration Steps |
|-------------|-------------|-------------|-----------------|
| Development | Manual tokens | OAuth app | Create dev OAuth app |
| Staging | Manual tokens | OAuth app | Create staging OAuth app |
| Production | Manual tokens | OAuth app | Create prod OAuth app |

## Common Migration Issues

### 1. Missing OAuth Configuration

#### Symptom
```bash
Error: Missing required environment variables: OAUTH_CLIENT_ID
```

#### Solution
1. **Create OAuth application** in CMS
2. **Add environment variables**:
   ```bash
   OAUTH_CLIENT_ID=your_client_id
   OAUTH_CLIENT_SECRET=your_client_secret
   OAUTH_REDIRECT_URI=http://localhost:3000/callback
   ```
3. **Restart server**

### 2. Authentication Loops

#### Symptom
- Repeated authentication requests
- Tools always return "Authentication required"

#### Causes
- OAuth application misconfigured
- Redirect URI mismatch
- Client credentials incorrect

#### Solutions
1. **Verify OAuth application**:
   - Check client ID and secret
   - Verify redirect URI matches
   - Ensure application is active

2. **Test OAuth flow**:
   ```bash
   # Use initiate_oauth tool
   {"tool": "initiate_oauth", "parameters": {}}
   ```

3. **Check logs**:
   ```bash
   LOG_LEVEL=debug npm start
   ```

### 3. Permission Issues

#### Symptom
```json
{
  "error": "HTTP 403: Forbidden"
}
```

#### Causes
- OAuth scopes insufficient
- User permissions changed
- CMS role restrictions

#### Solutions
1. **Update OAuth scopes**:
   - Add `read` and `write` scopes
   - Include additional scopes if needed

2. **Verify user permissions**:
   - Check CMS user roles
   - Ensure API access enabled

3. **Test with admin user**:
   - Use CMS admin account for testing
   - Verify OAuth flow works

### 4. Network Configuration

#### Symptom
```json
{
  "error": "Network error: Unable to connect to server"
}
```

#### Causes
- Firewall blocking OAuth endpoints
- DNS resolution issues
- SSL certificate problems

#### Solutions
1. **Test CMS connectivity**:
   ```bash
   curl -f "$CMS_BASE_URL/oauth/authorize"
   ```

2. **Check firewall rules**:
   - Allow outbound HTTPS to CMS
   - Verify OAuth endpoints accessible

3. **Update network configuration**:
   - Add OAuth endpoints to allowlist
   - Configure proxy if needed

## Rollback Procedures

### Emergency Rollback

If OAuth migration fails, you can temporarily rollback:

1. **Stop OAuth-enabled server**:
   ```bash
   npm stop
   ```

2. **Revert to previous version**:
   ```bash
   git checkout v1.0
   npm install
   ```

3. **Restore manual authentication**:
   ```bash
   # Add manual auth token
   MANUAL_AUTH_TOKEN=your_backup_token
   ```

4. **Start previous version**:
   ```bash
   npm start
   ```

### Gradual Migration

For production environments, consider gradual migration:

1. **Phase 1**: Deploy OAuth alongside manual auth
2. **Phase 2**: Test OAuth with subset of tools
3. **Phase 3**: Migrate all tools to OAuth
4. **Phase 4**: Remove manual auth support

## Post-Migration Validation

### Functional Testing
- **All CMS tools work** with automatic authentication
- **Error handling** provides clear OAuth guidance
- **Token refresh** works automatically
- **Performance** meets requirements (<50ms auth overhead)

### Security Validation
- **OAuth flow** completes successfully
- **Token encryption** working properly
- **PKCE implementation** secure
- **No hardcoded secrets** in configuration

### Performance Testing
- **Authentication latency** under 50ms
- **Token cache** working efficiently
- **Memory usage** stable
- **Network requests** optimized

## Best Practices Post-Migration

### Operational
1. **Monitor OAuth health** with [`health_check`](api-reference.md:7)
2. **Set up alerting** for authentication failures
3. **Regular credential rotation** (quarterly)
4. **Document OAuth applications** for each environment

### Development
1. **Use separate OAuth apps** per environment
2. **Test OAuth flows** in CI/CD pipelines
3. **Handle authentication errors** gracefully
4. **Monitor token refresh patterns**

### Security
1. **Use HTTPS** in production
2. **Secure credential storage** in environment variables
3. **Regular security audits** of OAuth configuration
4. **Monitor OAuth usage** for anomalies

## Support and Resources

### Migration Support
- **Documentation**: [OAuth User Guide](oauth-user-guide.md)
- **Configuration**: [OAuth Configuration Guide](oauth-configuration-guide.md)
- **Troubleshooting**: [OAuth Troubleshooting Guide](oauth-troubleshooting-guide.md)
- **Development**: [OAuth Developer Guide](oauth-developer-guide.md)

### Getting Help
1. **Check logs** with debug logging enabled
2. **Review documentation** for specific issues
3. **Test configuration** with provided tools
4. **Contact support** with detailed error information

### Migration Checklist
- [ ] OAuth application created in CMS
- [ ] Environment variables configured
- [ ] Manual authentication code removed
- [ ] Error handling updated
- [ ] OAuth flow tested successfully
- [ ] All CMS tools working
- [ ] Performance validated
- [ ] Security verified
- [ ] Documentation updated
- [ ] Team trained on new authentication

For detailed implementation guidance, see [OAuth Developer Guide](oauth-developer-guide.md).