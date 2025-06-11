#!/bin/sh
# Start Ingeniux CMS MCP Server in local development mode

if [ -f .env.local ]; then
	export $(grep -v '^#' .env.local | xargs)
fi

if command -v nodemon >/dev/null 2>&1; then
	nodemon --watch src --ext ts,js,json --exec "npx ts-node src/index.ts"
else
	npx ts-node src/index.ts
fi