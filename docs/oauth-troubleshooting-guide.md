# OAuth Troubleshooting Guide

Comprehensive troubleshooting guide for OAuth authentication issues and solutions.

## Quick Diagnostics

### Health Check Commands
```bash
# Check server health and authentication status
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "health_check", "arguments": {}}}'

# Check authentication status
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "auth_status", "arguments": {}}}'
```

### Debug Logging
Enable detailed OAuth logging:
```bash
LOG_LEVEL=debug npm start
```

## Common Authentication Issues

### 1. Authentication Required Errors

#### Symptom
```json
{
  "error": "Authentication required",
  "requiresAuth": true,
  "authUrl": "https://cms.example.com/oauth/authorize?...",
  "message": "Please complete OAuth authentication to use this tool"
}
```

#### Causes and Solutions

**No Token Available**
- **Cause**: User never authenticated or tokens expired
- **Solution**: Use [`initiate_oauth`](api-reference.md:37) tool to start authentication

**Token Expired**
- **Cause**: 20-minute token cache expired
- **Solution**: Automatic refresh should occur; if not, re-authenticate

**Token Refresh Failed**
- **Cause**: Refresh token expired or invalid
- **Solution**: Clear tokens and start new OAuth flow

#### Resolution Steps
1. **Check authentication status**:
   ```bash
   # Use auth_status tool
   {"tool": "auth_status", "parameters": {}}
   ```

2. **Initiate new OAuth flow**:
   ```bash
   # Use initiate_oauth tool
   {"tool": "initiate_oauth", "parameters": {}}
   ```

3. **Complete authentication**:
   - Visit provided authorization URL
   - Log in to CMS
   - Grant permissions

### 2. OAuth Flow Failures

#### Invalid Client Errors

**Symptom**:
```json
{
  "error": "OAuth request failed: invalid_client"
}
```

**Causes**:
- Incorrect `OAUTH_CLIENT_ID`
- Incorrect `OAUTH_CLIENT_SECRET`
- OAuth application disabled in CMS

**Solutions**:
1. **Verify client credentials**:
   ```bash
   echo "Client ID: $OAUTH_CLIENT_ID"
   echo "Secret set: $([ -n "$OAUTH_CLIENT_SECRET" ] && echo "Yes" || echo "No")"
   ```

2. **Check CMS OAuth application**:
   - Verify application is active
   - Confirm client ID matches
   - Regenerate client secret if needed

3. **Test connectivity**:
   ```bash
   curl -f "$CMS_BASE_URL/oauth/authorize" || echo "OAuth endpoint not accessible"
   ```

#### Redirect URI Mismatch

**Symptom**:
```json
{
  "error": "OAuth request failed: invalid_redirect_uri"
}
```

**Causes**:
- `OAUTH_REDIRECT_URI` doesn't match CMS configuration
- Protocol mismatch (HTTP vs HTTPS)
- Port number mismatch

**Solutions**:
1. **Verify redirect URI**:
   ```bash
   echo "Configured URI: $OAUTH_REDIRECT_URI"
   ```

2. **Update CMS application**:
   - Add correct redirect URI to OAuth application
   - Ensure exact match including protocol and port

3. **Common redirect URIs**:
   ```bash
   # Development
   OAUTH_REDIRECT_URI=http://localhost:3000/callback
   
   # Production
   OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
   ```

#### State Parameter Errors

**Symptom**:
```json
{
  "error": "Invalid or expired state parameter"
}
```

**Causes**:
- OAuth flow timeout (state expired)
- Multiple concurrent OAuth flows
- Browser session issues

**Solutions**:
1. **Start fresh OAuth flow**:
   - Use [`initiate_oauth`](api-reference.md:37) again
   - Complete flow within 10 minutes

2. **Clear browser state**:
   - Clear cookies and session storage
   - Use incognito/private browsing

3. **Check for concurrent flows**:
   - Only one OAuth flow at a time
   - Wait for completion before starting new flow

