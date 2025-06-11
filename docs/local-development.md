# Ingeniux CMS MCP Server – Local Development Guide

## Quick Start

1. Copy `.env.example` to `.env.local` and adjust for local dev.
2. Run `npm install`.
3. Start the mock server: `node mock-server.js`
4. Start MCP server: `./start-dev.sh` (Unix) or `./start-dev.ps1` (Windows)
5. Run health check: `./healthcheck.sh`
6. Seed test data: `./test-seed.sh seed`

## Local OAuth & CMS Mock

- OAuth endpoints: `http://localhost:4000/mock-oauth`
- CMS endpoints: `http://localhost:4000/mock-cms`
- Update `.env.local` and `dev-config.json` as needed.

## Hot Reload & Debugging

- Uses `nodemon` for hot reload (auto-detects).
- Logging: set `LOG_LEVEL=debug` in `.env.local`.

## Testing

- Run all tests: `npm test`
- Integration tests use local mock endpoints.

## Troubleshooting

- Check `.env.local` for config issues.
- Use `./healthcheck.sh` to verify services.
- Logs output to console in debug mode.

## Cleanup

- Stop MCP: `./stop-dev.sh`
- Cleanup test data: `./test-seed.sh cleanup`