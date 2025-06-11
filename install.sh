#!/bin/sh
# Ingeniux CMS MCP Server install script (Linux/macOS)
set -e

echo "Installing Ingeniux CMS MCP Server..."

if [ -f package.json ]; then
	echo "Installing NPM dependencies..."
	npm install
	echo "Building TypeScript..."
	npm run build
fi

if [ ! -f .env ]; then
	echo "Copying .env.example to .env"
	cp .env.example .env
	echo "Edit .env with your CMS and OAuth settings."
fi

echo "To run with Node.js: npm start"
echo "To run with Docker:"
echo "  docker build -t ingeniux-cms-mcp-server ."
echo "  docker run --env-file .env -p 3000:3000 ingeniux-cms-mcp-server"