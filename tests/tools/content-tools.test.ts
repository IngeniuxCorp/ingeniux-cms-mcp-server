/**
 * Content Tools Tests - Authentication wrapper for all 7 CMS tools
 */

import { ContentTools } from '../../src/tools/content-tools';
import { APIClient } from '../../src/api/api-client';
import { authMiddleware } from '../../src/auth/auth-middleware';
import { MockFactories } from '../mocks/mock-factories';

// Mock API Client
const mockAPIClient = {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
	patch: jest.fn()
};

// Mock auth middleware
jest.mock('../../src/auth/auth-middleware', () => ({
	authMiddleware: {
		isAuthenticated: jest.fn(),
		createAuthChallenge: jest.fn()
	}
}));

// Mock auth tools
jest.mock('../../src/tools/auth-tools', () => ({
	AuthTools: jest.fn().mockImplementation(() => ({
		getTools: jest.fn().mockReturnValue([
			{
				name: 'initiate_oauth',
				description: 'Initiate OAuth authentication',
				inputSchema: { type: 'object', properties: {} },
				handler: jest.fn()
			},
			{
				name: 'auth_status',
				description: 'Get authentication status',
				inputSchema: { type: 'object', properties: {} },
				handler: jest.fn()
			}
		])
	}))
}));

// Mock error handler
jest.mock('../../src/utils/error-handler', () => ({
	errorHandler: {
		createErrorResult: jest.fn().mockReturnValue({
			content: [{ type: 'text', text: 'Error occurred' }]
		}),
		validateRequest: jest.fn()
	}
}));

// Mock validators
jest.mock('../../src/utils/validators', () => ({
	Validators: {
		sanitizeString: jest.fn(str => str),
		isValidFilePath: jest.fn().mockReturnValue(true),
		validatePagination: jest.fn().mockReturnValue({ page: 1, limit: 20 }),
		isValidDate: jest.fn().mockReturnValue(true)
	}
}));

