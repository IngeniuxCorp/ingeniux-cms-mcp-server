/**
 * Tool Registry Safe Registration Tests
 * Tests for duplicate registration prevention and safe registration methods
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

describe('ToolRegistry Safe Registration', () => {
	let toolRegistry: ToolRegistry;
	let consoleSpy: jest.SpyInstance;

	beforeEach(() => {
		// Reset singleton for each test
		(ToolRegistry as any).instance = null;
		toolRegistry = ToolRegistry.getInstance();
		
		// Spy on console methods
		consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
		jest.spyOn(console, 'error').mockImplementation();
		jest.clearAllMocks();
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe('registerToolSafe', () => {
		it('should register new tool successfully', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'new_tool' });

			const result = toolRegistry.registerToolSafe(mockTool);

			expect(result).toBe(true);
			expect(toolRegistry.hasTool('new_tool')).toBe(true);
			expect(toolRegistry.getToolCount()).toBe(1);
		});

		it('should skip duplicate tool registration by default', () => {
			const mockTool = MockFactories.createMCPTool({ name: 'duplicate_tool' });
			
			// Register tool first time
			const firstResult = toolRegistry.registerToolSafe(mockTool);
			expect(firstResult).toBe(true);
			
			// Try to register same tool again
			const secondResult = toolRegistry.registerToolSafe(mockTool);
			
			expect(secondResult).toBe(false);
			expect(toolRegistry.getToolCount()).toBe(1);
			expect(console.warn).toHaveBeenCalledWith("Tool 'duplicate_tool' already exists, skipping registration");
		});

		it('should allow overwrite when allowOverwrite is true', () => {
			const originalTool = MockFactories.createMCPTool({ 
				name: 'overwrite_tool',
				description: 'Original description'
			});
			const updatedTool = MockFactories.createMCPTool({ 
				name: 'overwrite_tool',
				description: 'Updated description'
			});
			
			// Register original tool
			const firstResult = toolRegistry.registerToolSafe(originalTool);
			expect(firstResult).toBe(true);
			
			// Overwrite with updated tool
			const secondResult = toolRegistry.registerToolSafe(updatedTool, true);
			
			expect(secondResult).toBe(true);
			expect(toolRegistry.getToolCount()).toBe(1);
			expect(toolRegistry.getTool('overwrite_tool')?.description).toBe('Updated description');
			expect(console.warn).toHaveBeenCalledWith("Tool 'overwrite_tool' already exists, overwriting");
		});

		it('should handle invalid tool gracefully', () => {
			const result = toolRegistry.registerToolSafe(null as any);

			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to register tool safely: Tool is required')
			);
		});

		it('should handle tool validation errors gracefully', () => {
			const invalidTool = {
				name: '',
				description: 'Invalid tool',
				handler: jest.fn()
			} as any;

			const result = toolRegistry.registerToolSafe(invalidTool);

			expect(result).toBe(false);
			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to register tool safely:')
			);
		});
	});

	describe('registerToolsSafe', () => {
		it('should register multiple new tools successfully', () => {
			const tools = [
				MockFactories.createMCPTool({ name: 'tool1' }),
				MockFactories.createMCPTool({ name: 'tool2' }),
				MockFactories.createMCPTool({ name: 'tool3' })
			];

			const result = toolRegistry.registerToolsSafe(tools);

			expect(result.registered).toEqual(['tool1', 'tool2', 'tool3']);
			expect(result.skipped).toEqual([]);
			expect(result.errors).toEqual([]);
			expect(toolRegistry.getToolCount()).toBe(3);
		});

		it('should skip duplicate tools and register new ones', () => {
			const existingTool = MockFactories.createMCPTool({ name: 'existing_tool' });
			toolRegistry.registerTool(existingTool);

			const tools = [
				MockFactories.createMCPTool({ name: 'existing_tool' }), // Duplicate
				MockFactories.createMCPTool({ name: 'new_tool1' }),
				MockFactories.createMCPTool({ name: 'new_tool2' })
			];

			const result = toolRegistry.registerToolsSafe(tools);

			expect(result.registered).toEqual(['new_tool1', 'new_tool2']);
			expect(result.skipped).toEqual(['existing_tool']);
			expect(result.errors).toEqual([]);
			expect(toolRegistry.getToolCount()).toBe(3);
		});

		it('should handle mix of valid, duplicate, and invalid tools', () => {
			const existingTool = MockFactories.createMCPTool({ name: 'existing_tool' });
			toolRegistry.registerTool(existingTool);

			const tools = [
				MockFactories.createMCPTool({ name: 'valid_tool' }),
				MockFactories.createMCPTool({ name: 'existing_tool' }), // Duplicate
				{ name: '', description: 'Invalid', handler: jest.fn() } as any, // Invalid
				MockFactories.createMCPTool({ name: 'another_valid_tool' })
			];

			const result = toolRegistry.registerToolsSafe(tools);

			expect(result.registered).toEqual(['valid_tool', 'another_valid_tool']);
			expect(result.skipped).toEqual(['existing_tool', '']);
			expect(result.errors).toHaveLength(0);
			expect(toolRegistry.getToolCount()).toBe(3); // existing + 2 new valid tools
		});

		it('should allow overwrite when allowOverwrite is true', () => {
			const existingTool = MockFactories.createMCPTool({ 
				name: 'overwrite_tool',
				description: 'Original'
			});
			toolRegistry.registerTool(existingTool);

			const tools = [
				MockFactories.createMCPTool({ 
					name: 'overwrite_tool',
					description: 'Updated'
				}),
				MockFactories.createMCPTool({ name: 'new_tool' })
			];

			const result = toolRegistry.registerToolsSafe(tools, true);

			expect(result.registered).toEqual(['overwrite_tool', 'new_tool']);
			expect(result.skipped).toEqual([]);
			expect(result.errors).toEqual([]);
			expect(toolRegistry.getTool('overwrite_tool')?.description).toBe('Updated');
		});

		it('should handle invalid tools array', () => {
			const result = toolRegistry.registerToolsSafe(null as any);

			expect(result.registered).toEqual([]);
			expect(result.skipped).toEqual([]);
			expect(result.errors).toEqual(['Registration failed: Tools must be an array']);
		});

		it('should handle empty tools array', () => {
			const result = toolRegistry.registerToolsSafe([]);

			expect(result.registered).toEqual([]);
			expect(result.skipped).toEqual([]);
			expect(result.errors).toEqual([]);
		});
	});

	describe('logging behavior', () => {
		it('should log warnings for skipped duplicates', () => {
			const tool = MockFactories.createMCPTool({ name: 'logged_tool' });
			
			toolRegistry.registerToolSafe(tool);
			toolRegistry.registerToolSafe(tool); // Duplicate

			expect(console.warn).toHaveBeenCalledWith("Tool 'logged_tool' already exists, skipping registration");
		});

		it('should log warnings for overwrites', () => {
			const tool = MockFactories.createMCPTool({ name: 'overwrite_logged_tool' });
			
			toolRegistry.registerToolSafe(tool);
			toolRegistry.registerToolSafe(tool, true); // Overwrite

			expect(console.warn).toHaveBeenCalledWith("Tool 'overwrite_logged_tool' already exists, overwriting");
		});

		it('should log errors for registration failures', () => {
			const invalidTool = { name: null } as any;
			
			toolRegistry.registerToolSafe(invalidTool);

			expect(console.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to register tool safely:')
			);
		});
	});
});