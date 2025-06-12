/**
 * Tool Registration Integration Tests
 * Tests for complete tool registration flow without duplicates
 */

import { MCPServer } from '../../src/core/mcp-server';
import { toolRegistry } from '../../src/core/tool-registry';
import { ContentTools } from '../../src/tools/content-tools';
import { APIClient } from '../../src/api/api-client';
import { MockFactories } from '../mocks/mock-factories';

// Mock dependencies
jest.mock('../../src/utils/config-manager', () => ({
	configManager: {
		loadConfiguration: jest.fn().mockReturnValue({
			port: 3000,
			host: 'localhost',
			cmsBaseUrl: 'https://test-cms.example.com',
			apiTimeout: 5000,
			maxRetries: 2,
			oauth: {
				clientId: 'test-client-id',
				clientSecret: 'test-client-secret',
				authorizationUrl: 'https://test-cms.example.com/oauth/authorize',
				tokenUrl: 'https://test-cms.example.com/oauth/token',
				redirectUri: 'http://localhost:3000/callback',
				scopes: ['read', 'write']
			},
			cache: {
				ttl: 300,
				maxSize: 1000,
				evictionPolicy: 'lru'
			},
			logging: {
				level: 'error',
				format: 'json',
				destination: 'console'
			},
			rateLimitRpm: 100
		})
	}
}));

jest.mock('../../src/utils/logger', () => ({
	logger: {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		close: jest.fn().mockResolvedValue(undefined)
	}
}));

jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		}),
		handleError: jest.fn(),
		validateRequest: jest.fn()
	}
}));

jest.mock('../../src/auth/auth-middleware', () => ({
	authMiddleware: {
		initialize: jest.fn(),
		isAuthenticated: jest.fn().mockResolvedValue(true),
		isAuthenticatedSync: jest.fn().mockReturnValue(true),
		processCallback: jest.fn().mockResolvedValue(true),
		refreshIfNeeded: jest.fn().mockResolvedValue(true),
		createAuthChallenge: jest.fn().mockReturnValue({
			authUrl: 'https://test.com/auth',
			state: 'test-state'
		}),
		getAuthStatus: jest.fn().mockReturnValue({
			isAuthenticated: true,
			tokenExpiry: new Date(Date.now() + 3600000)
		})
	}
}));

jest.mock('../../src/auth/oauth-manager', () => ({
	OAuthManager: {
		getInstance: jest.fn().mockReturnValue({
			logout: jest.fn(),
			updateConfig: jest.fn()
		})
	}
}));

jest.mock('../../src/api/api-client', () => ({
	APIClient: {
		getInstance: jest.fn().mockReturnValue({
			updateConfig: jest.fn(),
			get: jest.fn().mockResolvedValue({ data: {} }),
			post: jest.fn().mockResolvedValue({ data: {} }),
			put: jest.fn().mockResolvedValue({ data: {} }),
			delete: jest.fn().mockResolvedValue({ data: {} })
		})
	}
}));