### 3. Token Management Issues

#### Token Decryption Failures

**Symptom**:
```bash
[ERROR] Failed to decrypt token data
```

**Causes**:
- `TOKEN_ENCRYPTION_KEY` changed
- Corrupted token storage
- Encryption key format issues

**Solutions**:
1. **Clear token cache**:
   ```bash
   # Restart server to clear in-memory tokens
   npm restart
   ```

2. **Verify encryption key**:
   ```bash
   echo "Key length: ${#TOKEN_ENCRYPTION_KEY}"
   # Should be 32 characters
   ```

3. **Generate new encryption key**:
   ```bash
   TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 16)
   ```

#### Automatic Refresh Failures

**Symptom**:
```bash
[WARN] Token refresh failed, initiating new OAuth flow
```

**Causes**:
- Refresh token expired
- CMS OAuth configuration changed
- Network connectivity issues

**Solutions**:
1. **Check refresh token validity**:
   - Refresh tokens typically valid for 30 days
   - May expire sooner based on CMS configuration

2. **Monitor refresh patterns**:
   ```bash
   # Enable debug logging to see refresh attempts
   LOG_LEVEL=debug npm start
   ```

3. **Manual re-authentication**:
   - Use [`initiate_oauth`](api-reference.md:37) if automatic refresh fails
   - Complete new OAuth flow

### 4. Network and Connectivity Issues

#### CMS Unreachable

**Symptom**:
```json
{
  "error": "Network error: Unable to connect to server"
}
```

**Causes**:
- CMS server down or unreachable
- Firewall blocking outbound connections
- DNS resolution issues
- SSL certificate problems

**Solutions**:
1. **Test CMS connectivity**:
   ```bash
   curl -f "$CMS_BASE_URL/health" || echo "CMS not accessible"
   ping cms.example.com
   ```

2. **Check firewall rules**:
   ```bash
   # Test HTTPS connectivity
   telnet cms.example.com 443
   ```

3. **Verify SSL certificates**:
   ```bash
   openssl s_client -connect cms.example.com:443 -servername cms.example.com
   ```

4. **DNS resolution**:
   ```bash
   nslookup cms.example.com
   dig cms.example.com
   ```

#### Timeout Issues

**Symptom**:
```json
{
  "error": "Request timeout"
}
```

**Causes**:
- Slow network connection
- CMS server overloaded
- Timeout configuration too low

**Solutions**:
1. **Increase timeout**:
   ```bash
   API_TIMEOUT=60000  # 60 seconds
   ```

2. **Check network latency**:
   ```bash
   ping -c 5 cms.example.com
   traceroute cms.example.com
   ```

3. **Monitor CMS performance**:
   - Check CMS server resources
   - Review CMS logs for errors

### 5. Permission and Scope Issues

#### Insufficient Permissions

**Symptom**:
```json
{
  "error": "HTTP 403: Forbidden"
}
```

**Causes**:
- User lacks required CMS permissions
- OAuth scopes insufficient
- CMS role restrictions

**Solutions**:
1. **Verify user permissions**:
   - Check user roles in CMS
   - Ensure read/write permissions as needed

2. **Review OAuth scopes**:
   ```typescript
   // Default scopes: ['read', 'write']
   // Verify scopes match required permissions
   ```

3. **Check CMS configuration**:
   - Verify API access enabled
   - Check role-based restrictions

#### Scope Mismatch

**Symptom**:
```json
{
  "error": "insufficient_scope"
}
```

**Causes**:
- Requested operation requires additional scopes
- OAuth application scope restrictions

**Solutions**:
1. **Update OAuth application scopes**:
   - Add required scopes in CMS OAuth application
   - Common scopes: `read`, `write`, `admin`

2. **Re-authenticate with new scopes**:
   - Use [`initiate_oauth`](api-reference.md:37) after scope changes
   - Complete new OAuth flow

## Performance Issues

### Slow Authentication

