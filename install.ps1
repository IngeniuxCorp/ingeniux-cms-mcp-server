# Ingeniux CMS MCP Server install script (Windows PowerShell)
Write-Host "Installing Ingeniux CMS MCP Server..."

if (Test-Path "package.json") {
	Write-Host "Installing NPM dependencies..."
	npm install
	Write-Host "Building TypeScript..."
	npm run build
}

if (-not (Test-Path ".env")) {
	Write-Host "Copying .env.example to .env"
	Copy-Item ".env.example" ".env"
	Write-Host "Edit .env with your CMS and OAuth settings."
}

Write-Host "To run with Node.js: npm start"
Write-Host "To run with Docker:"
Write-Host "  docker build -t ingeniux-cms-mcp-server ."
Write-Host "  docker run --env-file .env -p 3000:3000 ingeniux-cms-mcp-server"