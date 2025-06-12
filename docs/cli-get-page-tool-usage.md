# CLI Get Page Tool Usage Guide

## Overview

The CLI Get Page Tool is a command-line interface for testing the [`cms_get_page`](../src/tools/content-tools.ts) MCP tool handler. It provides a standalone way to retrieve page data from Ingeniux CMS with multiple output formats and comprehensive error handling.

## Architecture

The tool consists of 6 modular components:

- [`get-page-cli.ts`](../src/cli/get-page/get-page-cli.ts) - Main entry point and argument parsing
- [`get-page-executor.ts`](../src/cli/get-page/get-page-executor.ts) - Core execution logic with timeout and retry
- [`get-page-formatter.ts`](../src/cli/get-page/get-page-formatter.ts) - Multi-format output support
- [`get-page-validator.ts`](../src/cli/get-page/get-page-validator.ts) - Input validation and error handling
- [`get-page-types.ts`](../src/cli/get-page/get-page-types.ts) - TypeScript type definitions
- [`request-utils.ts`](../src/cli/get-page/request-utils.ts) - Utility functions for request handling

## Installation & Setup

### Prerequisites

- Node.js 18.0.0 or higher
- Valid Ingeniux CMS instance with API access
- OAuth credentials configured

### Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure required environment variables:
```bash
# Required
CMS_BASE_URL=https://your-cms-instance.com/api
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/callback

# Optional
API_TIMEOUT=30000
MAX_RETRIES=3
LOG_LEVEL=info
```

### Build the Project

```bash
npm install
npm run build
```

## Usage

### Basic Syntax

```bash
npm run test-get-page -- [options]
```

### Command-Line Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `--pageId` | string | * | - | Page ID to retrieve |
| `--path` | string | * | - | Page path to retrieve (alternative to pageId) |
| `--includeContent` | boolean | No | true | Include page content in response |
| `--format` | string | No | table | Output format: json, table, minimal |
| `--timeout` | number | No | 300 | Request timeout in seconds (30-1800) |
| `--verbose` | boolean | No | false | Enable verbose logging |
| `--help` | boolean | No | false | Show help message |

*Either `--pageId` or `--path` is required, but not both.

### Basic Examples

#### Retrieve Page by ID
```bash
npm run test-get-page -- --pageId "123"
```

#### Retrieve Page by Path
```bash
npm run test-get-page -- --path "/home"
```

#### JSON Output Format
```bash
npm run test-get-page -- --pageId "123" --format json
```

#### Exclude Content
```bash
npm run test-get-page -- --pageId "123" --includeContent false
```

#### Verbose Logging
```bash
npm run test-get-page -- --pageId "123" --verbose
```

### Advanced Examples

#### Custom Timeout with Minimal Output
```bash
npm run test-get-page -- --pageId "456" --timeout 60 --format minimal
```

#### Path-based Retrieval with JSON Output
```bash
npm run test-get-page -- --path "/products/widget" --format json --verbose
```

#### Content-only Retrieval
```bash
npm run test-get-page -- --pageId "789" --includeContent true --format table
```

## Output Formats

### Table Format (Default)

Displays results in a formatted table with metadata:

```
┌─────────────────┬──────────────────────────────────┐
│ Property        │ Value                            │
├─────────────────┼──────────────────────────────────┤
│ id              │ 123                              │
│ title           │ Home Page                        │
│ path            │ /home                            │
│ status          │ published                        │
├─────────────────┼──────────────────────────────────┤
│ Request ID      │ req_abc123_def456                │
│ Duration        │ 245ms                            │
│ Timestamp       │ 2025-01-01T12:00:00.000Z         │
└─────────────────┴──────────────────────────────────┘
```

### JSON Format

Returns complete structured data:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "title": "Home Page",
    "path": "/home",
    "status": "published",
    "content": "..."
  },
  "metadata": {
    "requestId": "req_abc123_def456",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "duration": 245,
    "endpoint": "/pages/123"
  }
}
```

### Minimal Format

Displays essential information only:

```
Page ID: 123
Title: Home Page
Path: /home
Status: published
Result: Success (245ms)
```

## Error Handling

### Validation Errors

The tool validates all inputs before execution:

```bash
# Missing required parameter
npm run test-get-page --
# Output: Validation errors:
#   - pageId/path: Either pageId or path is required

# Invalid format
npm run test-get-page -- --pageId "123" --format invalid
# Output: Validation errors:
#   - format: Invalid format. Valid options: json, table, minimal
```

### Runtime Errors

Runtime errors are displayed with helpful suggestions:

```bash
# Timeout error
npm run test-get-page -- --pageId "123" --timeout 1
# Output: Error: Request timed out after 1000ms
# Suggestions:
#   - Increase timeout value
#   - Check network connectivity
#   - Verify CMS server status
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `MISSING_REQUIRED_PARAM` | Missing pageId or path | Provide either --pageId or --path |
| `MUTUALLY_EXCLUSIVE` | Both pageId and path provided | Use only one identifier |
| `INVALID_FORMAT` | Invalid pageId or path format | Check format requirements |
| `INVALID_RANGE` | Timeout out of range | Use timeout between 30-1800 seconds |
| `INVALID_VALUE` | Invalid format option | Use json, table, or minimal |

## Integration Examples

### CI/CD Pipeline

