# Roo Integration Guide

This guide explains how to connect and use the Ingeniux CMS MCP Server with Roo workflows.

## 1. Prerequisites

- Node.js 18+ or Docker
- Access to Ingeniux CMS with OAuth
- Roo platform (v1.2+)

## 2. MCP Server Configuration

Use the template in `docs/roo-mcp-config-template.json`:

```json
{
	"mcpServers": {
		"ingeniux-cms": {
			"command": "node",
			"args": ["dist/index.js"],
			"cwd": "/path/to/ingeniux-cms-mcp-server",
			"env": {
				"CMS_BASE_URL": "https://cms.example.com/api",
				"OAUTH_CLIENT_ID": "your_client_id",
				"OAUTH_CLIENT_SECRET": "your_client_secret",
				"OAUTH_REDIRECT_URI": "http://localhost:3000/callback"
			}
		}
	}
}
```

## 3. Environment Setup

1. Copy `.env.example` to `.env` and fill in your CMS/OAuth values.
2. Build and start the server:
	- Node: `npm install && npm run build && npm start`
	- Docker: `docker build -t ingeniux-cms-mcp-server . && docker run --env-file .env -p 3000:3000 ingeniux-cms-mcp-server`

## 4. Roo Workflow Integration

- Add the MCP server config to your Roo project.
- Use Roo's tool invocation to call Ingeniux CMS tools (e.g., `cms_get_page`, `cms_create_page`).
- See `docs/usage-examples.md` for tool usage patterns.

## 5. Troubleshooting

- Ensure all environment variables are set.
- Check server logs for OAuth or network errors.
- See `docs/troubleshooting-guide.md` for more help.