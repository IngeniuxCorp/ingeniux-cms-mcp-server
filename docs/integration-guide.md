# Integration Guide

Complete guide for integrating the Ingeniux CMS MCP Server with various MCP clients and applications.

## MCP Client Integration

### Claude Desktop Integration

#### Configuration
Add the server to Claude Desktop's MCP configuration:

```json
{
  "mcpServers": {
    "ingeniux-cms": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/ingeniux-cms-mcp-server",
      "env": {
        "CMS_BASE_URL": "https://cms.example.com/api",
        "OAUTH_CLIENT_ID": "your_client_id",
        "OAUTH_CLIENT_SECRET": "your_client_secret",
        "OAUTH_REDIRECT_URI": "http://localhost:3000/callback",
        "LOG_LEVEL": "warn"
      }
    }
  }
}
```

#### Usage in Claude Desktop
```
User: "Get the content of the homepage from the CMS"

Claude: I'll retrieve the homepage content for you.
[Uses cms_get_page tool with path="/"]

User: "Create a new product page for Widget X"

Claude: I'll create a new product page for Widget X.
[Uses cms_create_page tool with appropriate parameters]
```

### Custom MCP Client Integration

#### Basic Client Setup
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class CMSIntegrationClient {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      name: "cms-integration-client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });
  }
  
  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: "node",
      args: ["dist/index.js"],
      cwd: "/path/to/ingeniux-cms-mcp-server",
      env: {
        CMS_BASE_URL: process.env.CMS_BASE_URL,
        OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID,
        OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET,
        OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI
      }
    });
    
    await this.client.connect(transport);
  }
  
  async listTools(): Promise<any> {
    return await this.client.request({
      method: "tools/list",
      params: {}
    });
  }
  
  async callTool(name: string, arguments_: any): Promise<any> {
    return await this.client.request({
      method: "tools/call",
      params: {
        name,
        arguments: arguments_
      }
    });
  }
}
```

#### Client Usage Examples
```typescript
// Initialize client
const cmsClient = new CMSIntegrationClient();
await cmsClient.connect();

// Authenticate
const authResult = await cmsClient.callTool("initiate_oauth", {});
console.log("Visit:", authResult.content[0].text);

// Wait for user authentication, then use tools
const pages = await cmsClient.callTool("cms_list_pages", {
  limit: 10
});

const newPage = await cmsClient.callTool("cms_create_page", {
  title: "Integration Test Page",
  path: "/test/integration",
  content: "<h1>Test Content</h1>"
});
```

## Web Application Integration

### Express.js Integration
```typescript
import express from 'express';
import { CMSIntegrationClient } from './cms-client.js';

const app = express();
const cmsClient = new CMSIntegrationClient();

app.use(express.json());

// Initialize CMS connection
app.use(async (req, res, next) => {
  if (!cmsClient.isConnected()) {
    await cmsClient.connect();
  }
  next();
});

// API endpoints
app.get('/api/pages', async (req, res) => {
  try {
    const result = await cmsClient.callTool("cms_list_pages", {
      page: req.query.page || 1,
      limit: req.query.limit || 20
    });
    
    const pages = JSON.parse(result.content[0].text);
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pages/:id', async (req, res) => {
  try {
    const result = await cmsClient.callTool("cms_get_page", {
      pageId: req.params.id,
      includeContent: true
    });
    
    const page = JSON.parse(result.content[0].text);
    res.json(page);
  } catch (error) {
    res.status(404).json({ error: "Page not found" });
  }
});

app.post('/api/pages', async (req, res) => {
  try {
    const result = await cmsClient.callTool("cms_create_page", req.body);
    res.json({ message: result.content[0].text });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('CMS API server running on port 3001');
});
```

### React Frontend Integration
```typescript
// CMS API service
class CMSService {
  private baseUrl = 'http://localhost:3001/api';
  
  async getPages(page = 1, limit = 20): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/pages?page=${page}&limit=${limit}`
    );
    return response.json();
  }
  
  async getPage(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pages/${id}`);
    return response.json();
  }
  
  async createPage(pageData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageData)
    });
    return response.json();
  }
  
  async searchContent(query: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
    );
    return response.json();
  }
}

// React component
import React, { useState, useEffect } from 'react';

