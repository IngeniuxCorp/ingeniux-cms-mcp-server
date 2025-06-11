# Developer Guide

Comprehensive guide for developers working with the Ingeniux CMS MCP Server.

## Development Setup

### Prerequisites
- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Git
- Code editor (VS Code recommended)

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd ingeniux-cms-mcp-server

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure development environment
# Edit .env with development values

# Build project
npm run build

# Run tests
npm test
```

### Development Environment
```bash
# Development .env configuration
NODE_ENV=development
CMS_BASE_URL=https://dev-cms.example.com/api
OAUTH_CLIENT_ID=dev_client_id
OAUTH_CLIENT_SECRET=dev_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback
LOG_LEVEL=debug
API_TIMEOUT=10000
```

## Project Structure

### Module Organization
```
src/
├── core/                    # Core MCP server functionality
│   ├── mcp-server.ts       # Main server implementation
│   ├── tool-registry.ts    # Tool registration and management
│   └── request-handler.ts  # Request processing pipeline
├── auth/                   # Authentication and authorization
│   ├── oauth-manager.ts    # OAuth flow implementation
│   ├── token-store.ts      # Secure token storage
│   └── auth-middleware.ts  # Authentication middleware
├── api/                    # API integration layer
│   └── api-client.ts       # HTTP client for CMS API
├── tools/                  # MCP tool implementations
│   └── content-tools.ts    # Content management tools
├── utils/                  # Shared utilities
│   ├── config-manager.ts   # Configuration management
│   ├── error-handler.ts    # Error handling and formatting
│   ├── logger.ts           # Structured logging
│   └── validators.ts       # Input validation utilities
└── types/                  # TypeScript type definitions
    ├── api-types.ts        # API-related types
    ├── mcp-types.ts        # MCP protocol types
    └── config-types.ts     # Configuration types
```

### Design Principles
1. **Modular Architecture**: Each file under 500 lines
2. **Single Responsibility**: One concern per module
3. **Type Safety**: Comprehensive TypeScript typing
4. **Error Handling**: Consistent error management
5. **Security First**: Security considerations in all modules

## Core Components

### MCP Server Core
```typescript
// src/core/mcp-server.ts
export class MCPServer {
  private server: Server;
  private toolRegistry: ToolRegistry;
  private requestHandler: RequestHandler;
  
  constructor() {
    this.server = new Server({
      name: 'ingeniux-cms-mcp-server',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {},
        resources: {}
      }
    });
  }
  
  async start(): Promise<void> {
    // Server startup logic
  }
}
```

### Tool Registry
```typescript
// src/core/tool-registry.ts
export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();
  
  registerTool(tool: MCPTool): void {
    this.validateTool(tool);
    this.tools.set(tool.name, tool);
  }
  
  async executeTool(name: string, params: any): Promise<ToolResult> {
    const tool = this.getTool(name);
    return await tool.handler(params);
  }
}
```

### Authentication Manager
```typescript
// src/auth/oauth-manager.ts
export class OAuthManager {
  private config: OAuthConfig;
  private pendingAuth: Map<string, PKCEData> = new Map();
  
  initiateFlow(): AuthorizationURL {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();
    
    // Store PKCE data and return authorization URL
  }
}
```

## Adding New Tools

### Tool Implementation Pattern
```typescript
// Example: New analytics tool
export class AnalyticsTools {
  private apiClient: APIClient;
  
  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }
  
  public getTools(): MCPTool[] {
    return [
      this.createPageViewsTool(),
      this.createTrafficReportTool()
    ];
  }
  
  private createPageViewsTool(): MCPTool {
    return {
      name: 'cms_get_page_views',
      description: 'Get page view statistics',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: {
            type: 'string',
            description: 'Page ID to get views for'
          },
          dateRange: {
            type: 'string',
            description: 'Date range (7d, 30d, 90d)',
            enum: ['7d', '30d', '90d']
          }
        },
        required: ['pageId'],
        additionalProperties: false
      },
      handler: async (params: any): Promise<ToolResult> => {
        try {
          // Validate parameters
          errorHandler.validateRequest(params, ['pageId']);
          
          // Make API request
          const response = await this.apiClient.get(
            `/analytics/pageviews/${params.pageId}`,
            { dateRange: params.dateRange || '30d' }
          );
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(response.data, null, 2)
            }]
          };
        } catch (error) {
          return errorHandler.createErrorResult(error, {
            operation: 'get_page_views',
            toolName: 'cms_get_page_views',
            timestamp: new Date()
          });
        }
      }
    };
  }
}
```

### Tool Registration
```typescript
// Register new tools in mcp-server.ts
private async registerTools(): Promise<void> {
  // Existing tools
  const contentTools = new ContentTools(this.apiClient);
  contentTools.getTools().forEach(tool => {
    toolRegistry.registerTool(tool);
  });
  
  // New analytics tools
  const analyticsTools = new AnalyticsTools(this.apiClient);
  analyticsTools.getTools().forEach(tool => {
    toolRegistry.registerTool(tool);
  });
}
```

## Type Definitions

### Creating New Types
```typescript
// src/types/analytics-types.ts
export interface PageViewData {
  pageId: string;
  views: number;
  uniqueViews: number;
  dateRange: string;
  data: DailyViewData[];
}

export interface DailyViewData {
  date: string;
  views: number;
  uniqueViews: number;
}

