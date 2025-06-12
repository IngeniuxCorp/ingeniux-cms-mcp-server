# API Reference

Complete reference for all MCP tools and resources provided by the Ingeniux CMS MCP Server with OAuth 2.0 authentication.

## Overview

All CMS tools now require OAuth 2.0 authentication with automatic token management. The server provides 3 authentication tools and 7 CMS tools with seamless OAuth integration.

### Authentication Features
- **20-minute token caching** with automatic refresh
- **Automatic OAuth flow initiation** when tokens missing/expired
- **Bearer token injection** for all authenticated requests
- **Comprehensive error handling** with clear authentication guidance

## Authentication Tools

These tools manage OAuth authentication and do not require prior authentication:

### `health_check`
Check server health and authentication status.

**Authentication**: Not required
**Parameters**: None

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"status\": \"healthy\", \"timestamp\": \"2025-01-06T12:00:00Z\", \"authentication\": {\"isAuthenticated\": true, \"tokenExpiry\": \"2025-01-06T13:00:00Z\"}}"
  }]
}
```

### `auth_status`
Get current authentication status and token information.

**Authentication**: Not required
**Parameters**: None

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"isAuthenticated\": true, \"tokenExpiry\": \"2025-01-06T13:00:00Z\"}"
  }]
}
```

### `initiate_oauth`
Start OAuth 2.0 authentication flow with PKCE.

**Authentication**: Not required
**Parameters**: None

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"message\": \"OAuth flow initiated\", \"authUrl\": \"https://cms.example.com/oauth/authorize?...\", \"instructions\": \"Please visit the authorization URL to complete authentication\"}"
  }]
}
```

## Content Management Tools

All CMS tools require OAuth authentication and automatically handle token validation:

### `cms_get_page`
Retrieve a specific page from the CMS by ID or path.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | No* | Unique identifier of the page |
| `path` | string | No* | URL path of the page |
| `includeContent` | boolean | No | Include page content (default: true) |

*Either `pageId` or `path` is required.

**Example**:
```json
{
  "pageId": "12345",
  "includeContent": true
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"id\": \"12345\", \"title\": \"Page Title\", \"content\": \"...\"}"
  }]
}
```

### `cms_create_page`
Create a new page in the CMS.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Page title |
| `path` | string | Yes | URL path for the page |
| `content` | string | No | Page content |
| `template` | string | No | Template to use |
| `parentId` | string | No | Parent page ID |
| `metadata` | object | No | Additional metadata |

**Example**:
```json
{
  "title": "New Page",
  "path": "/new-page",
  "content": "<h1>Hello World</h1>",
  "template": "default-template",
  "metadata": {
    "keywords": "example, page"
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Page created successfully. ID: 67890"
  }]
}
```

### `cms_update_page`
Update an existing page in the CMS.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | ID of page to update |
| `title` | string | No | New page title |
| `content` | string | No | New page content |
| `metadata` | object | No | Updated metadata |

**Example**:
```json
{
  "pageId": "67890",
  "title": "Updated Title",
  "content": "<h1>Updated Content</h1>"
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Page updated successfully. ID: 67890"
  }]
}
```

### `cms_delete_page`
Delete a page from the CMS.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | ID of page to delete |
| `force` | boolean | No | Force deletion with children (default: false) |

**Example**:
```json
{
  "pageId": "67890",
  "force": false
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Page deleted successfully. ID: 67890"
  }]
}
```

### `cms_list_pages`
List pages in the CMS with optional filtering and pagination.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `parentId` | string | No | Filter by parent page ID |
| `template` | string | No | Filter by template name |
| `page` | number | No | Page number (default: 1, min: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |

**Example**:
```json
{
  "parentId": "section-123",
  "page": 1,
  "limit": 10
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"pages\": [...], \"totalCount\": 45, \"currentPage\": 1}"
  }]
}
```

### `cms_publish_page`
Publish a page to make it live.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageId` | string | Yes | ID of page to publish |
| `publishDate` | string | No | Schedule publish date (ISO format) |

**Example**:
```json
{
  "pageId": "67890",
  "publishDate": "2025-01-07T09:00:00Z"
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "Page published successfully. ID: 67890"
  }]
}
```

### `cms_search_content`
Search for content in the CMS.

**Authentication**: Required (automatic OAuth validation)
**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query string |
| `type` | string | No | Content type: "page", "asset", "all" (default: "all") |
| `page` | number | No | Page number (default: 1, min: 1) |
| `limit` | number | No | Results per page (default: 10, max: 50) |

**Example**:
```json
{
  "query": "product documentation",
  "type": "page",
  "page": 1,
  "limit": 5
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"results\": [...], \"totalMatches\": 12, \"searchTime\": \"0.045s\"}"
  }]
}
```

