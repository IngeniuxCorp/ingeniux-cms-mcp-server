# Ingeniux CMS MCP Server - System Architecture

## 1. System Overview

The Ingeniux CMS MCP Server provides programmatic access to Ingeniux CMS WebAPI v10.6.378 through the Model Context Protocol (MCP), enabling AI assistants to interact with CMS content and operations via OAuth-authenticated API calls.

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "MCP Client Layer"
        MC[MCP Client]
    end
    
    subgraph "MCP Server Core"
        MS[MCP Server]
        TR[Tool Registry]
        RH[Request Handler]
    end
    
    subgraph "Authentication Layer"
        OM[OAuth Manager]
        TS[Token Store]
        AM[Auth Middleware]
    end
    
    subgraph "API Layer"
        SP[Swagger Parser]
        EM[Endpoint Mapper]
        AC[API Client]
    end
    
    subgraph "Tool Modules"
        CT[Content Tools]
        AT[Analytics Tools]
        UT[User Tools]
        ADT[Admin Tools]
    end
    
    subgraph "Utility Layer"
        CM[Config Manager]
        EH[Error Handler]
        LG[Logger]
        VL[Validators]
    end
    
    subgraph "External Systems"
        CMS[Ingeniux CMS WebAPI]
        AUTH[OAuth Provider]
    end
    
    MC --> MS
    MS --> TR
    MS --> RH
    RH --> AM
    AM --> OM
    OM --> TS
    OM --> AUTH
    RH --> CT
    RH --> AT
    RH --> UT
    RH --> ADT
    CT --> AC
    AT --> AC
    UT --> AC
    ADT --> AC
    AC --> SP
    AC --> EM
    AC --> CMS
    MS --> CM
    MS --> EH
    MS --> LG
    RH --> VL
```

## 2. Component Architecture

### 2.1 Module Structure

```
src/
├── core/                    # Core MCP server functionality
│   ├── mcp-server.ts       # Main MCP server implementation
│   ├── tool-registry.ts    # Tool registration and management
│   └── request-handler.ts  # Request processing pipeline
├── auth/                   # Authentication and authorization
│   ├── oauth-manager.ts    # OAuth flow implementation
│   ├── token-store.ts      # Secure token storage
│   └── auth-middleware.ts  # Authentication middleware
├── api/                    # API integration layer
│   ├── swagger-parser.ts   # Swagger specification parser
│   ├── endpoint-mapper.ts  # API endpoint categorization
│   └── api-client.ts       # HTTP client for CMS API
├── tools/                  # MCP tool implementations
│   ├── content-tools.ts    # Content management tools
│   ├── analytics-tools.ts  # Analytics and reporting tools
│   ├── user-tools.ts       # User management tools
│   └── admin-tools.ts      # System administration tools
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

### 2.2 Core Components

#### 2.2.1 MCP Server Core

```mermaid
classDiagram
    class MCPServer {
        +toolRegistry: ToolRegistry
        +requestHandler: RequestHandler
        +configManager: ConfigManager
        +start(): Promise~void~
        +stop(): Promise~void~
        +handleRequest(request): Promise~Response~
    }
    
    class ToolRegistry {
        +tools: Map~string, MCPTool~
        +registerTool(tool: MCPTool): void
        +getTool(name: string): MCPTool
        +listTools(): MCPTool[]
    }
    
    class RequestHandler {
        +authMiddleware: AuthMiddleware
        +validators: Validators
        +errorHandler: ErrorHandler
        +processRequest(request): Promise~Response~
        +validateRequest(request): ValidationResult
    }
    
    MCPServer --> ToolRegistry
    MCPServer --> RequestHandler
    RequestHandler --> AuthMiddleware
```

#### 2.2.2 Authentication Layer

```mermaid
classDiagram
    class OAuthManager {
        +config: OAuthConfig
        +tokenStore: TokenStore
        +initiateFlow(): AuthorizationURL
        +exchangeCode(code: string): Promise~AccessToken~
        +refreshToken(refreshToken: string): Promise~AccessToken~
    }
    
    class TokenStore {
        +accessToken: string
        +refreshToken: string
        +expiresAt: Date
        +store(tokens: TokenData): void
        +retrieve(): TokenData
        +clear(): void
        +isValid(): boolean
    }
    
    class AuthMiddleware {
        +oauthManager: OAuthManager
        +authenticate(request): Promise~AuthenticatedRequest~
        +handleAuthError(error): void
    }
    
    OAuthManager --> TokenStore
    AuthMiddleware --> OAuthManager
```

### 2.3 Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client as MCP Client
    participant Server as MCP Server
    participant Registry as Tool Registry
    participant Auth as Auth Middleware
    participant API as API Client
    participant CMS as Ingeniux CMS
    
    Client->>Server: tool_call request
    Server->>Registry: lookup tool handler
    Registry->>Server: return tool handler
    Server->>Auth: authenticate request
    Auth->>Auth: validate/refresh token
    Auth->>Server: authenticated request
    Server->>API: execute API call
    API->>CMS: HTTP request
    CMS->>API: HTTP response
    API->>Server: processed response
    Server->>Client: tool_call response
