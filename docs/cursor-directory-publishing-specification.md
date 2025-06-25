# Cursor.Directory Publishing Specification

## Overview

This document specifies the requirements and steps for publishing the Ingeniux CMS MCP Server to cursor.directory, focusing exclusively on cursor.directory compliance and submission process.

## Cursor.Directory Requirements

### 1. Repository Structure

#### Required Files
- `package.json` - Package metadata and dependencies
- `README.md` - Documentation and usage instructions
- `dist/index.js` - Built executable entry point
- `LICENSE` - Open source license file
- `.env.example` - Environment configuration template

#### Package.json Requirements
```json
{
	"name": "ingeniux-cms-mcp-server",
	"version": "1.0.25",
	"description": "Production-ready Ingeniux CMS MCP server with OAuth authentication",
	"main": "dist/index.js",
	"type": "module",
	"bin": {
		"ingeniux-cms-mcp-server": "./dist/index.js"
	},
	"files": ["dist", "docs", "install.sh", "install.ps1"],
	"keywords": ["mcp", "ingeniux", "cms", "oauth", "api", "model-context-protocol"],
	"repository": {
		"type": "git",
		"url": "https://github.com/ingeniux/ingeniux-cms-mcp-server.git"
	},
	"license": "MIT"
}
```

### 2. MCP Server Compliance

#### Entry Point Standards
- Must export compliant MCP server
- Implements MCP protocol 1.0.0+
- Proper tool registration
- Error handling and validation
- Environment configuration support

#### Tool Registration Format
```typescript
{
	name: "tool_name",
	description: "Clear tool description",
	inputSchema: {
		type: "object",
		properties: { /* validated properties */ }
	}
}
```

### 3. Documentation Requirements

#### README.md Structure
1. **Project Description** - Clear MCP server purpose
2. **Installation** - Step-by-step setup instructions
3. **Configuration** - Environment variables and setup
4. **Usage** - Tool examples and integration
5. **Authentication** - OAuth setup instructions
6. **Tools Available** - Complete tool documentation
7. **Troubleshooting** - Common issues and solutions

#### Example Integration
```typescript
// Cursor MCP configuration
{
	"mcpServers": {
		"ingeniux-cms": {
			"command": "npx",
			"args": ["ingeniux-cms-mcp-server"],
			"env": {
				"CMS_BASE_URL": "https://your-cms.com/api",
				"OAUTH_CLIENT_ID": "your_client_id",
				"OAUTH_CLIENT_SECRET": "your_client_secret",
				"OAUTH_REDIRECT_URI": "http://localhost:3000/callback"
			}
		}
	}
}
```

### 4. Security Requirements

#### Authentication Standards
- OAuth 2.0 with PKCE implementation
- Encrypted token storage (AES-256)
- No hardcoded credentials
- Environment-based configuration
- Secure redirect URI validation

#### Input Validation
- All tool inputs validated
- Schema-based parameter checking
- SQL injection prevention
- XSS protection
- Rate limiting implementation

## Submission Process

### 1. Repository Preparation

#### Pre-submission Checklist
- [ ] Repository is public on GitHub
- [ ] All required files present
- [ ] README.md complete with examples
- [ ] License file included (MIT/Apache/etc.)
- [ ] Package.json properly configured
- [ ] Built distribution files included
- [ ] Environment example provided

#### Build Verification
```bash
npm run build
npm start  # Verify server starts
npm test   # Run test suite
```

### 2. Cursor.Directory Submission

#### Manual Submission Process
1. **Fork Repository** - Create cursor.directory fork
2. **Add Entry** - Create server entry in directory
3. **Submit PR** - Submit pull request with server details
4. **Review Process** - Wait for community review
5. **Approval** - Merge after validation

#### Automated Submission Script
```typescript
// scripts/submit-to-cursor-directory.ts
interface CursorDirectoryEntry {
	name: string;
	description: string;
	repository: string;
	category: string;
	tags: string[];
	author: string;
	license: string;
	version: string;
	mcpVersion: string;
}

async function submitToCursorDirectory(entry: CursorDirectoryEntry) {
	// 1. Validate repository structure
	// 2. Check MCP compliance
	// 3. Generate directory entry
	// 4. Create pull request
	// 5. Notify submission status
}
```

### 3. Directory Entry Format

#### Server Metadata
```json
{
	"name": "ingeniux-cms-mcp-server",
	"slug": "ingeniux-cms",
	"description": "Production-ready Ingeniux CMS MCP server with OAuth authentication",
	"repository": "https://github.com/ingeniux/ingeniux-cms-mcp-server",
	"category": "Content Management",
	"tags": ["cms", "content", "oauth", "api", "enterprise"],
	"author": "Ingeniux Corporation",
	"license": "MIT",
	"version": "1.0.25",
	"mcpVersion": "1.0.0",
	"installation": {
		"npm": "npm install -g ingeniux-cms-mcp-server",
		"npx": "npx ingeniux-cms-mcp-server"
	},
	"configuration": {
		"required": ["CMS_BASE_URL", "OAUTH_CLIENT_ID", "OAUTH_CLIENT_SECRET"],
		"optional": ["API_TIMEOUT", "LOG_LEVEL", "CACHE_TTL"]
	},
	"tools": [
		"health_check", "auth_status", "initiate_oauth",
		"cms_get_page", "cms_create_page", "cms_update_page",
		"cms_delete_page", "cms_list_pages", "cms_publish_page"
	]
}
```

## Implementation Strategy

### Phase 1: Repository Compliance
1. Verify package.json structure
2. Update README.md with cursor.directory format
3. Ensure build artifacts are current
4. Add license file if missing
5. Create comprehensive .env.example

### Phase 2: Submission Preparation
1. Create cursor.directory entry metadata
2. Generate installation instructions
3. Prepare submission pull request
4. Test integration with Cursor
5. Document troubleshooting steps

### Phase 3: Automated Submission
1. Build submission automation script
2. Implement validation checks
3. Create PR generation logic
4. Add submission status tracking
5. Setup continuous integration

## Validation Criteria

### Technical Requirements
- [ ] MCP protocol compliance (1.0.0+)
- [ ] Proper error handling
- [ ] Environment configuration
- [ ] Input validation
- [ ] Security implementation

### Documentation Standards
- [ ] Complete README.md
- [ ] Installation instructions
- [ ] Configuration examples
- [ ] Usage demonstrations
- [ ] Troubleshooting guide

### Repository Quality
- [ ] Public GitHub repository
- [ ] MIT/Apache license
- [ ] Semantic versioning
- [ ] Build automation
- [ ] Test coverage

## Success Metrics

### Submission Goals
- Repository accepted into cursor.directory
- Installation instructions validated
- Community feedback incorporated
- Download/usage metrics tracked
- Documentation quality verified

### Post-Submission
- Monitor user adoption
- Address reported issues
- Update documentation based on feedback
- Maintain compatibility with cursor updates
- Provide ongoing support