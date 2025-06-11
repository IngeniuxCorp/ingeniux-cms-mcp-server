# Usage Examples

Practical examples and common workflows for the Ingeniux CMS MCP Server.

## Getting Started

### 1. Server Startup
```bash
# Start the server
npm start

# Expected output
[INFO] Configuration loaded successfully
[INFO] OAuth manager initialized
[INFO] API client initialized
[INFO] MCP server started successfully
```

### 2. Health Check
```bash
# Check server status
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "timestamp": "2025-01-06T12:00:00Z",
  "version": "1.0.0"
}
```

## Authentication Workflow

### OAuth Flow Example
```javascript
// 1. Initiate OAuth flow
const authTool = {
  name: "initiate_oauth",
  arguments: {}
};

// Response includes authorization URL
{
  "content": [{
    "type": "text",
    "text": "Please visit the following URL to authenticate:\nhttps://cms.example.com/oauth/authorize?response_type=code&client_id=abc123...\n\nState: xyz789"
  }]
}

// 2. User completes authentication in browser
// 3. Server automatically exchanges code for tokens
// 4. Check authentication status
const statusTool = {
  name: "auth_status",
  arguments: {}
};

// Response shows authenticated status
{
  "content": [{
    "type": "text",
    "text": "{\n  \"isAuthenticated\": true,\n  \"tokenExpiry\": \"2025-01-06T13:00:00Z\"\n}"
  }]
}
```

## Content Management Examples

### Retrieve a Page
```javascript
// Get page by ID
const getPageTool = {
  name: "cms_get_page",
  arguments: {
    pageId: "12345",
    includeContent: true
  }
};

// Get page by path
const getPageByPathTool = {
  name: "cms_get_page",
  arguments: {
    path: "/products/widget-a",
    includeContent: true
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "{\n  \"id\": \"12345\",\n  \"title\": \"Widget A\",\n  \"path\": \"/products/widget-a\",\n  \"content\": \"<p>Product description...</p>\"\n}"
  }]
}
```

### Create a New Page
```javascript
const createPageTool = {
  name: "cms_create_page",
  arguments: {
    title: "New Product Page",
    path: "/products/new-widget",
    content: "<h1>New Widget</h1><p>Description of the new widget.</p>",
    template: "product-template",
    parentId: "products-section",
    metadata: {
      keywords: "widget, product, new",
      description: "A new widget product page"
    }
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "Page created successfully. ID: 67890"
  }]
}
```

### Update Existing Page
```javascript
const updatePageTool = {
  name: "cms_update_page",
  arguments: {
    pageId: "67890",
    title: "Updated Widget Name",
    content: "<h1>Updated Widget</h1><p>Updated description with new features.</p>",
    metadata: {
      keywords: "widget, product, updated, features",
      lastModified: "2025-01-06"
    }
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "Page updated successfully. ID: 67890"
  }]
}
```

### List Pages with Filtering
```javascript
// List all pages
const listAllTool = {
  name: "cms_list_pages",
  arguments: {
    page: 1,
    limit: 20
  }
};

// List pages by parent
const listByParentTool = {
  name: "cms_list_pages",
  arguments: {
    parentId: "products-section",
    page: 1,
    limit: 10
  }
};

// List pages by template
const listByTemplateTool = {
  name: "cms_list_pages",
  arguments: {
    template: "product-template",
    page: 1,
    limit: 15
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "{\n  \"pages\": [...],\n  \"totalCount\": 45,\n  \"currentPage\": 1,\n  \"totalPages\": 3\n}"
  }]
}
```

### Search Content
```javascript
// Search all content
const searchAllTool = {
  name: "cms_search_content",
  arguments: {
    query: "widget features",
    type: "all",
    page: 1,
    limit: 10
  }
};

// Search only pages
const searchPagesTool = {
  name: "cms_search_content",
  arguments: {
    query: "product documentation",
    type: "page",
    page: 1,
    limit: 5
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "{\n  \"results\": [...],\n  \"totalMatches\": 12,\n  \"searchTime\": \"0.045s\"\n}"
  }]
}
```

### Publish a Page
```javascript
// Publish immediately
const publishNowTool = {
  name: "cms_publish_page",
  arguments: {
    pageId: "67890"
  }
};

// Schedule publication
const publishScheduledTool = {
  name: "cms_publish_page",
  arguments: {
    pageId: "67890",
    publishDate: "2025-01-07T09:00:00Z"
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "Page published successfully. ID: 67890"
  }]
}
```