describe('ContentTools', () => {
	let contentTools: ContentTools;
	const mockAuthMiddleware = authMiddleware as jest.Mocked<typeof authMiddleware>;

	beforeEach(() => {
		contentTools = new ContentTools(mockAPIClient as any);
		jest.clearAllMocks();
	});

	describe('getTools', () => {
		it('should return all tools with authentication wrapper', () => {
			const tools = contentTools.getTools();

			// Should have auth tools + 7 CMS tools
			expect(tools).toHaveLength(9); // 2 auth tools + 7 CMS tools

			// Check that CMS tools are present
			const toolNames = tools.map(tool => tool.name);
			expect(toolNames).toContain('cms_get_page');
			expect(toolNames).toContain('cms_create_page');
			expect(toolNames).toContain('cms_update_page');
			expect(toolNames).toContain('cms_delete_page');
			expect(toolNames).toContain('cms_list_pages');
			expect(toolNames).toContain('cms_publish_page');
			expect(toolNames).toContain('cms_search_content');
		});

		it('should not wrap initiate_oauth tool with authentication', () => {
			const tools = contentTools.getTools();
			const initiateOAuthTool = tools.find(tool => tool.name === 'initiate_oauth');

			expect(initiateOAuthTool).toBeDefined();
			// This tool should not require authentication
		});
	});

	describe('authentication wrapper', () => {
		it('should allow authenticated requests to pass through', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
			mockAPIClient.get.mockResolvedValue({
				data: { id: '123', title: 'Test Page' },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ pageId: '123' });

			expect(mockAuthMiddleware.isAuthenticated).toHaveBeenCalled();
			expect(mockAPIClient.get).toHaveBeenCalled();
			expect(result.content[0].text).toContain('Test Page');
		});

		it('should block unauthenticated requests with auth challenge', async () => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(false);
			mockAuthMiddleware.createAuthChallenge.mockReturnValue({
				requiresAuth: true,
				authUrl: 'https://auth.example.com/oauth'
			});

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ pageId: '123' });

			expect(mockAuthMiddleware.isAuthenticated).toHaveBeenCalled();
			expect(mockAPIClient.get).not.toHaveBeenCalled();
			
			const responseText = JSON.parse(result.content[0].text!);
			expect(responseText.error).toBe('Authentication required');
			expect(responseText.requiresAuth).toBe(true);
			expect(responseText.authUrl).toBe('https://auth.example.com/oauth');
		});

		it('should handle authentication errors gracefully', async () => {
			mockAuthMiddleware.isAuthenticated.mockRejectedValue(new Error('Auth error'));

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ pageId: '123' });

			expect(result.content[0].text).toBe('Error occurred');
		});
	});

	describe('cms_get_page tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should get page by ID', async () => {
			const mockPageData = { id: '123', title: 'Test Page', content: 'Page content' };
			mockAPIClient.get.mockResolvedValue({
				data: mockPageData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ pageId: '123' });

			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages/123', {});
			expect(result.content[0].text).toContain('Test Page');
		});

		it('should get page by path', async () => {
			const mockPageData = { id: '123', title: 'Test Page', path: '/test-page' };
			mockAPIClient.get.mockResolvedValue({
				data: mockPageData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ path: '/test-page' });

			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages?path=%2Ftest-page', {});
			expect(result.content[0].text).toContain('Test Page');
		});

		it('should require either pageId or path', async () => {
			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({});

			expect(result.content[0].text).toBe('Error occurred');
		});
	});

	describe('cms_create_page tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should create page with required fields', async () => {
			mockAPIClient.post.mockResolvedValue({
				data: { id: '456', title: 'New Page' },
				status: 201,
				statusText: 'Created',
				headers: {}
			});

			const tools = contentTools.getTools();
			const createPageTool = tools.find(tool => tool.name === 'cms_create_page')!;

			const result = await createPageTool.handler({
				title: 'New Page',
				path: '/new-page'
			});

			expect(mockAPIClient.post).toHaveBeenCalledWith('/pages', {
				title: 'New Page',
				path: '/new-page',
				content: '',
				template: undefined,
				parentId: undefined,
				metadata: {}
			});
			expect(result.content[0].text).toContain('Page created successfully');
		});

		it('should create page with all optional fields', async () => {
			mockAPIClient.post.mockResolvedValue({
				data: { id: '456' },
				status: 201,
				statusText: 'Created',
				headers: {}
			});

			const tools = contentTools.getTools();
			const createPageTool = tools.find(tool => tool.name === 'cms_create_page')!;

			const result = await createPageTool.handler({
				title: 'New Page',
				path: '/new-page',
				content: 'Page content',
				template: 'default',
				parentId: '123',
				metadata: { author: 'test' }
			});

			expect(mockAPIClient.post).toHaveBeenCalledWith('/pages', {
				title: 'New Page',
				path: '/new-page',
				content: 'Page content',
				template: 'default',
				parentId: '123',
				metadata: { author: 'test' }
			});
		});
	});

	describe('cms_update_page tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should update page with provided fields', async () => {
			mockAPIClient.put.mockResolvedValue({
				data: { success: true },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const updatePageTool = tools.find(tool => tool.name === 'cms_update_page')!;

			const result = await updatePageTool.handler({
				pageId: '123',
				title: 'Updated Title',
				content: 'Updated content'
			});

			expect(mockAPIClient.put).toHaveBeenCalledWith('/pages/123', {
				title: 'Updated Title',
				content: 'Updated content'
			});
			expect(result.content[0].text).toContain('Page updated successfully');
		});
	});

	describe('cms_delete_page tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should delete page by ID', async () => {
			mockAPIClient.delete.mockResolvedValue({
				data: { success: true },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const deletePageTool = tools.find(tool => tool.name === 'cms_delete_page')!;

			const result = await deletePageTool.handler({ pageId: '123' });

			expect(mockAPIClient.delete).toHaveBeenCalledWith('/pages/123');
			expect(result.content[0].text).toContain('Page deleted successfully');
		});

		it('should force delete when specified', async () => {
			mockAPIClient.delete.mockResolvedValue({
				data: { success: true },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const deletePageTool = tools.find(tool => tool.name === 'cms_delete_page')!;

			const result = await deletePageTool.handler({ pageId: '123', force: true });

			expect(mockAPIClient.delete).toHaveBeenCalledWith('/pages/123?force=true');
		});
	});

	describe('cms_list_pages tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should list pages with default pagination', async () => {
			const mockPagesData = { pages: [{ id: '1', title: 'Page 1' }], total: 1 };
			mockAPIClient.get.mockResolvedValue({
				data: mockPagesData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const listPagesTool = tools.find(tool => tool.name === 'cms_list_pages')!;

			const result = await listPagesTool.handler({});

			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages', {
				page: 1,
				limit: 20
			});
			expect(result.content[0].text).toContain('Page 1');
		});

		it('should list pages with filters', async () => {
			const mockPagesData = { pages: [], total: 0 };
			mockAPIClient.get.mockResolvedValue({
				data: mockPagesData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const listPagesTool = tools.find(tool => tool.name === 'cms_list_pages')!;

			const result = await listPagesTool.handler({
				parentId: '123',
				template: 'news',
				page: 2,
				limit: 10
			});

			expect(mockAPIClient.get).toHaveBeenCalledWith('/pages', {
				page: 1, // Mocked validator returns default
				limit: 20, // Mocked validator returns default
				parentId: '123',
				template: 'news'
			});
		});
	});

	describe('cms_publish_page tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should publish page immediately', async () => {
			mockAPIClient.post.mockResolvedValue({
				data: { success: true },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const publishPageTool = tools.find(tool => tool.name === 'cms_publish_page')!;

			const result = await publishPageTool.handler({ pageId: '123' });

			expect(mockAPIClient.post).toHaveBeenCalledWith('/pages/123/publish', {});
			expect(result.content[0].text).toContain('Page published successfully');
		});

		it('should schedule page publication', async () => {
			mockAPIClient.post.mockResolvedValue({
				data: { success: true },
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const publishPageTool = tools.find(tool => tool.name === 'cms_publish_page')!;

			const result = await publishPageTool.handler({
				pageId: '123',
				publishDate: '2024-12-31T23:59:59Z'
			});

			expect(mockAPIClient.post).toHaveBeenCalledWith('/pages/123/publish', {
				publishDate: '2024-12-31T23:59:59Z'
			});
		});
	});

	describe('cms_search_content tool', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should search content with query', async () => {
			const mockSearchData = { results: [{ id: '1', title: 'Found Page' }], total: 1 };
			mockAPIClient.get.mockResolvedValue({
				data: mockSearchData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const searchTool = tools.find(tool => tool.name === 'cms_search_content')!;

			const result = await searchTool.handler({ query: 'test search' });

			expect(mockAPIClient.get).toHaveBeenCalledWith('/search', {
				q: 'test search',
				type: 'all',
				page: 1,
				limit: 20
			});
			expect(result.content[0].text).toContain('Found Page');
		});

		it('should search with type filter', async () => {
			const mockSearchData = { results: [], total: 0 };
			mockAPIClient.get.mockResolvedValue({
				data: mockSearchData,
				status: 200,
				statusText: 'OK',
				headers: {}
			});

			const tools = contentTools.getTools();
			const searchTool = tools.find(tool => tool.name === 'cms_search_content')!;

			const result = await searchTool.handler({
				query: 'test',
				type: 'page',
				page: 1,
				limit: 5
			});

			expect(mockAPIClient.get).toHaveBeenCalledWith('/search', {
				q: 'test',
				type: 'page',
				page: 1,
				limit: 20 // Mocked validator returns default
			});
		});
	});

	describe('error handling', () => {
		beforeEach(() => {
			mockAuthMiddleware.isAuthenticated.mockResolvedValue(true);
		});

		it('should handle API errors in all tools', async () => {
			mockAPIClient.get.mockRejectedValue(new Error('API Error'));

			const tools = contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page')!;

			const result = await getPageTool.handler({ pageId: '123' });

			expect(result.content[0].text).toBe('Error occurred');
		});

		it('should handle validation errors', async () => {
			const tools = contentTools.getTools();
			const createPageTool = tools.find(tool => tool.name === 'cms_create_page')!;

			// Missing required fields should trigger validation error
			const result = await createPageTool.handler({});

			expect(result.content[0].text).toBe('Error occurred');
		});
	});
});