const PageManager: React.FC = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const cmsService = new CMSService();
  
  useEffect(() => {
    loadPages();
  }, []);
  
  const loadPages = async () => {
    try {
      const result = await cmsService.getPages();
      setPages(result.pages || []);
    } catch (error) {
      console.error('Failed to load pages:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const createPage = async (pageData: any) => {
    try {
      await cmsService.createPage(pageData);
      await loadPages(); // Refresh list
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>CMS Page Manager</h1>
      <PageList pages={pages} />
      <PageForm onSubmit={createPage} />
    </div>
  );
};
```

## Automation and Scripting

### Content Migration Script
```typescript
#!/usr/bin/env node
import { CMSIntegrationClient } from './cms-client.js';
import fs from 'fs/promises';

class ContentMigrator {
  private cmsClient: CMSIntegrationClient;
  
  constructor() {
    this.cmsClient = new CMSIntegrationClient();
  }
  
  async migrate(sourceFile: string): Promise<void> {
    await this.cmsClient.connect();
    
    const content = await fs.readFile(sourceFile, 'utf-8');
    const pages = JSON.parse(content);
    
    for (const page of pages) {
      try {
        console.log(`Migrating: ${page.title}`);
        
        const result = await this.cmsClient.callTool("cms_create_page", {
          title: page.title,
          path: page.path,
          content: page.content,
          template: page.template || 'default',
          metadata: page.metadata || {}
        });
        
        console.log(`✓ Created: ${result.content[0].text}`);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`✗ Failed to migrate ${page.title}:`, error.message);
      }
    }
  }
}

// Usage
const migrator = new ContentMigrator();
migrator.migrate('./content-export.json')
  .then(() => console.log('Migration complete'))
  .catch(console.error);
```

### Backup Script
```typescript
#!/usr/bin/env node
import { CMSIntegrationClient } from './cms-client.js';
import fs from 'fs/promises';

class ContentBackup {
  private cmsClient: CMSIntegrationClient;
  
  constructor() {
    this.cmsClient = new CMSIntegrationClient();
  }
  
  async backup(outputFile: string): Promise<void> {
    await this.cmsClient.connect();
    
    const allPages = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const result = await this.cmsClient.callTool("cms_list_pages", {
        page,
        limit: 50
      });
      
      const pageData = JSON.parse(result.content[0].text);
      
      for (const pageInfo of pageData.pages) {
        const fullPage = await this.cmsClient.callTool("cms_get_page", {
          pageId: pageInfo.id,
          includeContent: true
        });
        
        allPages.push(JSON.parse(fullPage.content[0].text));
      }
      
      hasMore = pageData.currentPage < pageData.totalPages;
      page++;
    }
    
    await fs.writeFile(outputFile, JSON.stringify(allPages, null, 2));
    console.log(`Backup complete: ${allPages.length} pages saved to ${outputFile}`);
  }
}

// Usage
const backup = new ContentBackup();
backup.backup(`./backup-${new Date().toISOString().split('T')[0]}.json`)
  .then(() => console.log('Backup complete'))
  .catch(console.error);
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/cms-deploy.yml
name: CMS Content Deployment

on:
  push:
    branches: [main]
    paths: ['content/**']

jobs:
  deploy-content:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: |
        npm install
        npm run build
        
    - name: Deploy content changes
      env:
        CMS_BASE_URL: ${{ secrets.CMS_BASE_URL }}
        OAUTH_CLIENT_ID: ${{ secrets.OAUTH_CLIENT_ID }}
        OAUTH_CLIENT_SECRET: ${{ secrets.OAUTH_CLIENT_SECRET }}
      run: |
        node scripts/deploy-content.js
```

### Content Deployment Script
```typescript
// scripts/deploy-content.js
import { CMSIntegrationClient } from '../src/cms-client.js';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';

class ContentDeployer {
  private cmsClient: CMSIntegrationClient;
  
  constructor() {
    this.cmsClient = new CMSIntegrationClient();
  }
  
  async deploy(): Promise<void> {
    await this.cmsClient.connect();
    
    // Find all content files
    const contentFiles = await glob('content/**/*.json');
    
    for (const file of contentFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const pageData = JSON.parse(content);
      
      try {
        // Check if page exists
        const existing = await this.cmsClient.callTool("cms_get_page", {
          path: pageData.path
        });
        
        if (existing.content[0].text.includes('Error')) {
          // Create new page
          await this.cmsClient.callTool("cms_create_page", pageData);
          console.log(`✓ Created: ${pageData.path}`);
        } else {
          // Update existing page
          const existingPage = JSON.parse(existing.content[0].text);
          await this.cmsClient.callTool("cms_update_page", {
            pageId: existingPage.id,
            ...pageData
          });
          console.log(`✓ Updated: ${pageData.path}`);
        }
        
        // Publish if specified
        if (pageData.publish) {
          await this.cmsClient.callTool("cms_publish_page", {
            pageId: existingPage?.id || pageData.id
          });
          console.log(`✓ Published: ${pageData.path}`);
        }
        
      } catch (error) {
        console.error(`✗ Failed to deploy ${file}:`, error.message);
      }
    }
  }
}

