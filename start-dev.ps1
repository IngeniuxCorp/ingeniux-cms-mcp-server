# Start Ingeniux CMS MCP Server in local development mode (Windows PowerShell)

if (Test-Path ".env.local") {
	Get-Content .env.local | ForEach-Object {
		if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
			[System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
		}
	}
}

if (Get-Command nodemon -ErrorAction SilentlyContinue) {
	nodemon --watch src --ext ts,js,json --exec "npx ts-node src/index.ts"
} else {
	npx ts-node src/index.ts
}