```

## 3. Security Architecture

### 3.1 OAuth Implementation Design

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> AuthorizationPending: initiate_oauth_flow()
    AuthorizationPending --> Authenticated: exchange_code_for_token()
    Authenticated --> TokenRefresh: token_expired
    TokenRefresh --> Authenticated: refresh_successful
    TokenRefresh --> Unauthenticated: refresh_failed
    Authenticated --> Unauthenticated: logout/error
```

#### 3.1.1 OAuth Flow Components

- **Authorization URL Generation**: PKCE-enabled with state validation
- **Token Exchange**: Secure code-to-token exchange with validation
- **Token Management**: Encrypted storage with automatic refresh
- **Error Handling**: Graceful degradation with re-authentication triggers

### 3.2 Security Middleware Stack

```mermaid
graph TD
    A[Incoming Request] --> B[Input Sanitization]
    B --> C[Rate Limiting]
    C --> D[Authentication Check]
    D --> E[Token Validation]
    E --> F[Authorization Check]
    F --> G[Request Processing]
    G --> H[Response Sanitization]
    H --> I[Outgoing Response]
```

### 3.3 Token Security Design

- **Storage**: Environment-based configuration only
- **Encryption**: AES-256 encryption for token persistence
- **Rotation**: Automatic token refresh before expiration
- **Cleanup**: Secure token clearing on shutdown/error

## 4. Plugin Architecture

### 4.1 Extensible Tool System

```mermaid
classDiagram
    class ToolPlugin {
        <<interface>>
        +name: string
        +description: string
        +inputSchema: JSONSchema
        +execute(params): Promise~ToolResult~
    }
    
    class ContentTools {
        +createPage(params): Promise~ToolResult~
        +updateContent(params): Promise~ToolResult~
        +publishPage(params): Promise~ToolResult~
    }
    
    class AnalyticsTools {
        +getPageViews(params): Promise~ToolResult~
        +getSearchMetrics(params): Promise~ToolResult~
        +generateReport(params): Promise~ToolResult~
    }
    
    class UserTools {
        +createUser(params): Promise~ToolResult~
        +updatePermissions(params): Promise~ToolResult~
        +getUserInfo(params): Promise~ToolResult~
    }
    
    ToolPlugin <|-- ContentTools
    ToolPlugin <|-- AnalyticsTools
    ToolPlugin <|-- UserTools
```

### 4.2 Endpoint Mapping Strategy

```mermaid
graph LR
    A[Swagger Spec] --> B[Parse Endpoints]
    B --> C[Categorize by Function]
    C --> D[Generate Tool Schema]
    D --> E[Create Tool Handler]
    E --> F[Register with MCP]
    
    subgraph Categories
        G[Content Management]
        H[User Management]
        I[Analytics]
        J[System Admin]
        K[Workflow]
        L[Publishing]
    end
    
    C --> G
    C --> H
    C --> I
    C --> J
    C --> K
    C --> L
```

## 5. Configuration Architecture

### 5.1 Environment-Based Configuration

```mermaid
graph TB
    subgraph "Configuration Sources"
        ENV[Environment Variables]
        FILE[Config Files]
        DEF[Default Values]
    end
    
    subgraph "Configuration Manager"
        LOAD[Load Config]
        VALIDATE[Validate Config]
        MERGE[Merge Sources]
    end
    
    subgraph "Configuration Categories"
        SERVER[Server Config]
        OAUTH[OAuth Config]
        API[API Config]
        CACHE[Cache Config]
    end
    
    ENV --> LOAD
    FILE --> LOAD
    DEF --> LOAD
    LOAD --> VALIDATE
    VALIDATE --> MERGE
    MERGE --> SERVER
    MERGE --> OAUTH
    MERGE --> API
    MERGE --> CACHE
```

### 5.2 Configuration Schema

```typescript
interface ServerConfig {
	// Server settings
	port: number;
	host: string;
	
	// CMS connection
	cmsBaseUrl: string;
	apiTimeout: number;
	maxRetries: number;
	
	// OAuth configuration
	oauth: {
		clientId: string;        // from ENV only
		clientSecret: string;    // from ENV only
		authorizationUrl: string;
		tokenUrl: string;
		redirectUri: string;
		scopes: string[];
	};
	
	// Performance settings
	cache: {
		ttl: number;
		maxSize: number;
		evictionPolicy: string;
	};
	
	// Logging configuration
	logging: {
		level: string;
		format: string;
		destination: string;
	};
}
```

## 6. Error Handling Architecture

### 6.1 Error Classification System

