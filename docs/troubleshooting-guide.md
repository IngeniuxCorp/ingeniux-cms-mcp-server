# Troubleshooting Guide

Common issues, solutions, and debugging techniques for the Ingeniux CMS MCP Server.

## Common Issues

### Installation and Setup Issues

#### Node.js Version Compatibility
**Problem**: Server fails to start with Node.js version errors
```bash
Error: The engine "node" is incompatible with this module
```

**Solution**:
```bash
# Check Node.js version
node --version

# Install Node.js >= 18.0.0
# Using nvm (recommended)
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

#### Dependency Installation Failures
**Problem**: npm install fails with permission or network errors
```bash
npm ERR! EACCES: permission denied
npm ERR! network timeout
```

**Solutions**:
```bash
# Permission issues
sudo chown -R $(whoami) ~/.npm
npm cache clean --force

# Network issues
npm config set registry https://registry.npmjs.org/
npm install --verbose

# Use yarn as alternative
yarn install
```

#### TypeScript Compilation Errors
**Problem**: Build fails with TypeScript errors
```bash
error TS2307: Cannot find module '@modelcontextprotocol/sdk'
```

**Solution**:
```bash
# Clean and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build

# Check TypeScript configuration
npx tsc --showConfig
```

### Configuration Issues

#### Missing Environment Variables
**Problem**: Server fails to start due to missing configuration
```bash
Error: Missing required environment variables: CMS_BASE_URL, OAUTH_CLIENT_ID
```

**Solution**:
```bash
# Check environment variables
echo $CMS_BASE_URL
echo $OAUTH_CLIENT_ID

# Copy and configure .env file
cp .env.example .env
# Edit .env with correct values

# Verify configuration
npm run config:validate
```

#### Invalid Configuration Values
**Problem**: Configuration validation fails
```bash
Configuration validation failed: cmsBaseUrl: Invalid url
```

**Solutions**:
```bash
# Check URL format
CMS_BASE_URL=https://cms.example.com/api  # Correct
CMS_BASE_URL=cms.example.com             # Incorrect - missing protocol

# Validate numeric values
API_TIMEOUT=30000     # Correct
API_TIMEOUT=30s       # Incorrect - must be number

# Check OAuth URLs
# Server auto-builds: {CMS_BASE_URL}/oauth/authorize
# Ensure CMS_BASE_URL is accessible
curl -I https://cms.example.com/api
```

#### OAuth Application Configuration
**Problem**: OAuth authentication fails with client errors
```bash
OAuth request failed: invalid_client
```

**Solution**:
```bash
# Verify OAuth application in CMS:
# 1. Client ID matches OAUTH_CLIENT_ID
# 2. Client secret matches OAUTH_CLIENT_SECRET
# 3. Redirect URI matches OAUTH_REDIRECT_URI
# 4. Application is enabled and active

# Test OAuth endpoints
curl https://cms.example.com/oauth/authorize
curl -X POST https://cms.example.com/oauth/token
```

### Authentication Issues

#### OAuth Flow Failures
**Problem**: Authentication flow fails at various stages

**Authorization URL Issues**:
```bash
Error: Failed to build authorization URL
```
**Solution**:
```bash
# Check CMS_BASE_URL accessibility
curl -v https://cms.example.com/oauth/authorize

# Verify OAuth configuration in CMS
# Ensure authorization endpoint is enabled
```

**Token Exchange Failures**:
```bash
OAuth request failed: invalid_grant
```
**Solution**:
```bash
# Common causes:
# 1. Authorization code expired (10-minute limit)
# 2. Code already used (one-time use)
# 3. Invalid redirect URI
# 4. PKCE verification failed

# Debug steps:
LOG_LEVEL=debug npm start
# Check logs for detailed OAuth flow information
```

**Token Refresh Issues**:
```bash
Token refresh failed: invalid_refresh_token
```
**Solution**:
```bash
# Refresh token may be expired or invalid
# Re-authenticate using OAuth flow
# Check token storage encryption key consistency
```

#### PKCE Implementation Issues
**Problem**: PKCE validation fails
```bash
OAuth request failed: invalid_request - code_challenge required
```

**Solution**:
```bash
# Ensure CMS supports PKCE
# Check OAuth application configuration
# Verify code_challenge_method=S256 support

