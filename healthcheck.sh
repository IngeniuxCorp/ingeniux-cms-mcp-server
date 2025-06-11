#!/bin/sh
# Health check for local Ingeniux CMS MCP Server and mock endpoints

MCP_PORT=${PORT:-3000}
MOCK_PORT=4000

echo "Checking MCP server on http://localhost:$MCP_PORT/health ..."
curl -sf "http://localhost:$MCP_PORT/health" && echo "MCP server healthy." || echo "MCP server not responding."

echo "Checking mock CMS endpoint ..."
curl -sf "http://localhost:$MOCK_PORT/mock-cms/test" && echo "Mock CMS healthy." || echo "Mock CMS not responding."

echo "Checking mock OAuth endpoint ..."
curl -sf "http://localhost:$MOCK_PORT/mock-oauth/authorize?redirect_uri=http://localhost/cb&state=dev" && echo "Mock OAuth healthy." || echo "Mock OAuth not responding."