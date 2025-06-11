# Installation Guide

Complete installation and setup guide for the Ingeniux CMS MCP Server.

## Prerequisites

### System Requirements
- **Node.js**: >= 18.0.0
- **TypeScript**: >= 5.0.0
- **Operating System**: Windows, macOS, or Linux
- **Memory**: Minimum 512MB RAM
- **Storage**: 100MB free space

### Ingeniux CMS Requirements
- Ingeniux CMS WebAPI v10.6.378 or compatible
- OAuth 2.0 application configured in CMS
- Network access to CMS instance
- Valid SSL certificate (recommended)

## Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd ingeniux-cms-mcp-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```bash
# Required Configuration
CMS_BASE_URL=https://your-cms-instance.com/api
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional Configuration
API_TIMEOUT=30000
MAX_RETRIES=3
LOG_LEVEL=info
CACHE_TTL=300
RATE_LIMIT_RPM=100
PORT=3000
HOST=localhost
```

### 4. Build Application
```bash
npm run build
```

### 5. Verify Installation
```bash
npm test
```

## OAuth Application Setup

### In Ingeniux CMS Admin
1. Navigate to **System** > **OAuth Applications**
2. Click **Create New Application**
3. Configure application settings:
   - **Name**: `MCP Server`
   - **Client Type**: `Confidential`
   - **Redirect URI**: `http://localhost:3000/callback`
   - **Scopes**: `read`, `write`
4. Save and note the **Client ID** and **Client Secret**

### Security Considerations
- Store client credentials securely
- Use HTTPS in production
- Implement proper redirect URI validation
- Regularly rotate client secrets

## Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `CMS_BASE_URL` | Base URL for CMS instance | `https://cms.example.com/api` |
| `OAUTH_CLIENT_ID` | OAuth application client ID | `abc123def456` |
| `OAUTH_CLIENT_SECRET` | OAuth application secret | `secret_key_here` |
| `OAUTH_REDIRECT_URI` | OAuth callback URL | `http://localhost:3000/callback` |

### Optional Variables
| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `API_TIMEOUT` | Request timeout (ms) | `30000` | 1000-120000 |
| `MAX_RETRIES` | Maximum retry attempts | `3` | 0-10 |
| `LOG_LEVEL` | Logging level | `info` | error, warn, info, debug |
| `CACHE_TTL` | Cache TTL (seconds) | `300` | 0-3600 |
| `RATE_LIMIT_RPM` | Requests per minute | `100` | 1-1000 |
| `PORT` | Server port | `3000` | 1-65535 |
| `HOST` | Server host | `localhost` | Valid hostname |

## Validation

### Configuration Validation
The server validates configuration on startup:
```bash
npm start
```

Expected output:
```
[INFO] Configuration loaded successfully
[INFO] OAuth manager initialized
[INFO] API client initialized
[INFO] MCP server started successfully
```

### Test OAuth Flow
1. Start the server: `npm start`
2. Trigger OAuth flow using MCP client
3. Complete authentication in browser
4. Verify successful token exchange

## Troubleshooting

### Common Issues

#### Configuration Errors
**Error**: `Missing required environment variables`
**Solution**: Verify all required variables are set in `.env`

**Error**: `Configuration validation failed`
**Solution**: Check variable formats and ranges

#### OAuth Errors
**Error**: `OAuth request failed: invalid_client`
**Solution**: Verify client ID and secret are correct

**Error**: `OAuth request failed: invalid_redirect_uri`
**Solution**: Ensure redirect URI matches CMS configuration

#### Network Errors
**Error**: `ECONNREFUSED`
**Solution**: Verify CMS URL and network connectivity

**Error**: `SSL certificate error`
**Solution**: Check SSL configuration or disable SSL verification (development only)

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Health Check
Test server health:
```bash
curl http://localhost:3000/health
```

## Production Deployment

### Environment Setup
- Use HTTPS for all URLs
- Set secure environment variables
- Configure proper logging
- Enable monitoring

### Security Checklist
- [ ] HTTPS enabled
- [ ] Client secrets secured
- [ ] Redirect URIs validated
- [ ] Rate limiting configured
- [ ] Logging sanitized
- [ ] Error handling secure

### Performance Tuning
- Adjust `API_TIMEOUT` based on network latency
- Configure `CACHE_TTL` for optimal performance
- Set `RATE_LIMIT_RPM` based on usage patterns
- Monitor memory usage and adjust accordingly

## Next Steps

After successful installation:
1. Review [Configuration Guide](configuration-guide.md)
2. Read [Usage Examples](usage-examples.md)
3. Check [API Reference](api-reference.md)
4. Set up [Monitoring](operations-guide.md#monitoring)