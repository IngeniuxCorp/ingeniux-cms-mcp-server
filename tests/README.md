# Test Suite Documentation

This directory contains comprehensive TDD tests for the Ingeniux CMS MCP Server core components.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and configuration
├── mocks/
│   └── mock-factories.ts       # Mock data factories for consistent test data
├── auth/
│   └── oauth-manager.test.ts   # OAuth manager unit tests
├── api/
│   └── api-client.test.ts      # API client unit tests
├── core/
│   └── tool-registry.test.ts   # Tool registry unit tests
├── utils/
│   └── config-manager.test.ts  # Configuration manager unit tests
├── integration/
│   └── oauth-flow.test.ts      # End-to-end OAuth flow tests
├── security/
│   └── security-validation.test.ts # Security validation tests
└── performance/
    └── performance.test.ts     # Performance and load tests
```

## Test Categories

### Unit Tests
- **OAuth Manager**: Token flow, PKCE, refresh logic
- **API Client**: HTTP requests, rate limiting, error handling
- **Tool Registry**: Tool registration, validation, execution
- **Configuration Manager**: Environment loading, validation

### Integration Tests
- **OAuth Flow**: Complete authorization code flow with PKCE
- **API Integration**: Authenticated API requests with token refresh
- **Error Recovery**: Network failures, token expiration scenarios

### Security Tests
- **Token Security**: No exposure of sensitive data in logs
- **Input Validation**: SQL injection, XSS prevention
- **Authentication**: Proper auth enforcement
- **Configuration Security**: No secret exposure

### Performance Tests
- **OAuth Operations**: PKCE generation, token refresh performance
- **API Client**: Concurrent requests, retry logic efficiency
- **Tool Registry**: Tool registration and execution speed
- **Memory Usage**: Memory leak detection and cleanup

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:security
npm run test:performance
npm run test:integration

# Watch mode for development
npm run test:watch
```

## Test Configuration

### Jest Configuration
- **Environment**: Node.js test environment
- **Module Resolution**: ESM with TypeScript support
- **Coverage Threshold**: 80% for branches, functions, lines, statements
- **Timeout**: 10 seconds per test
- **Setup**: Global mocks and test utilities

### Mock Strategy
- **External Dependencies**: All HTTP requests, crypto operations mocked
- **Singletons**: Reset between tests to ensure isolation
- **Environment Variables**: Controlled test environment
- **No Real Network Calls**: All external services mocked

## Test Data Management

### Mock Factories
The `MockFactories` class provides consistent test data:

```typescript
// OAuth configuration
const oauthConfig = MockFactories.createOAuthConfig();

// Token data
const tokenData = MockFactories.createTokenData();
const expiredToken = MockFactories.createExpiredTokenData();

// API responses
const apiResponse = MockFactories.createAPIResponse(data);

// MCP tools
const tool = MockFactories.createMCPTool();
```

### Environment Variables
Test environment variables are set in `setup.ts`:
- `CMS_BASE_URL`: Test CMS endpoint
- `OAUTH_CLIENT_ID`: Test OAuth client ID
- `OAUTH_CLIENT_SECRET`: Test OAuth client secret
- All other configuration variables with test values

## Security Testing

### Token Security
- Validates no token exposure in logs or error messages
- Tests secure token generation and storage
- Verifies PKCE implementation

### Input Validation
- SQL injection prevention tests
- XSS attack prevention
- Parameter validation and sanitization

### Authentication Security
- Proper authentication enforcement
- Authorization header validation
- Error handling without information disclosure

## Performance Testing

### Benchmarks
- OAuth operations: < 1ms per PKCE generation
- API requests: < 10ms per request validation
- Tool execution: < 0.5ms overhead per tool
- Memory usage: < 10MB increase for 1000 operations

### Concurrency
- Tests handle 50+ concurrent API requests
- OAuth token refresh under load
- Tool registry operations with high concurrency

## Coverage Requirements

Minimum coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Coverage Reports
- **Text**: Console output during test runs
- **LCOV**: For IDE integration
- **HTML**: Detailed coverage report in `coverage/` directory

## Best Practices

### Test Structure
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the operation being tested
3. **Assert**: Verify expected outcomes

### Naming Conventions
- Test files: `*.test.ts`
- Test descriptions: Clear, descriptive behavior statements
- Mock variables: Prefixed with `mock`

### Test Isolation
- Each test is independent
- Singletons reset between tests
- No shared state between tests
- Clean mocks after each test

### Error Testing
- Test both success and failure paths
- Verify error messages and types
- Test edge cases and boundary conditions

## Debugging Tests

### Common Issues
1. **Singleton State**: Ensure singletons are reset between tests
2. **Mock Leakage**: Clear mocks in `afterEach` hooks
3. **Async Operations**: Use proper async/await patterns
4. **Environment Variables**: Verify test environment setup

### Debug Commands
```bash
# Run single test file
npx jest tests/auth/oauth-manager.test.ts

# Run with verbose output
npx jest --verbose

# Debug specific test
npx jest --testNamePattern="should generate PKCE parameters"
```

## Continuous Integration

### Pre-commit Hooks
- Run linting and type checking
- Execute fast unit tests
- Verify test coverage thresholds

### CI Pipeline
1. Install dependencies
2. Run linting and type checking
3. Execute full test suite with coverage
4. Generate and upload coverage reports
5. Run security and performance tests

## Contributing

### Adding New Tests
1. Follow existing test structure and naming
2. Use mock factories for consistent test data
3. Ensure proper test isolation
4. Add both positive and negative test cases
5. Update documentation for new test categories

### Test Review Checklist
- [ ] Tests are isolated and independent
- [ ] Mock data uses factories
- [ ] Both success and error paths tested
- [ ] Security implications considered
- [ ] Performance impact evaluated
- [ ] Documentation updated