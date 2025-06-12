/**
 * Duplicate Registration Regression Tests
 * Ensures existing functionality still works after duplicate registration fix
 */

import { ToolRegistry } from '../../src/core/tool-registry';
import { ContentTools } from '../../src/tools/content-tools';
import { MockFactories } from '../mocks/mock-factories';

// Mock dependencies
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		}),
		validateRequest: jest.fn()
	}
}));

jest.mock('../../src/auth/auth-middleware', () => ({
	authMiddleware: {
		isAuthenticated: jest.fn().mockResolvedValue(true),
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

jest.mock('../../src/utils/validators', () => ({
	Validators: {
		sanitizeString: jest.fn((str) => str),
		isValidFilePath: jest.fn().mockReturnValue(true),
		isValidDate: jest.fn().mockReturnValue(true),
		validatePagination: jest.fn((page, limit) => ({ page: page || 1, limit: limit || 20 }))
	}
}));

describe('Duplicate Registration Regression Tests', () => {
	let toolRegistry: ToolRegistry;
	let mockAPIClient: any;

	beforeEach(() => {
		// Reset singleton for each test
		(ToolRegistry as any).instance = null;
		toolRegistry = ToolRegistry.getInstance();
		
		// Mock API client
		mockAPIClient = {
			get: jest.fn().mockResolvedValue({ data: {} }),
			post: jest.fn().mockResolvedValue({ data: { id: 'test-id' } }),
			put: jest.fn().mockResolvedValue({ data: {} }),
			delete: jest.fn().mockResolvedValue({ data: {} })
		};
		
		jest.clearAllMocks();
	});

	describe('existing tool registration behavior', () => {
		it('should maintain backward compatibility with registerTool', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'legacy_tool' });

			// Original registerTool should still work
			expect(() => toolRegistry.registerTool(mockTool)).not.toThrow();
			expect(toolRegistry.hasTool('legacy_tool')).toBe(true);
		});

		it('should maintain backward compatibility with registerTools', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'legacy_tool1' }),
				MockFactories.createMCPTool({ name: 'legacy_tool2' })
			];

			// Original registerTools should still work
			expect(() => toolRegistry.registerTools(tools)).not.toThrow();
			expect(toolRegistry.getToolCount()).toBe(2);
		});

		it('should still throw errors for duplicate registration with original methods', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'duplicate_legacy' });

			toolRegistry.registerTool(mockTool);
			
			// Should still throw for duplicates with original method
			expect(() => toolRegistry.registerTool(mockTool)).toThrow(
				"Tool 'duplicate_legacy' is already registered"
			);
		});
	});

	// AuthTools functionality removed - class deleted in phases 1-2

	describe('content tools functionality regression', () => {
		it('should create all CMS tools correctly', () => {
			const contentTools = new ContentTools(mockAPIClient);
			const tools = contentTools.getTools();

			// Should have exactly 7 CMS tools (AuthTools integration removed)
			expect(tools.length).toBe(7);
			
			// Verify CMS tools are present
			const cmsToolNames = tools.map(t => t.name);
			expect(cmsToolNames).toContain('cms_get_page');
			expect(cmsToolNames).toContain('cms_create_page');
			expect(cmsToolNames).toContain('cms_update_page');
			expect(cmsToolNames).toContain('cms_delete_page');
			expect(cmsToolNames).toContain('cms_list_pages');
			expect(cmsToolNames).toContain('cms_publish_page');
			expect(cmsToolNames).toContain('cms_search_content');
		});

		it('should execute cms_get_page tool correctly', async () => {
			const contentTools = new ContentTools(mockAPIClient);
			const tools = contentTools.getTools();
			const getPageTool = tools.find(t => t.name === 'cms_get_page');

			expect(getPageTool).toBeDefined();
			
			const result = await getPageTool!.handler({ pageId: 'test-id' });
			expect(result.content).toBeDefined();
			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages/test-id', {});
		});

		it('should execute cms_create_page tool correctly', async () => {
			const contentTools = new ContentTools(mockAPIClient);
			const tools = contentTools.getTools();
			const createPageTool = tools.find(t => t.name === 'cms_create_page');

			expect(createPageTool).toBeDefined();
			
			const params = {
				title: 'Test Page',
				path: '/test-page',
				content: 'Test content'
			};
			
			const result = await createPageTool!.handler(params);
			expect(result.content).toBeDefined();
			expect(mockAPIClient.post).toHaveBeenCalledWith('/pages', expect.objectContaining({
				title: 'Test Page',
				path: '/test-page',
				content: 'Test content'
			}));
		});

		it('should execute cms_list_pages tool correctly', async () => {
			const contentTools = new ContentTools(mockAPIClient);
			const tools = contentTools.getTools();
			const listPagesTool = tools.find(t => t.name === 'cms_list_pages');

			expect(listPagesTool).toBeDefined();
			
			const result = await listPagesTool!.handler({ page: 1, limit: 10 });
			expect(result.content).toBeDefined();
			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages', expect.objectContaining({
				page: 1,
				limit: 10
			}));
		});
	});

	describe('tool registry core functionality regression', () => {
		it('should maintain tool execution functionality', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Success' }]
			});
			const mockTool = MockFactories.createMCPTool({
				name: 'execution_test',
				handler: mockHandler
			});

			toolRegistry.registerTool(mockTool);
			
			const result = await toolRegistry.executeTool('execution_test', { param: 'value' });
			
			expect(mockHandler).toHaveBeenCalledWith({ param: 'value' });
			expect(result.content[0].text).toBe('Success');
		});

		it('should maintain tool listing functionality', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'list_test1' }),
				MockFactories.createMCPTool({ name: 'list_test2' })
			];

			tools.forEach(tool => toolRegistry.registerTool(tool));
			
			const listedTools = toolRegistry.listTools();
			expect(listedTools).toHaveLength(2);
			expect(listedTools.map(t => t.name)).toEqual(['list_test1', 'list_test2']);
		});

		it('should maintain tool search functionality', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({
				name: 'search_test',
				description: 'A searchable test tool'
			}));

			const searchResults = toolRegistry.searchTools('searchable');
			expect(searchResults).toHaveLength(1);
			expect(searchResults[0].name).toBe('search_test');
		});

		it('should maintain tool categorization functionality', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'category_test1' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'category_test2' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'other_tool' }));

			const categoryTools = toolRegistry.getToolsByCategory('category');
			expect(categoryTools).toHaveLength(2);
			expect(categoryTools.every(t => t.name.startsWith('category'))).toBe(true);
		});

		it('should maintain tool statistics functionality', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'stats_test1' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'stats_test2' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'other_stat' }));

			const stats = toolRegistry.getToolStats();
			expect(stats.totalTools).toBe(3);
			expect(stats.categories.stats).toBe(2);
			expect(stats.categories.other).toBe(1);
		});
	});

	describe('error handling regression', () => {
		it('should maintain error handling for invalid tools', () => {
			expect(() => toolRegistry.registerTool(null as any)).toThrow('Tool is required');
			expect(() => toolRegistry.registerTool({} as any)).toThrow('Tool name is required');
		});

		it('should maintain error handling for tool execution', async () => {
			const mockHandler = jest.fn().mockRejectedValue(new Error('Tool error'));
			const mockTool = MockFactories.createMCPTool({
				name: 'error_test',
				handler: mockHandler
			});

			toolRegistry.registerTool(mockTool);
			
			const result = await toolRegistry.executeTool('error_test', {});
			expect(result.content[0].text).toBe('Error occurred');
		});

		it('should maintain error handling for non-existent tools', async () => {
			const result = await toolRegistry.executeTool('non_existent', {});
			expect(result.content[0].text).toBe('Error occurred');
		});
	});
});