```mermaid
graph TD
    A[Error Occurred] --> B{Error Type}
    B -->|Authentication| C[Auth Error Handler]
    B -->|Validation| D[Validation Error Handler]
    B -->|API| E[API Error Handler]
    B -->|Network| F[Network Error Handler]
    B -->|Configuration| G[Config Error Handler]
    
    C --> H[Log Error]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[Format Response]
    I --> J[Return to Client]
```

### 6.2 Error Recovery Strategies

- **Authentication Errors**: Trigger re-authentication flow
- **Network Errors**: Implement exponential backoff retry
- **Rate Limiting**: Queue requests with delay
- **Validation Errors**: Provide detailed field-level feedback

## 7. Performance Architecture

### 7.1 Caching Strategy

```mermaid
graph LR
    A[Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached]
    B -->|No| D[Process Request]
    D --> E[Store in Cache]
    E --> F[Return Response]
    
    subgraph Cache Layers
        G[Memory Cache]
        H[Request Deduplication]
        I[Response Caching]
    end
    
    B --> G
    D --> H
    E --> I
```

### 7.2 Rate Limiting Design

- **Sliding Window**: Prevents burst traffic abuse
- **Per-Client Limits**: Individual client rate tracking
- **Adaptive Throttling**: Dynamic adjustment based on load
- **Graceful Degradation**: Queue overflow handling

## 8. Deployment Architecture

### 8.1 Package Structure

```
dist/
├── index.js              # Entry point
├── core/                 # Core functionality
├── auth/                 # Authentication modules
├── api/                  # API integration
├── tools/                # Tool implementations
├── utils/                # Utilities
└── types/                # Type definitions

config/
├── default.json          # Default configuration
├── development.json      # Development overrides
└── production.json       # Production overrides

docs/
├── architecture.md       # This document
├── api-reference.md      # API documentation
└── deployment-guide.md   # Deployment instructions
```

### 8.2 Environment Configuration

```bash
# Required Environment Variables
CMS_BASE_URL=https://cms.example.com/api
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional Environment Variables
API_TIMEOUT=30000
MAX_RETRIES=3
LOG_LEVEL=info
CACHE_TTL=300
RATE_LIMIT_RPM=100
```

### 8.3 Monitoring Integration Points

```mermaid
graph TB
    subgraph "Application"
        A[MCP Server]
        B[Request Handler]
        C[API Client]
    end
    
    subgraph "Monitoring"
        D[Metrics Collector]
        E[Health Checks]
        F[Log Aggregator]
    end
    
    subgraph "Observability"
        G[Performance Metrics]
        H[Error Tracking]
        I[Usage Analytics]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    D --> H
    D --> I
    A --> E
    A --> F
```

## 9. Scalability Considerations

### 9.1 Horizontal Scaling Design

- **Stateless Architecture**: No server-side session storage
- **External Token Storage**: Redis/database for token persistence
- **Load Balancer Ready**: Health check endpoints
- **Connection Pooling**: Efficient resource utilization

### 9.2 Performance Optimizations

- **Request Batching**: Combine similar API calls
- **Connection Reuse**: HTTP keep-alive and pooling
- **Lazy Loading**: On-demand tool registration
- **Memory Management**: Efficient garbage collection

## 10. Integration Points

### 10.1 MCP Protocol Compliance

```mermaid
graph LR
    A[MCP Client] --> B[Protocol Handler]
    B --> C[Message Validator]
    C --> D[Tool Dispatcher]
    D --> E[Response Formatter]
    E --> A
    
    subgraph MCP Messages
        F[initialize]
        G[tools/list]
        H[tools/call]
        I[resources/list]
    end
    
    B --> F
    B --> G
    B --> H
    B --> I
```

### 10.2 External System Dependencies

- **Ingeniux CMS WebAPI**: Primary data source
- **OAuth Provider**: Authentication service
- **Configuration Store**: Environment variables
- **Logging Service**: Structured log output
- **Monitoring System**: Metrics and health data

## 11. Design Rationale

### 11.1 Architectural Decisions

1. **Modular Design**: Each component <500 lines for maintainability
2. **Environment Configuration**: No hardcoded secrets or values
3. **Plugin Architecture**: Extensible tool system for future growth
4. **Security First**: OAuth with PKCE, encrypted token storage
5. **Error Resilience**: Comprehensive error handling and recovery

### 11.2 Technology Choices

- **TypeScript**: Type safety and developer experience
- **Node.js**: JavaScript ecosystem and MCP SDK compatibility
- **Modular Architecture**: Clean separation of concerns
- **Configuration-Driven**: Environment-based deployment flexibility

## 12. Future Extensibility

### 12.1 Plugin System Expansion

- Custom authentication providers
- Additional API version support
- Custom tool implementations
- Advanced caching strategies

### 12.2 Performance Enhancements

- Connection pooling optimization
- Intelligent request batching
- Predictive token refresh
- Adaptive rate limiting algorithms

---

**Document Version**: 1.0  
**Created**: 2025-01-06  
**Author**: System Architect  
**Status**: Architecture Design Complete