### Delete a Page
```javascript
// Standard deletion
const deleteTool = {
  name: "cms_delete_page",
  arguments: {
    pageId: "67890"
  }
};

// Force deletion (with children)
const forceDeleteTool = {
  name: "cms_delete_page",
  arguments: {
    pageId: "67890",
    force: true
  }
};

// Response
{
  "content": [{
    "type": "text",
    "text": "Page deleted successfully. ID: 67890"
  }]
}
```

## Common Workflows

### Content Creation Workflow
```javascript
// 1. Create page
const createResult = await mcpClient.callTool("cms_create_page", {
  title: "Product Launch Page",
  path: "/launches/q1-2025",
  content: "<h1>Q1 2025 Product Launch</h1>",
  template: "launch-template"
});

// 2. Update with final content
const updateResult = await mcpClient.callTool("cms_update_page", {
  pageId: createResult.pageId,
  content: "<h1>Q1 2025 Product Launch</h1><p>Final launch content...</p>"
});

// 3. Publish when ready
const publishResult = await mcpClient.callTool("cms_publish_page", {
  pageId: createResult.pageId
});
```

### Content Migration Workflow
```javascript
// 1. Search for content to migrate
const searchResult = await mcpClient.callTool("cms_search_content", {
  query: "old-template",
  type: "page"
});

// 2. For each page found, update template
for (const page of searchResult.pages) {
  await mcpClient.callTool("cms_update_page", {
    pageId: page.id,
    template: "new-template"
  });
}

// 3. Republish updated pages
for (const page of searchResult.pages) {
  await mcpClient.callTool("cms_publish_page", {
    pageId: page.id
  });
}
```

### Content Audit Workflow
```javascript
// 1. List all pages
const allPages = await mcpClient.callTool("cms_list_pages", {
  limit: 100
});

// 2. Check each page for issues
const auditResults = [];
for (const page of allPages.pages) {
  const pageDetail = await mcpClient.callTool("cms_get_page", {
    pageId: page.id,
    includeContent: true
  });
  
  // Audit logic here
  if (pageDetail.content.includes("TODO")) {
    auditResults.push({
      pageId: page.id,
      issue: "Contains TODO markers"
    });
  }
}
```

## Error Handling Examples

### Authentication Errors
```javascript
// Handle authentication failure
try {
  const result = await mcpClient.callTool("cms_get_page", {
    pageId: "12345"
  });
} catch (error) {
  if (error.message.includes("Authentication failed")) {
    // Re-initiate OAuth flow
    await mcpClient.callTool("initiate_oauth", {});
  }
}
```

### Validation Errors
```javascript
// Handle validation errors
try {
  const result = await mcpClient.callTool("cms_create_page", {
    title: "", // Invalid: empty title
    path: "/invalid path" // Invalid: spaces in path
  });
} catch (error) {
  console.log("Validation error:", error.message);
  // Fix validation issues and retry
}
```

### Network Errors
```javascript
// Handle network timeouts
try {
  const result = await mcpClient.callTool("cms_get_page", {
    pageId: "12345"
  });
} catch (error) {
  if (error.message.includes("timeout")) {
    // Retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Retry the operation
  }
}
```

## Performance Optimization

### Batch Operations
```javascript
// Instead of individual requests
for (const pageId of pageIds) {
  await mcpClient.callTool("cms_get_page", { pageId });
}

// Use list operations when possible
const pages = await mcpClient.callTool("cms_list_pages", {
  parentId: "section-id",
  limit: 50
});
```

### Caching Considerations
```javascript
// Cache is automatic, but consider:
// - Frequent updates may invalidate cache
// - Large result sets use more cache memory
// - TTL affects data freshness

// For real-time data, consider shorter cache TTL
// For static content, longer TTL improves performance
```

## Integration Patterns

### With MCP Clients
```javascript
// Claude Desktop integration
const mcpConfig = {
  servers: {
    "ingeniux-cms": {
      command: "node",
      args: ["dist/index.js"],
      env: {
        CMS_BASE_URL: "https://cms.example.com/api",
        OAUTH_CLIENT_ID: "your_client_id"
        // Other environment variables
      }
    }
  }
};
```

### With Custom Applications
```javascript
// Custom MCP client integration
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({
  name: "cms-integration",
  version: "1.0.0"
});

// Connect to MCP server
await client.connect(transport);

// Use CMS tools
const pages = await client.request({
  method: "tools/call",
  params: {
    name: "cms_list_pages",
    arguments: { limit: 10 }
  }
});