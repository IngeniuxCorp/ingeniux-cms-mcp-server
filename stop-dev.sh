#!/bin/sh
# Stop Ingeniux CMS MCP Server running on local development port

PORT=${PORT:-3000}
PID=$(lsof -ti tcp:$PORT)

if [ -n "$PID" ]; then
	echo "Stopping MCP server on port $PORT (PID $PID)..."
	kill $PID
else
	echo "No MCP server process found on port $PORT."
fi