# Debug PKCE generation
LOG_LEVEL=debug npm start
# Look for PKCE parameter generation in logs
```

### Network and Connectivity Issues

#### CMS API Connectivity
**Problem**: Cannot connect to CMS API
```bash
Error: ECONNREFUSED 443
Error: ENOTFOUND cms.example.com
```

**Solutions**:
```bash
# Test basic connectivity
ping cms.example.com
curl -I https://cms.example.com

# Check DNS resolution
nslookup cms.example.com
dig cms.example.com

# Test API endpoint
curl -v https://cms.example.com/api/health

# Check firewall and proxy settings
# Verify SSL certificate
openssl s_client -connect cms.example.com:443
```

#### SSL/TLS Issues
**Problem**: SSL certificate errors
```bash
Error: unable to verify the first certificate
Error: certificate has expired
```

**Solutions**:
```bash
# Check certificate validity
openssl s_client -connect cms.example.com:443 -servername cms.example.com

# For development only (not recommended for production):
NODE_TLS_REJECT_UNAUTHORIZED=0 npm start

# Proper solution: Fix SSL certificate on CMS server
```

#### Request Timeouts
**Problem**: API requests timeout
```bash
Error: timeout of 30000ms exceeded
```

**Solutions**:
```bash
# Increase timeout for slow networks
API_TIMEOUT=60000

# Check network latency
ping cms.example.com

# Test API response time
curl -w "@curl-format.txt" -o /dev/null -s https://cms.example.com/api/health

# Monitor network performance
```

### Runtime Issues

#### Memory Issues
**Problem**: High memory usage or out-of-memory errors
```bash
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Solutions**:
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" npm start

# Monitor memory usage
ps aux | grep node
top -p $(pgrep node)

# Check for memory leaks
npm install -g clinic
clinic doctor -- node dist/index.js

# Optimize cache settings
CACHE_TTL=300
CACHE_MAX_SIZE=1000
```

#### Performance Issues
**Problem**: Slow response times or high CPU usage
```bash
# Symptoms: Slow API responses, high CPU usage
```

**Solutions**:
```bash
# Enable performance monitoring
LOG_LEVEL=debug npm start

# Profile application
npm install -g clinic
clinic flame -- node dist/index.js

# Optimize configuration
RATE_LIMIT_RPM=50      # Reduce if overloaded
API_TIMEOUT=15000      # Reduce for faster failures
MAX_RETRIES=1          # Reduce retry attempts

# Use cluster mode
pm2 start ecosystem.config.js
```

#### Rate Limiting Issues
**Problem**: Rate limit exceeded errors
```bash
Rate limit exceeded. Try again in 60 seconds.
```

**Solutions**:
```bash
# Increase rate limit if legitimate traffic
RATE_LIMIT_RPM=200

# Check for abuse patterns in logs
grep "Rate limit" logs/combined.log

# Implement client-side rate limiting
# Add delays between requests in client code
```

### Tool Execution Issues

#### Tool Registration Failures
**Problem**: Tools not available or registration fails
```bash
Error: Tool 'cms_get_page' not found
```

**Solutions**:
```bash
# Check tool registration in logs
LOG_LEVEL=debug npm start
# Look for "Registered X tools" message

# Verify tool implementation
# Check for syntax errors in tool files
npm run build

# Test individual tools
npm test -- --grep "tool registration"
```

#### Tool Parameter Validation
**Problem**: Tool calls fail with validation errors
```bash
Validation error: Either pageId or path is required
```

**Solutions**:
```bash
# Check tool schema definitions
# Verify required parameters are provided
# Ensure parameter types match schema

# Debug tool parameters
LOG_LEVEL=debug npm start
# Check parameter validation in logs

# Test with minimal valid parameters
{
  "pageId": "12345"
}
```

#### Tool Execution Errors
**Problem**: Tools execute but return errors
```bash
Error occurred: Page not found
Error occurred: Authentication failed
```

**Solutions**:
```bash
# Check authentication status first
# Use auth_status tool

# Verify resource exists in CMS
# Check permissions for authenticated user