describe('Tool Registration Integration', () => {
	let mcpServer: MCPServer;
	let mockAPIClient: any;
	let consoleSpy: jest.SpyInstance;

	beforeEach(() => {
		// Reset singletons
		(MCPServer as any).instance = null;
		(toolRegistry as any).tools.clear();
		
		mcpServer = MCPServer.getInstance();
		mockAPIClient = {
			get: jest.fn().mockResolvedValue({ data: {} }),
			post: jest.fn().mockResolvedValue({ data: {} }),
			put: jest.fn().mockResolvedValue({ data: {} }),
			delete: jest.fn().mockResolvedValue({ data: {} }),
			updateConfig: jest.fn()
		};
		
		// Mock APIClient.getInstance to return our mock
		(APIClient.getInstance as jest.Mock).mockReturnValue(mockAPIClient);
		
		// Spy on console methods
		consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
		jest.spyOn(console, 'error').mockImplementation();
		jest.clearAllMocks();
	});

	afterEach(() => {
		if (consoleSpy) {
			consoleSpy.mockRestore();
		}
	});

	describe('complete registration flow', () => {
		it('should register all tools without duplicates', async () => {
			// Start server which triggers tool registration
			await mcpServer.start();

			// Verify tools are registered
			const toolCount = toolRegistry.getToolCount();
			expect(toolCount).toBeGreaterThan(0);

			// Verify CMS tools are present
			expect(toolRegistry.hasTool('cms_get_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_create_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_update_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_delete_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_list_pages')).toBe(true);
			expect(toolRegistry.hasTool('cms_publish_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_search_content')).toBe(true);

			// Verify no duplicate warnings
			expect(console.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('already exists, skipping registration')
			);
		});

		it('should handle duplicate registration attempts gracefully', async () => {
			// Start server first time
			await mcpServer.start();
			const initialToolCount = toolRegistry.getToolCount();

			// Try to register tools again (simulate duplicate registration)
			const contentTools = new ContentTools(mockAPIClient);
			const tools = contentTools.getTools();
			const result = toolRegistry.registerToolsSafe(tools, false);

			// Should skip all duplicates
			expect(result.registered).toEqual([]);
			expect(result.skipped.length).toBeGreaterThan(0);
			expect(result.errors).toEqual([]);
			expect(toolRegistry.getToolCount()).toBe(initialToolCount);

			// Verify duplicate warnings were logged
			expect(console.warn).toHaveBeenCalledWith(
				expect.stringContaining('already exists, skipping registration')
			);
		});

		it('should register auth tools only once via ContentTools', async () => {
			// Start server (which registers ContentTools)
			await mcpServer.start();

			// Verify only CMS tools exist
			const allTools = toolRegistry.listTools();
			const cmsToolNames = [
				'cms_get_page',
				'cms_create_page',
				'cms_update_page',
				'cms_delete_page',
				'cms_list_pages',
				'cms_publish_page',
				'cms_search_content'
			];
			const cmsToolCount = allTools.filter(tool =>
				cmsToolNames.includes(tool.name)
			).length;
			expect(cmsToolCount).toBe(7);
		});

		it('should validate all registered tools are functional', async () => {
			await mcpServer.start();

			// Get all registered tools
			const tools = toolRegistry.listTools();
			expect(tools.length).toBeGreaterThan(0);

			// Validate each tool has required properties
			for (const tool of tools) {
				expect(tool.name).toBeTruthy();
				expect(tool.description).toBeTruthy();
				expect(typeof tool.handler).toBe('function');
				expect(tool.inputSchema).toBeDefined();
			}

			// Validate tool registry state
			const validation = toolRegistry.validateAllTools();
			expect(validation.invalid).toEqual([]);
			expect(validation.valid.length).toBe(tools.length);
		});
	});

	describe('error handling during registration', () => {
		it('should handle ContentTools registration errors', async () => {
			// Mock ContentTools to throw error
			const originalContentTools = ContentTools;
			(ContentTools as any) = class {
				constructor() {}
				getTools() {
					throw new Error('ContentTools error');
				}
			};

			try {
				await expect(mcpServer.start()).rejects.toThrow('Tool registration failed');
			} finally {
				// Restore original ContentTools
				(ContentTools as any) = originalContentTools;
			}
		});

		it('should handle partial registration failures', async () => {
			// Mock some tools to be invalid
			const mockInvalidTool = {
				name: '',
				description: 'Invalid tool',
				handler: null
			} as any;

			// Register mix of valid and invalid tools
			const tools = [
				MockFactories.createMCPTool({ name: 'valid_tool' }),
				mockInvalidTool,
				MockFactories.createMCPTool({ name: 'another_valid_tool' })
			];

			const result = toolRegistry.registerToolsSafe(tools);

			expect(result.registered).toEqual(['valid_tool', 'another_valid_tool']);
			expect(result.errors.length).toBe(0);
		});
	});

	describe('tool categorization and organization', () => {
		it('should properly categorize registered tools', async () => {
			await mcpServer.start();

			// Get tool statistics
			const stats = toolRegistry.getToolStats();
			expect(stats.totalTools).toBeGreaterThan(0);

			// Verify CMS tools category
			expect(stats.categories.cms).toBeGreaterThanOrEqual(1);
		});

		it('should allow searching for registered tools', async () => {
			await mcpServer.start();

			// Search for CMS tools
			const cmsTools = toolRegistry.searchTools('cms');
			expect(cmsTools.length).toBeGreaterThan(0);

			// Search for page management tools
			const pageTools = toolRegistry.searchTools('page');
			expect(pageTools.length).toBeGreaterThan(0);
		});
	});

	describe('server lifecycle with tool registration', () => {
		it('should register tools on start and clear on stop', async () => {
			// Start server
			await mcpServer.start();
			expect(toolRegistry.getToolCount()).toBeGreaterThan(0);

			// Stop server
			await mcpServer.stop();
			expect(toolRegistry.getToolCount()).toBe(0);
		});

		it('should handle multiple start/stop cycles', async () => {
			// First cycle
			await mcpServer.start();
			const firstCount = toolRegistry.getToolCount();
			await mcpServer.stop();
			expect(toolRegistry.getToolCount()).toBe(0);

			// Second cycle
			await mcpServer.start();
			const secondCount = toolRegistry.getToolCount();
			expect(secondCount).toBe(firstCount);
			await mcpServer.stop();
		});
	});
});