## Error Responses

All tools return error responses in a consistent format when operations fail.

### Error Response Format
```json
{
  "content": [{
    "type": "text",
    "text": "Error occurred: [error message]"
  }]
}
```

### Common Error Types

#### OAuth Authentication Errors
When OAuth authentication is required or fails, tools return structured error responses:

```json
{
  "content": [{
    "type": "text",
    "text": "{\"error\": \"Authentication required\", \"requiresAuth\": true, \"authUrl\": \"https://cms.example.com/oauth/authorize?...\", \"message\": \"Please complete OAuth authentication to use this tool\"}"
  }]
}
```

**Authentication Error Types**:
- **TOKEN_MISSING**: No access token available
- **TOKEN_EXPIRED**: Token expired (past 20 minutes)
- **TOKEN_INVALID**: Token rejected by CMS
- **OAUTH_FLOW_REQUIRED**: New OAuth flow needed
- **REFRESH_FAILED**: Token refresh failed

**Solutions**:
1. Use [`initiate_oauth`](#initiate_oauth) tool to start authentication
2. Visit provided authorization URL
3. Complete OAuth flow in CMS
4. Retry original tool operation

#### Legacy Authentication Errors
- **Message**: "Authentication failed: No valid access token available"
- **Cause**: User not authenticated or token expired
- **Solution**: Use [`initiate_oauth`](#initiate_oauth) tool to re-authenticate

#### Validation Errors
- **Message**: "Either pageId or path is required"
- **Cause**: Missing required parameters
- **Solution**: Provide all required parameters

#### Network Errors
- **Message**: "Request timeout"
- **Cause**: Network connectivity issues
- **Solution**: Check network connection and retry

#### API Errors
- **Message**: "Page not found"
- **Cause**: Requested resource doesn't exist
- **Solution**: Verify resource ID or path

## Input Validation

### String Validation
- All string inputs are sanitized to prevent XSS
- Empty strings are rejected for required fields
- Maximum length limits apply based on field type

### Numeric Validation
- Page numbers must be >= 1
- Limit values have minimum and maximum constraints
- Timeout values must be positive integers

### URL Validation
- Paths must be valid URL paths
- No spaces or invalid characters allowed
- Must start with forward slash

### Date Validation
- Dates must be in ISO 8601 format
- Future dates allowed for scheduling
- Invalid date formats rejected

## Rate Limiting

### Default Limits
- **Requests per minute**: 100 (configurable)
- **Burst capacity**: 10 requests
- **Rate limit headers**: Included in responses

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
```

### Rate Limit Exceeded
```json
{
  "content": [{
    "type": "text",
    "text": "Error occurred: Rate limit exceeded. Try again in 60 seconds."
  }]
}
```

## Caching Behavior

### Cached Operations
- **GET requests**: Cached for 5 minutes (configurable)
- **Search results**: Cached for 2 minutes
- **Authentication status**: Cached until token expiry

### Cache Headers
```
Cache-Control: max-age=300
ETag: "abc123def456"
Last-Modified: Mon, 06 Jan 2025 12:00:00 GMT
```

### Cache Invalidation
- **POST/PUT/DELETE**: Invalidates related cache entries
- **Manual**: Cache cleared on server restart
- **TTL**: Automatic expiration based on configuration

## Security Considerations

### Input Sanitization
- All inputs validated and sanitized
- SQL injection prevention
- XSS protection for content fields

### Authentication
- OAuth 2.0 with PKCE required for all operations
- Tokens automatically refreshed when needed
- Secure token storage with encryption

### Authorization
- User permissions enforced by CMS
- Read/write scopes validated
- Resource access controlled by CMS permissions

## Performance Optimization

### Best Practices
1. **Use pagination** for large result sets
2. **Cache frequently accessed** data
3. **Batch operations** when possible
4. **Monitor rate limits** to avoid throttling

### Response Times
- **Authentication**: < 100ms
- **Simple queries**: < 200ms
- **Complex searches**: < 1000ms
- **Content operations**: < 500ms

## Troubleshooting

### Debug Information
Enable debug logging to see detailed request/response information:
```bash
LOG_LEVEL=debug npm start
```

### Common Issues
1. **Token expiry**: Re-authenticate using OAuth flow
2. **Network timeouts**: Check CMS connectivity
3. **Validation errors**: Verify parameter formats
4. **Rate limiting**: Reduce request frequency

### Support
For additional support:
1. Check server logs for detailed error information
2. Verify CMS API documentation for endpoint changes
3. Test connectivity to CMS instance
4. Review OAuth application configuration