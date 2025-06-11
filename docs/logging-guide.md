# MCP Server Logging Guide

## Overview

The Ingeniux CMS MCP server uses Winston for structured logging. This guide explains how to access and configure logs for debugging connection issues and monitoring server activity.

## Current Logging Configuration

The server currently logs to **console only**. Logs are visible when the server runs in the terminal or when started by the MCP client.

## Log Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| `error` | Error conditions | Authentication failures, API errors, startup failures |
| `warn` | Warning conditions | Deprecated features, recoverable errors |
| `info` | Informational messages | Server startup, tool execution, configuration changes |
| `debug` | Debug information | Detailed request/response data, internal state |

## Viewing MCP Server Logs

### Method 1: Test Script (Recommended for Debugging)

Run the test script to see server startup logs:

```bash
node test-mcp-connection.js
```

This will show:
- Environment variable validation
- Server startup process
- MCP communication attempts
- Error messages if startup fails

### Method 2: Direct Server Execution

Start the server directly to see all logs:

```bash
# Set log level for more detail
export LOG_LEVEL=debug

# Start server
node dist/index.js
```

### Method 3: MCP Client Logs

When using with Roo Code, check the MCP client logs in VS Code:
- Open VS Code Developer Tools (Help → Toggle Developer Tools)
- Check Console tab for MCP-related messages
- Look for connection errors or server startup failures

## Environment Variables for Logging

Configure logging behavior with these environment variables:

```bash
# Set log level (error, warn, info, debug)
LOG_LEVEL=debug

# Enable detailed logging for troubleshooting
DEBUG=true
```

## Common Log Messages

### Successful Startup
```
Configuration loaded successfully
OAuth manager initialized
API client initialized
Registered 10 tools
MCP server started successfully
```

### Connection Issues
```
Failed to start MCP server: [error details]
Environment validation failed: [missing variables]
OAuth manager initialization failed: [auth errors]
```

### Tool Execution
```
Tool executed: cms_get_page (duration: 150ms)
Tool failed: cms_create_page (error: Authentication required)
```

## Enabling File Logging

To enable persistent file logging, set this environment variable:

```bash
# Enable file logging
ENABLE_FILE_LOGGING=true

# Optional: Set log file path
LOG_FILE_PATH=./logs/mcp-server.log
```

## Troubleshooting with Logs

### 1. Server Won't Start
Look for these error patterns:
- `Environment validation failed` → Check `.env` file
- `OAuth manager initialization failed` → Verify OAuth credentials
- `Failed to start MCP server` → Check detailed error message

### 2. Connection Closed (-32000)
Check for:
- Server startup completion: `MCP server started successfully`
- Tool registration: `Registered X tools`
- Environment issues: Missing required variables

### 3. Authentication Issues
Monitor for:
- `Auth event: oauth_flow_initiated`
- `Auth event: token_exchange_success/failed`
- `Authentication required` in tool execution logs

### 4. Tool Execution Problems
Watch for:
- `Tool executed: [tool_name]` (success)
- `Tool failed: [tool_name]` (failure with error details)
- Parameter validation errors

## Log Analysis Commands

### Filter by Log Level
```bash
# Show only errors
node dist/index.js 2>&1 | grep '"level":"error"'

# Show warnings and errors
node dist/index.js 2>&1 | grep -E '"level":"(error|warn)"'
```

### Monitor Real-time Logs
```bash
# Follow logs in real-time
node dist/index.js 2>&1 | tee mcp-server.log
```

### Search for Specific Events
```bash
# Find authentication events
node dist/index.js 2>&1 | grep '"type":"authentication"'

# Find tool executions
node dist/index.js 2>&1 | grep '"type":"tool_execution"'
```

## Log Format

Logs are structured in JSON format:

```json
{
  "timestamp": "2025-01-06T17:47:00.000Z",
  "level": "info",
  "message": "Tool executed: cms_get_page",
  "service": "ingeniux-cms-mcp-server",
  "toolName": "cms_get_page",
  "duration": 150,
  "success": true,
  "type": "tool_execution"
}
```

## Getting Help

If logs don't provide enough information:

1. **Increase Log Level**: Set `LOG_LEVEL=debug`
2. **Run Test Script**: Use `node test-mcp-connection.js`
3. **Check Environment**: Verify all required variables are set
4. **Review Documentation**: Check setup guides in `docs/` directory
5. **Report Issues**: Include relevant log excerpts when reporting problems

## Performance Considerations

- `debug` level logging can impact performance
- Use `info` or `warn` for production
- Consider log rotation for long-running servers
- Monitor disk space if file logging is enabled