```yaml
# .github/workflows/test-cms.yml
name: Test CMS Integration
on: [push, pull_request]

jobs:
  test-cms:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - name: Test page retrieval
        run: npm run test-get-page -- --pageId "test-page" --format json
        env:
          CMS_BASE_URL: ${{ secrets.CMS_BASE_URL }}
          OAUTH_CLIENT_ID: ${{ secrets.OAUTH_CLIENT_ID }}
          OAUTH_CLIENT_SECRET: ${{ secrets.OAUTH_CLIENT_SECRET }}
```

### Monitoring Script

```bash
#!/bin/bash
# monitor-pages.sh
PAGES=("home" "about" "contact")

for page in "${PAGES[@]}"; do
    echo "Testing page: $page"
    npm run test-get-page -- --path "/$page" --format minimal --timeout 30
    if [ $? -ne 0 ]; then
        echo "ERROR: Page $page failed"
        exit 1
    fi
done
echo "All pages tested successfully"
```

### Automated Testing

```bash
# test-suite.sh
#!/bin/bash
set -e

echo "Running CLI Get Page Tool Tests..."

# Test basic functionality
npm run test-get-page -- --pageId "123" --format json > /tmp/test1.json
npm run test-get-page -- --path "/home" --format table > /tmp/test2.txt
npm run test-get-page -- --pageId "456" --format minimal > /tmp/test3.txt

# Validate outputs
if grep -q "success.*true" /tmp/test1.json; then
    echo "✓ JSON format test passed"
else
    echo "✗ JSON format test failed"
    exit 1
fi

echo "All tests passed!"
```

## Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Error: Authentication failed
# Solution: Run OAuth setup first
npm run auth
```

#### Network Timeouts
```bash
# Error: Request timed out
# Solution: Increase timeout or check connectivity
npm run test-get-page -- --pageId "123" --timeout 600
```

#### Invalid Page ID
```bash
# Error: Page not found
# Solution: Verify page exists and ID is correct
npm run test-get-page -- --pageId "valid-id" --verbose
```

### Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
npm run test-get-page -- --pageId "123" --verbose
```

This provides:
- Request/response details
- Timing information
- Authentication status
- API endpoint calls
- Error stack traces

### Log Files

Check application logs for detailed error information:

```bash
# View recent logs
tail -f logs/mcp-server.log

# Search for specific errors
grep "ERROR" logs/mcp-server.log
```

## Performance Considerations

### Timeout Settings

- **Default**: 300 seconds (5 minutes)
- **Minimum**: 30 seconds
- **Maximum**: 1800 seconds (30 minutes)
- **Recommendation**: 60-120 seconds for most use cases

### Content Inclusion

- Use `--includeContent false` for faster metadata-only requests
- Large content may increase response time significantly
- Consider pagination for bulk operations

### Rate Limiting

The tool respects CMS rate limits:
- Default: 100 requests per minute
- Configurable via `RATE_LIMIT_RPM` environment variable
- Automatic retry with exponential backoff

## Developer Extension Guide

### Adding New Output Formats

1. Update [`get-page-types.ts`](../src/cli/get-page/get-page-types.ts):
```typescript
export interface GetPageCLIOptions {
    format: 'json' | 'table' | 'minimal' | 'xml'; // Add new format
}
```

2. Extend [`get-page-formatter.ts`](../src/cli/get-page/get-page-formatter.ts):
```typescript
public formatResult(result: GetPageResult): FormattedOutput {
    switch (this.format) {
        case 'xml':
            return this.formatAsXML(result);
        // ... existing cases
    }
}
```

3. Update validation in [`get-page-validator.ts`](../src/cli/get-page/get-page-validator.ts):
```typescript
const validFormats = ['json', 'table', 'minimal', 'xml'];
```

### Adding New Parameters

1. Define in types:
```typescript
export interface GetPageCLIOptions {
    // ... existing options
    newOption?: string;
}
```

2. Add parsing logic in [`get-page-cli.ts`](../src/cli/get-page/get-page-cli.ts):
```typescript
case '--newOption':
    options.newOption = this.getNextArgument(argv, i);
    i++;
    break;
```

3. Add validation in [`get-page-validator.ts`](../src/cli/get-page/get-page-validator.ts):
```typescript
if (options.newOption && !this.isValidNewOption(options.newOption)) {
    errors.push({
        field: 'newOption',
        message: 'Invalid newOption format',
        code: 'INVALID_FORMAT'
    });
}
```

### Custom Error Handling

Extend error handling in [`get-page-executor.ts`](../src/cli/get-page/get-page-executor.ts):

```typescript
private formatError(error: any): string {
    if (error instanceof CustomError) {
        return this.formatCustomError(error);
    }
    // ... existing logic
}
```

## Security Considerations

### Environment Variables

- Never commit `.env` files to version control
- Use secure storage for production credentials
- Rotate OAuth credentials regularly
- Limit OAuth scope to minimum required permissions

### Logging

- Sensitive data is automatically redacted from logs
- Use `--verbose` only in development environments
- Monitor log files for unauthorized access attempts

### Network Security

- Use HTTPS endpoints only
- Validate SSL certificates
- Consider VPN or firewall restrictions for production use

## Related Documentation

- [CLI Auth Tool Usage](cli-auth-tool-usage.md) - OAuth authentication setup
- [API Reference](api-reference.md) - Complete API documentation
- [Configuration Guide](configuration-guide.md) - Environment setup
- [Troubleshooting Guide](troubleshooting-guide.md) - Common issues and solutions
- [Developer Guide](developer-guide.md) - Extension and customization