export interface TrafficReport {
  totalViews: number;
  totalUniqueViews: number;
  topPages: PageViewSummary[];
  timeRange: string;
}
```

### Extending Existing Types
```typescript
// Extend configuration types
export interface ExtendedServerConfig extends ServerConfig {
  analytics: {
    enabled: boolean;
    retentionDays: number;
    aggregationInterval: number;
  };
}
```

## Error Handling

### Custom Error Types
```typescript
// src/utils/custom-errors.ts
export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class APIError extends Error {
  constructor(
    message: string, 
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

### Error Handler Extension
```typescript
// Extend error handler for new error types
export class ExtendedErrorHandler extends ErrorHandler {
  handleValidationError(error: ValidationError): ToolResult {
    return {
      content: [{
        type: 'text',
        text: `Validation error in field '${error.field}': ${error.message}`
      }]
    };
  }
  
  handleAPIError(error: APIError): ToolResult {
    const message = error.statusCode >= 500 
      ? 'Internal server error occurred'
      : error.message;
      
    return {
      content: [{
        type: 'text',
        text: `API error (${error.statusCode}): ${message}`
      }]
    };
  }
}
```

## Testing

### Unit Testing Pattern
```typescript
// tests/tools/analytics-tools.test.ts
describe('AnalyticsTools', () => {
  let analyticsTools: AnalyticsTools;
  let mockApiClient: jest.Mocked<APIClient>;
  
  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    } as jest.Mocked<APIClient>;
    
    analyticsTools = new AnalyticsTools(mockApiClient);
  });
  
  describe('createPageViewsTool', () => {
    it('should return page view data for valid page ID', async () => {
      // Arrange
      const mockResponse = {
        data: {
          pageId: '12345',
          views: 1000,
          uniqueViews: 750
        }
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);
      
      const tool = analyticsTools.getTools()
        .find(t => t.name === 'cms_get_page_views');
      
      // Act
      const result = await tool!.handler({ pageId: '12345' });
      
      // Assert
      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/analytics/pageviews/12345',
        { dateRange: '30d' }
      );
      expect(result.content[0].text).toContain('1000');
    });
    
    it('should handle validation errors', async () => {
      const tool = analyticsTools.getTools()
        .find(t => t.name === 'cms_get_page_views');
      
      const result = await tool!.handler({});
      
      expect(result.content[0].text).toContain('Error occurred');
    });
  });
});
```

### Integration Testing
```typescript
// tests/integration/analytics-integration.test.ts
describe('Analytics Integration', () => {
  let mcpServer: MCPServer;
  
  beforeEach(async () => {
    mcpServer = MCPServer.getInstance();
    await mcpServer.start();
  });
  
  afterEach(async () => {
    await mcpServer.stop();
  });
  
  it('should handle complete analytics workflow', async () => {
    // Test full workflow from authentication to data retrieval
  });
});
```

## Configuration Management

### Adding Configuration Options
```typescript
// Extend configuration schema
const ExtendedConfigSchema = ConfigSchema.extend({
  analytics: z.object({
    enabled: z.boolean().default(true),
    retentionDays: z.number().min(1).max(365).default(90),
    aggregationInterval: z.number().min(1).max(24).default(1)
  })
});

// Update config manager
export class ExtendedConfigManager extends ConfigManager {
  loadConfiguration(): ExtendedServerConfig {
    const baseConfig = super.loadConfiguration();
    
    return {
      ...baseConfig,
      analytics: {
        enabled: process.env.ANALYTICS_ENABLED === 'true',
        retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90'),
        aggregationInterval: parseInt(process.env.ANALYTICS_INTERVAL || '1')
      }
    };
  }
}
```

## Debugging

### Debug Configuration
```typescript
// Debug logging setup
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}
```

### Debug Tools
```typescript
// Debug utilities
export class DebugUtils {
  static logRequest(request: any): void {
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Request details', {
        method: request.method,
        params: request.params,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  static logResponse(response: any): void {
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Response details', {
        status: response.status,
        size: JSON.stringify(response.data).length,
        timestamp: new Date().toISOString()
      });
    }
  }
}
```

## Performance Optimization

### Caching Implementation
```typescript
// Custom cache implementation
export class ToolCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;
  
  constructor(ttl: number = 300000) { // 5 minutes default
    this.ttl = ttl;
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl
    });
  }
}
```

### Request Optimization
```typescript
// Request batching utility
export class RequestBatcher {
  private pending: Map<string, Promise<any>> = new Map();
  
  async batchRequest(key: string, requestFn: () => Promise<any>): Promise<any> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    const promise = requestFn();
    this.pending.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pending.delete(key);
    }
  }
}
```

## Code Quality

### Linting Configuration
```json
// .eslintrc.json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,js}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

## Contributing Guidelines

### Code Standards
1. **TypeScript**: Use strict typing
2. **File Size**: Keep files under 500 lines
3. **Naming**: Use descriptive names
4. **Comments**: Document complex logic
5. **Tests**: Write comprehensive tests

### Pull Request Process
1. Create feature branch from main
2. Implement changes with tests
3. Run full test suite
4. Update documentation
5. Submit pull request with description

### Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass and coverage maintained
- [ ] Documentation updated
- [ ] Security considerations addressed
- [ ] Performance impact evaluated