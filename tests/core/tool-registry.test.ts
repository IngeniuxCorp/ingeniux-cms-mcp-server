/**
 * Tool Registry Tests
 */

import { ToolRegistry } from '../../src/core/tool-registry';
import { MockFactories } from '../mocks/mock-factories';

// Mock error handler
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		})
	}
}));

describe('ToolRegistry', () => {
	let toolRegistry: ToolRegistry;
	let mockErrorHandler: any;

	beforeEach(() => {
		// Reset singleton for each test
		(ToolRegistry as any).instance = null;
		toolRegistry = ToolRegistry.getInstance();
		
		mockErrorHandler = jest.requireMock('../../src/utils/error-handler').errorHandler;
		jest.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = ToolRegistry.getInstance();
			const instance2 = ToolRegistry.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('registerTool', () => {
		it('should register valid tool', () => {
			const mockTool = MockFactories.createMCPTool();

			toolRegistry.registerTool(mockTool);

			expect(toolRegistry.hasTool(mockTool.name)).toBe(true);
			expect(toolRegistry.getToolCount()).toBe(1);
		});

		it('should validate tool structure', () => {
			expect(() => toolRegistry.registerTool(null as any)).toThrow('Tool is required');
			
			expect(() => toolRegistry.registerTool({} as any)).toThrow('Tool name is required');
			
			expect(() => toolRegistry.registerTool({
				name: 'test',
				description: '',
				handler: jest.fn(),
				inputSchema: { type: 'object' }
			} as any)).toThrow('Tool description is required');
			
			expect(() => toolRegistry.registerTool({
				name: 'test',
				description: 'Test tool',
				handler: null,
				inputSchema: { type: 'object' }
			} as any)).toThrow('Tool handler is required');
		});

		it('should prevent duplicate tool registration', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'duplicate_tool' });
			
			toolRegistry.registerTool(mockTool);
			
			expect(() => toolRegistry.registerTool(mockTool)).toThrow('Tool \'duplicate_tool\' is already registered');
		});

		it('should validate input schema type', () => {
			expect(() => toolRegistry.registerTool({
				name: 'test',
				description: 'Test tool',
				handler: jest.fn(),
				inputSchema: 'invalid' as any
			} as any)).toThrow('Tool input schema must be an object');
		});
	});

	describe('registerTools', () => {
		it('should register multiple tools', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'tool1' }),
				MockFactories.createMCPTool({ name: 'tool2' }),
				MockFactories.createMCPTool({ name: 'tool3' })
			];

			toolRegistry.registerTools(tools);

			expect(toolRegistry.getToolCount()).toBe(3);
			expect(toolRegistry.hasTool('tool1')).toBe(true);
			expect(toolRegistry.hasTool('tool2')).toBe(true);
			expect(toolRegistry.hasTool('tool3')).toBe(true);
		});

		it('should validate tools array', () => {
			expect(() => toolRegistry.registerTools(null as any)).toThrow('Tools must be an array');
			expect(() => toolRegistry.registerTools('invalid' as any)).toThrow('Tools must be an array');
		});

		it('should stop on first invalid tool', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'valid_tool' }),
				{ name: 'invalid_tool' } as any, // Missing required fields
				MockFactories.createMCPTool({ name: 'another_tool' })
			];

			expect(() => toolRegistry.registerTools(tools)).toThrow();
			expect(toolRegistry.getToolCount()).toBe(1); // Only first tool registered
		});
	});

	describe('getTool', () => {
		it('should return registered tool', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'test_tool' });
			toolRegistry.registerTool(mockTool);

			const result = toolRegistry.getTool('test_tool');

			expect(result).toBe(mockTool);
		});

		it('should return undefined for non-existent tool', () => {
			const result = toolRegistry.getTool('non_existent');

			expect(result).toBeUndefined();
		});

		it('should handle invalid input gracefully', () => {
			expect(toolRegistry.getTool(null as any)).toBeUndefined();
			expect(toolRegistry.getTool('' as any)).toBeUndefined();
			expect(toolRegistry.getTool(123 as any)).toBeUndefined();
		});
	});

	describe('hasTool', () => {
		it('should return true for existing tool', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'existing_tool' });
			toolRegistry.registerTool(mockTool);

			expect(toolRegistry.hasTool('existing_tool')).toBe(true);
		});

		it('should return false for non-existing tool', () => {
			expect(toolRegistry.hasTool('non_existing')).toBe(false);
		});

		it('should handle errors gracefully', () => {
			expect(toolRegistry.hasTool(null as any)).toBe(false);
		});
	});

	describe('listTools', () => {
		it('should return all registered tools', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'tool1' }),
				MockFactories.createMCPTool({ name: 'tool2' })
			];

			tools.forEach(tool => toolRegistry.registerTool(tool));

			const result = toolRegistry.listTools();

			expect(result).toHaveLength(2);
			expect(result).toContain(tools[0]);
			expect(result).toContain(tools[1]);
		});

		it('should return empty array when no tools registered', () => {
			const result = toolRegistry.listTools();

			expect(result).toEqual([]);
		});
	});

	describe('getToolNames', () => {
		it('should return all tool names', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'tool1' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'tool2' }));

			const result = toolRegistry.getToolNames();

			expect(result).toEqual(['tool1', 'tool2']);
		});
	});

	describe('executeTool', () => {
		it('should execute tool successfully', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Success' }]
			});
			const mockTool = MockFactories.createMCPTool({
				name: 'test_tool',
				handler: mockHandler
			});

			toolRegistry.registerTool(mockTool);

			const result = await toolRegistry.executeTool('test_tool', { param: 'value' });

			expect(mockHandler).toHaveBeenCalledWith({ param: 'value' });
			expect(result.content[0].text).toBe('Success');
		});

		it('should validate required parameters', async () => {
			const mockTool = MockFactories.createMCPTool({
				name: 'test_tool',
				inputSchema: {
					type: 'object',
					properties: { required_param: { type: 'string' } },
					required: ['required_param']
				}
			});

			toolRegistry.registerTool(mockTool);

			await toolRegistry.executeTool('test_tool', {});

			expect(mockErrorHandler.createErrorResult).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					operation: 'tool_execution',
					toolName: 'test_tool'
				})
			);
		});

		it('should handle tool not found', async () => {
			await toolRegistry.executeTool('non_existent', {});

			expect(mockErrorHandler.createErrorResult).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Tool \'non_existent\' not found'
				}),
				expect.any(Object)
			);
		});

		it('should handle tool execution errors', async () => {
			const mockHandler = jest.fn().mockRejectedValue(new Error('Tool error'));
			const mockTool = MockFactories.createMCPTool({
				name: 'failing_tool',
				handler: mockHandler
			});

			toolRegistry.registerTool(mockTool);

			await toolRegistry.executeTool('failing_tool', {});

			expect(mockErrorHandler.createErrorResult).toHaveBeenCalledWith(
				expect.any(Error),
				expect.objectContaining({
					operation: 'tool_execution',
					toolName: 'failing_tool'
				})
			);
		});
	});

	describe('removeTool', () => {
		it('should remove existing tool', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'removable_tool' });
			toolRegistry.registerTool(mockTool);

			const result = toolRegistry.removeTool('removable_tool');

			expect(result).toBe(true);
			expect(toolRegistry.hasTool('removable_tool')).toBe(false);
		});

		it('should return false for non-existing tool', () => {
			const result = toolRegistry.removeTool('non_existing');

			expect(result).toBe(false);
		});
	});

	describe('clearTools', () => {
		it('should remove all tools', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'tool1' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'tool2' }));

			toolRegistry.clearTools();

			expect(toolRegistry.getToolCount()).toBe(0);
			expect(toolRegistry.listTools()).toEqual([]);
		});
	});

	describe('getToolsByCategory', () => {
		it('should return tools by category prefix', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'cms_get_page' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'cms_create_page' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'auth_login' }));

			const cmsTools = toolRegistry.getToolsByCategory('cms');

			expect(cmsTools).toHaveLength(2);
			expect(cmsTools.every(tool => tool.name.startsWith('cms'))).toBe(true);
		});

		it('should handle invalid category gracefully', () => {
			expect(toolRegistry.getToolsByCategory(null as any)).toEqual([]);
			expect(toolRegistry.getToolsByCategory('')).toEqual([]);
		});
	});

	describe('searchTools', () => {
		it('should search tools by name and description', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({
				name: 'page_manager',
				description: 'Manage CMS pages'
			}));
			toolRegistry.registerTool(MockFactories.createMCPTool({
				name: 'user_auth',
				description: 'Handle user authentication'
			}));

			const pageTools = toolRegistry.searchTools('page');
			const authTools = toolRegistry.searchTools('auth');

			expect(pageTools).toHaveLength(1);
			expect(pageTools[0].name).toBe('page_manager');
			expect(authTools).toHaveLength(1);
			expect(authTools[0].name).toBe('user_auth');
		});

		it('should handle invalid search query', () => {
			expect(toolRegistry.searchTools(null as any)).toEqual([]);
			expect(toolRegistry.searchTools('')).toEqual([]);
		});
	});

	describe('getToolStats', () => {
		it('should return tool statistics', () => {
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'cms_get' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'cms_create' }));
			toolRegistry.registerTool(MockFactories.createMCPTool({ name: 'auth_login' }));

			const stats = toolRegistry.getToolStats();

			expect(stats.totalTools).toBe(3);
			expect(stats.categories.cms).toBe(2);
			expect(stats.categories.auth).toBe(1);
		});
	});

	describe('exportToolDefinitions', () => {
		it('should export tool definitions for MCP protocol', () => {
			const mockTool = MockFactories.createMCPTool({
				name: 'test_tool',
				description: 'Test tool',
				inputSchema: {
					type: 'object',
					properties: { param: { type: 'string' } }
				}
			});

			toolRegistry.registerTool(mockTool);

			const definitions = toolRegistry.exportToolDefinitions();

			expect(definitions).toHaveLength(1);
			expect(definitions[0]).toEqual({
				name: 'test_tool',
				description: 'Test tool',
				inputSchema: {
					type: 'object',
					properties: { param: { type: 'string' } }
				}
			});
		});

		it('should provide default schema for tools without inputSchema', () => {
			const mockTool = MockFactories.createMCPTool({
				name: 'no_schema_tool'
			});
			// Remove inputSchema to test default behavior
			delete (mockTool as any).inputSchema;

			toolRegistry.registerTool(mockTool);

			const definitions = toolRegistry.exportToolDefinitions();

			expect(definitions[0].inputSchema).toEqual({
				type: 'object',
				properties: {},
				additionalProperties: true
			});
		});
	});

	describe('validateAllTools', () => {
		it('should validate all registered tools', () => {
			const validTool = MockFactories.createMCPTool({ name: 'valid_tool' });
			toolRegistry.registerTool(validTool);

			// Manually add invalid tool to bypass validation
			(toolRegistry as any).tools.set('invalid_tool', { name: '' });

			const result = toolRegistry.validateAllTools();

			expect(result.valid).toContain('valid_tool');
			expect(result.invalid).toContain('invalid_tool');
		});
	});
});