#### Symptoms
- Authentication takes >5 seconds
- Frequent timeout errors
- High CPU usage during auth

#### Causes and Solutions

**Network Latency**:
- **Cause**: Slow connection to CMS
- **Solution**: Optimize network path, use CDN

**Token Validation Overhead**:
- **Cause**: Frequent token validation
- **Solution**: Monitor authentication frequency

**Encryption Performance**:
- **Cause**: Slow token encryption/decryption
- **Solution**: Verify encryption key format

### Memory Issues

#### High Memory Usage

**Symptoms**:
- Increasing memory consumption
- Out of memory errors
- Slow garbage collection

**Causes**:
- Token cache not cleaning up
- Memory leaks in OAuth flows
- Large token storage

**Solutions**:
1. **Monitor token cache**:
   ```bash
   # Check for automatic cleanup
   LOG_LEVEL=debug npm start
   ```

2. **Restart server periodically**:
   ```bash
   # Clear in-memory caches
   npm restart
   ```

3. **Review token storage**:
   - Verify automatic cleanup working
   - Check for orphaned tokens

## Debugging Tools

### Debug Logging

Enable comprehensive OAuth debugging:
```bash
# Maximum debug output
LOG_LEVEL=debug npm start

# OAuth-specific debugging
DEBUG=oauth:* npm start
```

### Token Inspection

Check current token status:
```bash
# Use auth_status tool for token information
{
  "tool": "auth_status",
  "parameters": {}
}
```

### Network Debugging

Test OAuth endpoints directly:
```bash
# Test authorization endpoint
curl -v "$CMS_BASE_URL/oauth/authorize"

# Test token endpoint
curl -v -X POST "$CMS_BASE_URL/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### Configuration Validation

Verify environment configuration:
```bash
# Check required variables
env | grep -E "(OAUTH|CMS)_"

# Validate URLs
node -e "console.log(new URL(process.env.CMS_BASE_URL))"
```

## Recovery Procedures

### Complete Authentication Reset

When all else fails, perform a complete reset:

1. **Stop server**:
   ```bash
   npm stop
   ```

2. **Clear all tokens**:
   ```bash
   # Tokens are in-memory, cleared on restart
   ```

3. **Verify configuration**:
   ```bash
   # Check all OAuth environment variables
   env | grep OAUTH
   ```

4. **Restart with debug logging**:
   ```bash
   LOG_LEVEL=debug npm start
   ```

5. **Start fresh OAuth flow**:
   ```bash
   # Use initiate_oauth tool
   {"tool": "initiate_oauth", "parameters": {}}
   ```

### Emergency Access

If OAuth is completely broken, use these steps:

1. **Check CMS direct access**:
   ```bash
   curl -f "$CMS_BASE_URL/health"
   ```

2. **Verify OAuth application**:
   - Log into CMS admin
   - Check OAuth application status
   - Regenerate credentials if needed

3. **Test with minimal configuration**:
   ```bash
   # Use only required variables
   unset TOKEN_ENCRYPTION_KEY
   npm start
   ```

## Prevention Strategies

### Monitoring

Set up monitoring for OAuth health:
- **Token refresh rates**: Monitor automatic refresh frequency
- **Authentication failures**: Alert on repeated failures
- **Network connectivity**: Monitor CMS accessibility
- **Performance metrics**: Track authentication latency

### Maintenance

Regular maintenance tasks:
- **Credential rotation**: Update OAuth secrets quarterly
- **Configuration review**: Verify environment variables
- **Log analysis**: Review authentication patterns
- **Performance testing**: Validate OAuth flow performance

### Documentation

Maintain operational documentation:
- **Environment configurations**: Document all environments
- **Troubleshooting runbooks**: Step-by-step procedures
- **Contact information**: CMS admin contacts
- **Escalation procedures**: When to involve CMS team

For additional help, see [OAuth User Guide](oauth-user-guide.md) and [OAuth Configuration Guide](oauth-configuration-guide.md).