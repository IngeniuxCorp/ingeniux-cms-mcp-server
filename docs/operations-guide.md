# Operations Guide

Deployment, monitoring, and maintenance guide for the Ingeniux CMS MCP Server.

## Deployment

### Production Deployment

#### Prerequisites
- Node.js >= 18.0.0 installed
- Process manager (PM2, systemd, or Docker)
- Reverse proxy (nginx, Apache) for HTTPS
- Monitoring tools (optional but recommended)

#### Deployment Steps
```bash
# 1. Clone and build
git clone <repository-url>
cd ingeniux-cms-mcp-server
npm install
npm run build

# 2. Configure environment
cp .env.example .env.production
# Edit .env.production with production values

# 3. Test configuration
NODE_ENV=production npm test

# 4. Deploy with process manager
pm2 start ecosystem.config.js --env production
```

#### Environment Configuration
```bash
# Production .env.production
NODE_ENV=production
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_REDIRECT_URI=https://mcp-server.example.com/callback
LOG_LEVEL=warn
API_TIMEOUT=30000
RATE_LIMIT_RPM=500
PORT=3000
HOST=0.0.0.0
```

### Docker Deployment

#### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcp -u 1001
USER mcp

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CMS_BASE_URL=${CMS_BASE_URL}
      - OAUTH_CLIENT_ID=${OAUTH_CLIENT_ID}
      - OAUTH_CLIENT_SECRET=${OAUTH_CLIENT_SECRET}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Process Management

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ingeniux-cms-mcp-server',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'warn'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
```

#### Systemd Service
```ini
# /etc/systemd/system/mcp-server.service
[Unit]
Description=Ingeniux CMS MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-server/.env.production

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Health Checks

#### Built-in Health Endpoint
```bash
# Basic health check
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "timestamp": "2025-01-06T12:00:00Z",
  "version": "1.0.0",
  "uptime": 3600
}
```

#### Advanced Health Monitoring
```typescript
// Custom health check implementation
class HealthMonitor {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCMSConnectivity(),
      this.checkMemoryUsage(),
      this.checkDiskSpace()
    ]);
    
    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      checks: this.formatChecks(checks),
      timestamp: new Date().toISOString()
    };
  }
}
```

### Logging and Observability

#### Structured Logging
```typescript
// Production logging configuration
const logger = winston.createLogger({
  level: 'warn',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

#### Log Aggregation
```yaml
# Fluentd configuration for log aggregation
<source>
  @type tail
  path /app/logs/*.log
  pos_file /var/log/fluentd/mcp-server.log.pos
  tag mcp-server
  format json
</source>

<match mcp-server>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name mcp-server-logs
</match>
```

### Metrics Collection

#### Application Metrics
```typescript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const authenticationAttempts = new promClient.Counter({
  name: 'authentication_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['result']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active MCP connections'
});
```

#### System Metrics
```bash
# Key metrics to monitor
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Process count
- File descriptor usage
```

### Alerting

#### Alert Rules
```yaml
# Prometheus alert rules
groups:
- name: mcp-server
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: High error rate detected
      
  - alert: AuthenticationFailures
    expr: rate(authentication_attempts_total{result="failure"}[5m]) > 0.2
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: High authentication failure rate
      
  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes > 1073741824  # 1GB
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: High memory usage detected
```

#### Notification Channels
```yaml
# Alertmanager configuration
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://slack-webhook-url'
    send_resolved: true
```

## Performance Tuning

### Node.js Optimization

#### Memory Management
```bash
# Node.js memory settings
NODE_OPTIONS="--max-old-space-size=2048 --max-semi-space-size=128"
```

#### Cluster Mode
```javascript
// Cluster configuration for PM2
{
  instances: 'max',  // Use all CPU cores
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  node_args: '--max-old-space-size=1024'
}
```

### Application Tuning

#### Cache Optimization
```bash
# Optimal cache settings
CACHE_TTL=300          # 5 minutes for most content
CACHE_MAX_SIZE=2000    # Increase for high-traffic sites
```

#### Rate Limiting Tuning
```bash
# Adjust based on usage patterns
RATE_LIMIT_RPM=1000    # Higher limit for production
API_TIMEOUT=45000      # Longer timeout for complex operations
MAX_RETRIES=5          # More retries for reliability
```

### Database Optimization

#### Connection Pooling
```typescript
// Optimize database connections
const poolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100
};
```

## Backup and Recovery

### Data Backup

#### Configuration Backup
```bash
#!/bin/bash
# backup-config.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mcp-server"

# Backup environment configuration
cp .env.production "$BACKUP_DIR/env_$DATE.backup"

# Backup application configuration
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" config/

# Backup logs
tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" logs/
```

#### Token Store Backup
```typescript
// Secure token backup
class TokenBackup {
  async backupTokens(): Promise<void> {
    const tokens = tokenStore.getAllTokens();
    const encrypted = await this.encryptBackup(tokens);
    await this.storeSecurely(encrypted);
  }
  
  async restoreTokens(backupData: string): Promise<void> {
    const decrypted = await this.decryptBackup(backupData);
    await tokenStore.restoreTokens(decrypted);
  }
}
```

### Disaster Recovery

#### Recovery Procedures
1. **Service Restoration**: Restart from backup configuration
2. **Data Recovery**: Restore from encrypted backups
3. **Token Refresh**: Re-authenticate if tokens corrupted
4. **Health Verification**: Confirm all systems operational

#### Recovery Testing
```bash
# Monthly recovery test
./scripts/test-recovery.sh
```

## Maintenance

### Regular Maintenance Tasks

#### Daily Tasks
- Monitor system health and alerts
- Check log files for errors
- Verify authentication success rates
- Monitor resource usage

#### Weekly Tasks
- Review security logs
- Update dependencies (security patches)
- Backup configuration and data
- Performance analysis

#### Monthly Tasks
- Security audit and review
- Capacity planning review
- Disaster recovery testing
- Documentation updates

### Update Procedures

#### Security Updates
```bash
# Security update process
npm audit
npm audit fix
npm test
npm run build
pm2 restart mcp-server
```

#### Application Updates
```bash
# Application update process
git pull origin main
npm install
npm test
npm run build
pm2 reload mcp-server --update-env
```

### Troubleshooting

#### Common Issues

**High Memory Usage**
```bash
# Check memory usage
ps aux | grep node
# Restart if necessary
pm2 restart mcp-server
```

**Authentication Failures**
```bash
# Check OAuth configuration
curl -v https://cms.example.com/oauth/authorize
# Verify client credentials
```

**Network Connectivity**
```bash
# Test CMS connectivity
curl -v https://cms.example.com/api/health
# Check DNS resolution
nslookup cms.example.com
```

#### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug pm2 restart mcp-server
# Monitor logs
pm2 logs mcp-server --lines 100
```

### Scaling Considerations

#### Horizontal Scaling
- Load balancer configuration
- Session affinity requirements
- Shared token storage (Redis)
- Database connection pooling

#### Vertical Scaling
- Memory allocation tuning
- CPU core utilization
- I/O optimization
- Cache size adjustment

## Security Operations

### Security Monitoring
- Failed authentication attempts
- Unusual request patterns
- Rate limit violations
- Error rate spikes

### Incident Response
1. **Detection**: Automated alerts and monitoring
2. **Analysis**: Log analysis and threat assessment
3. **Containment**: Isolate affected systems
4. **Recovery**: Restore normal operations
5. **Post-Incident**: Review and improve

### Compliance Auditing
- Regular security assessments
- Access control reviews
- Data handling audits
- Compliance reporting