# Test with known good data
# Use cms_list_pages to find valid page IDs
```

## Debugging Techniques

### Enable Debug Logging
```bash
# Set debug log level
LOG_LEVEL=debug npm start

# Monitor logs in real-time
tail -f logs/combined.log

# Filter specific components
grep "OAuth" logs/combined.log
grep "Tool execution" logs/combined.log
```

### Network Debugging
```bash
# Monitor HTTP requests
npm install -g mitmproxy
mitmdump -s debug-script.py

# Use curl for API testing
curl -v -H "Authorization: Bearer $TOKEN" \
  https://cms.example.com/api/pages

# Check network connectivity
traceroute cms.example.com
mtr cms.example.com
```

### Application Debugging
```bash
# Use Node.js debugger
node --inspect dist/index.js

# Debug with VS Code
# Add launch configuration in .vscode/launch.json

# Memory profiling
node --inspect --heap-prof dist/index.js

# CPU profiling
node --inspect --cpu-prof dist/index.js
```

### Database/Storage Debugging
```bash
# Check token storage
# Tokens are encrypted, but can verify existence

# Clear token storage for fresh start
rm -rf .tokens/  # If file-based storage
# Or restart application to clear memory storage

# Test token encryption/decryption
npm test -- --grep "token storage"
```

## Error Analysis

### Log Analysis
```bash
# Common error patterns to look for:

# Authentication errors
grep -i "auth" logs/error.log

# Network errors
grep -i "econnrefused\|timeout\|enotfound" logs/error.log

# Validation errors
grep -i "validation" logs/error.log

# Rate limiting
grep -i "rate limit" logs/combined.log
```

### Performance Analysis
```bash
# Response time analysis
grep "Response time" logs/combined.log | awk '{print $NF}' | sort -n

# Memory usage tracking
grep "Memory usage" logs/combined.log

# Error rate calculation
total_requests=$(grep "Request" logs/combined.log | wc -l)
error_requests=$(grep "Error" logs/error.log | wc -l)
error_rate=$(echo "scale=2; $error_requests / $total_requests * 100" | bc)
echo "Error rate: $error_rate%"
```

## Recovery Procedures

### Service Recovery
```bash
# Graceful restart
pm2 restart mcp-server

# Force restart if unresponsive
pm2 kill
pm2 start ecosystem.config.js

# Clear cache and restart
rm -rf node_modules/.cache
npm start
```

### Configuration Recovery
```bash
# Reset to default configuration
cp .env.example .env
# Reconfigure with correct values

# Validate configuration
npm run config:validate

# Test with minimal configuration
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=test_client
OAUTH_CLIENT_SECRET=test_secret
```

### Data Recovery
```bash
# Clear corrupted token storage
rm -rf .tokens/

# Re-authenticate
# Use initiate_oauth tool to start fresh

# Restore from backup if available
cp backup/.env.production .env
```

## Prevention Strategies

### Monitoring Setup
```bash
# Set up health checks
curl -f http://localhost:3000/health || exit 1

# Monitor key metrics
# - Response times
# - Error rates
# - Memory usage
# - Authentication success rate
```

### Automated Testing
```bash
# Run tests regularly
npm test

# Integration testing
npm run test:integration

# Performance testing
npm run test:performance
```

### Maintenance Tasks
```bash
# Weekly maintenance
npm audit
npm update
npm test

# Monthly maintenance
# Review logs for patterns
# Update dependencies
# Security audit
```

## Getting Help

### Information to Collect
When reporting issues, include:
1. **Environment**: Node.js version, OS, deployment method
2. **Configuration**: Sanitized environment variables
3. **Logs**: Relevant log entries with timestamps
4. **Steps**: Exact steps to reproduce the issue
5. **Expected vs Actual**: What should happen vs what happens

### Log Collection
```bash
# Collect relevant logs
tar -czf debug-logs.tar.gz logs/ .env.example

# Sanitize sensitive information
sed 's/CLIENT_SECRET=.*/CLIENT_SECRET=[REDACTED]/' .env > .env.sanitized
```

### Support Channels
1. **Documentation**: Check all documentation files
2. **Issues**: Search existing GitHub issues
3. **Logs**: Enable debug logging for detailed information
4. **Community**: Developer forums and communities
5. **Professional**: Commercial support if available