const deployer = new ContentDeployer();
deployer.deploy()
  .then(() => console.log('Deployment complete'))
  .catch(console.error);
```

## Error Handling and Retry Logic

### Robust Client Implementation
```typescript
class RobustCMSClient {
  private client: CMSIntegrationClient;
  private maxRetries = 3;
  private retryDelay = 1000;
  
  constructor() {
    this.client = new CMSIntegrationClient();
  }
  
  async callToolWithRetry(name: string, args: any, retries = this.maxRetries): Promise<any> {
    try {
      return await this.client.callTool(name, args);
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Retrying ${name} (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
        return this.callToolWithRetry(name, args, retries - 1);
      }
      throw error;
    }
  }
  
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'Rate limit exceeded'
    ];
    
    return retryableErrors.some(err => 
      error.message?.includes(err)
    );
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Performance Optimization

### Connection Pooling
```typescript
class CMSConnectionPool {
  private connections: CMSIntegrationClient[] = [];
  private maxConnections = 5;
  private currentIndex = 0;
  
  async initialize(): Promise<void> {
    for (let i = 0; i < this.maxConnections; i++) {
      const client = new CMSIntegrationClient();
      await client.connect();
      this.connections.push(client);
    }
  }
  
  getConnection(): CMSIntegrationClient {
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.maxConnections;
    return connection;
  }
  
  async callTool(name: string, args: any): Promise<any> {
    const connection = this.getConnection();
    return connection.callTool(name, args);
  }
}
```

### Caching Layer
```typescript
class CachedCMSClient {
  private client: CMSIntegrationClient;
  private cache = new Map<string, { data: any; expiry: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.client = new CMSIntegrationClient();
  }
  
  async callTool(name: string, args: any): Promise<any> {
    // Only cache read operations
    if (!this.isCacheable(name)) {
      return this.client.callTool(name, args);
    }
    
    const cacheKey = `${name}:${JSON.stringify(args)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    const result = await this.client.callTool(name, args);
    
    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.cacheTTL
    });
    
    return result;
  }
  
  private isCacheable(toolName: string): boolean {
    const cacheableTools = [
      'cms_get_page',
      'cms_list_pages',
      'cms_search_content'
    ];
    return cacheableTools.includes(toolName);
  }
}
```

## Security Considerations

### Secure Configuration
```typescript
// Secure environment handling
class SecureConfig {
  static getConfig() {
    const requiredVars = [
      'CMS_BASE_URL',
      'OAUTH_CLIENT_ID',
      'OAUTH_CLIENT_SECRET'
    ];
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }
    
    return {
      cmsBaseUrl: process.env.CMS_BASE_URL,
      oauthClientId: process.env.OAUTH_CLIENT_ID,
      oauthClientSecret: process.env.OAUTH_CLIENT_SECRET,
      oauthRedirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback'
    };
  }
}
```

### Input Validation
```typescript
// Validate inputs before sending to MCP server
class InputValidator {
  static validatePageData(data: any): void {
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Title is required and must be a string');
    }
    
    if (!data.path || typeof data.path !== 'string') {
      throw new Error('Path is required and must be a string');
    }
    
    if (data.path && !data.path.startsWith('/')) {
      throw new Error('Path must start with /');
    }
    
    // Sanitize content
    if (data.content) {
      data.content = this.sanitizeHTML(data.content);
    }
  }
  
  private static sanitizeHTML(html: string): string {
    // Basic HTML sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}
```

## Best Practices

### Integration Patterns
1. **Connection Management**: Use connection pooling for high-traffic applications
2. **Error Handling**: Implement comprehensive retry logic
3. **Caching**: Cache read operations to improve performance
4. **Security**: Validate all inputs and secure credentials
5. **Monitoring**: Log integration activities and monitor performance

### Performance Tips
1. **Batch Operations**: Group multiple operations when possible
2. **Async Processing**: Use async/await for non-blocking operations
3. **Rate Limiting**: Respect server rate limits
4. **Connection Reuse**: Maintain persistent connections
5. **Caching Strategy**: Cache frequently accessed data

### Security Guidelines
1. **Environment Variables**: Store credentials securely
2. **Input Validation**: Validate all user inputs
3. **HTTPS**: Use HTTPS for all communications
4. **Token Management**: Handle OAuth tokens securely
5. **Error Messages**: Don't expose sensitive information in errors