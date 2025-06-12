/**
 * Server Startup Tests
 * Tests for server startup without tool registration errors
 */

import { MCPServer } from '../../src/core/mcp-server';
import { toolRegistry } from '../../src/core/tool-registry';
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

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
	Server: jest.fn().mockImplementation(() => ({
		setRequestHandler: jest.fn(),
		connect: jest.fn().mockResolvedValue(undefined)
	}))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
	StdioServerTransport: jest.fn().mockImplementation(() => ({}))
}));

describe('Server Startup Tests', () => {
	let mcpServer: MCPServer;
	let mockLogger: any;

	beforeEach(() => {
		// Reset singletons
		(MCPServer as any).instance = null;
		(toolRegistry as any).tools.clear();
		
		mcpServer = MCPServer.getInstance();
		mockLogger = jest.requireMock('../../src/utils/logger').logger;
		
		jest.clearAllMocks();
	});

	describe('successful startup', () => {
		it('should start server without errors', async () => {
			await expect(mcpServer.start()).resolves.not.toThrow();
			
			// Verify server status
			const status = mcpServer.getStatus();
			expect(status.isRunning).toBe(true);
			expect(status.toolCount).toBeGreaterThan(0);
		});

		it('should log successful tool registration', async () => {
			await mcpServer.start();
			
			// Verify registration success logs
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining('registered')
			);
			expect(mockLogger.info).toHaveBeenCalledWith('Tools registered successfully');
			expect(mockLogger.info).toHaveBeenCalledWith('MCP server started successfully');
		});

		it('should register expected number of tools', async () => {
			await mcpServer.start();
			
			const toolCount = toolRegistry.getToolCount();
			
			// Should have auth tools (3) + CMS tools (7) = 10 total
			expect(toolCount).toBe(10);
			
			// Verify specific tools exist
			expect(toolRegistry.hasTool('health_check')).toBe(true);
			expect(toolRegistry.hasTool('auth_status')).toBe(true);
			expect(toolRegistry.hasTool('initiate_oauth')).toBe(true);
			expect(toolRegistry.hasTool('cms_get_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_create_page')).toBe(true);
			expect(toolRegistry.hasTool('cms_list_pages')).toBe(true);
		});

		it('should not log duplicate registration warnings on clean startup', async () => {
			await mcpServer.start();
			
			// Should not have any duplicate warnings
			expect(mockLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('duplicate')
			);
			expect(mockLogger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('skipping registration')
			);
		});
	});

	describe('startup error handling', () => {
		it('should handle configuration loading errors', async () => {
			const configManager = jest.requireMock('../../src/utils/config-manager').configManager;
			configManager.loadConfiguration.mockImplementationOnce(() => {
				throw new Error('Config load error');
			});

			await expect(mcpServer.start()).rejects.toThrow('Server startup failed: Config load error');
		});

		it('should handle OAuth manager initialization errors', async () => {
			const OAuthManager = jest.requireMock('../../src/auth/oauth-manager').OAuthManager;
			OAuthManager.getInstance.mockImplementationOnce(() => {
				throw new Error('OAuth init error');
			});

			await expect(mcpServer.start()).rejects.toThrow('Server startup failed: OAuth init error');
		});

		it('should handle API client initialization errors', async () => {
			const APIClient = jest.requireMock('../../src/api/api-client').APIClient;
			APIClient.getInstance.mockImplementationOnce(() => {
				throw new Error('API client error');
			});

			await expect(mcpServer.start()).rejects.toThrow('Server startup failed: API client error');
		});

		it('should handle tool registration errors', async () => {
			// Mock ContentTools to throw error during getTools()
			jest.doMock('../../src/tools/content-tools', () => ({
				ContentTools: jest.fn().mockImplementation(() => ({
					getTools: jest.fn().mockImplementation(() => {
						throw new Error('Tool creation error');
					})
				}))
			}));

			await expect(mcpServer.start()).rejects.toThrow('Tool registration failed');
		});
	});

	describe('startup idempotency', () => {
		it('should handle multiple start calls gracefully', async () => {
			await mcpServer.start();
			
			// Second start should not throw
			await expect(mcpServer.start()).resolves.not.toThrow();
			
			// Should log warning about already running
			expect(mockLogger.warn).toHaveBeenCalledWith('Server is already running');
		});

		it('should maintain consistent state across multiple starts', async () => {
			await mcpServer.start();
			const firstStatus = mcpServer.getStatus();
			
			await mcpServer.start(); // Second start
			const secondStatus = mcpServer.getStatus();
			
			expect(firstStatus).toEqual(secondStatus);
		});
	});

	describe('startup and shutdown cycle', () => {
		it('should complete full startup-shutdown cycle', async () => {
			// Start server
			await mcpServer.start();
			expect(mcpServer.getStatus().isRunning).toBe(true);
			expect(toolRegistry.getToolCount()).toBeGreaterThan(0);
			
			// Stop server
			await mcpServer.stop();
			expect(mcpServer.getStatus().isRunning).toBe(false);
			expect(toolRegistry.getToolCount()).toBe(0);
		});

		it('should handle multiple startup-shutdown cycles', async () => {
			// First cycle
			await mcpServer.start();
			const firstToolCount = toolRegistry.getToolCount();
			await mcpServer.stop();
			
			// Second cycle
			await mcpServer.start();
			const secondToolCount = toolRegistry.getToolCount();
			await mcpServer.stop();
			
			// Tool counts should be consistent
			expect(secondToolCount).toBe(firstToolCount);
		});
	});

	describe('tool registration validation', () => {
		it('should validate all registered tools after startup', async () => {
			await mcpServer.start();
			
			const validation = toolRegistry.validateAllTools();
			expect(validation.invalid).toEqual([]);
			expect(validation.valid.length).toBe(toolRegistry.getToolCount());
		});

		it('should export valid tool definitions after startup', async () => {
			await mcpServer.start();
			
			const definitions = toolRegistry.exportToolDefinitions();
			expect(definitions.length).toBe(toolRegistry.getToolCount());
			
			// Validate each definition
			definitions.forEach(def => {
				expect(def.name).toBeTruthy();
				expect(def.description).toBeTruthy();
				expect(def.inputSchema).toBeDefined();
			});
		});
	});

	describe('logging during startup', () => {
		it('should log startup progress', async () => {
			await mcpServer.start();
			
			// Verify key startup logs
			expect(mockLogger.info).toHaveBeenCalledWith('Configuration loaded successfully');
			expect(mockLogger.info).toHaveBeenCalledWith('OAuth manager initialized');
			expect(mockLogger.info).toHaveBeenCalledWith('API client initialized');
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringMatching(/Registered \d+ tools/)
			);
			expect(mockLogger.info).toHaveBeenCalledWith('MCP server started successfully');
		});

		it('should log tool registration details', async () => {
			await mcpServer.start();
			
			// Should log basic tools registration
			expect(mockLogger.info).toHaveBeenCalledWith(
				'Basic tools registered (auth tools handled by ContentTools)'
			);
			
			// Should log content tools registration
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringMatching(/Registered \d+ content management tools:/)
			);
		});
	});
});