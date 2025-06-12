/**
 * Content management tools for Ingeniux CMS
 */

import { MCPTool, ToolResult } from '../types/mcp-types.js';
import { APIClient } from '../api/api-client.js';
import { errorHandler } from '../utils/error-handler.js';
import { Validators } from '../utils/validators.js';
import { authMiddleware } from '../auth/auth-middleware.js';

export class ContentTools {
	private apiClient: APIClient;

	constructor(apiClient: APIClient) {
		this.apiClient = apiClient;
	}

	/**
	 * Wrap tool with authentication check
	 */
	private wrapToolWithAuth(tool: MCPTool): MCPTool {
		return {
			...tool,
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Step 1: Validate authentication
					const isAuthenticated = await authMiddleware.isAuthenticated();
					
					if (!isAuthenticated) {
						const authCode = await authMiddleware.getAuthCode();
						return {
							content: [{
								type: 'text',
								text: JSON.stringify({
									error: 'Authentication required',
									requiresAuth: true,
									authCode: authCode,
									message: 'Please complete OAuth authentication to use this tool'
								}, null, 2)
							}]
						};
					}

					// Step 2: Execute original tool
					return await tool.handler(params);
					
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'authentication_wrapper',
						toolName: tool.name,
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Get all content management tools with authentication wrapper
	 */
	public getTools(): MCPTool[] {
		const cmsTools = [
			this.createGetPageTool(),
			this.createCreatePageTool(),
			this.createUpdatePageTool(),
			this.createDeletePageTool(),
			this.createListPagesTool(),
			this.createPublishPageTool(),
			this.createSearchContentTool()
		];

		// Return only wrapped CMS tools
		return cmsTools.map(tool => this.wrapToolWithAuth(tool));
	}

	/**
	 * Create get page tool
	 */
	private createGetPageTool(): MCPTool {
		return {
			name: 'cms_get_page',
			description: 'Retrieve a specific page from the CMS by ID or path',
			inputSchema: {
				type: 'object',
				properties: {
					pageId: {
						type: 'string',
						description: 'The unique identifier of the page'
					},
					path: {
						type: 'string',
						description: 'The path of the page (alternative to pageId)'
					},
					includeContent: {
						type: 'boolean',
						description: 'Whether to include page content',
						default: true
					}
				},
				required: [],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate parameters
					if (!params.pageId && !params.path) {
						throw new Error('Either pageId or path is required');
					}

					// Build API endpoint
					let endpoint = '/pages';
					if (params.pageId) {
						endpoint += `/${params.pageId}`;
					} else if (params.path) {
						endpoint += `?path=${encodeURIComponent(params.path)}`;
					}

					// Add query parameters
					const queryParams: any = {};
					if (params.includeContent !== undefined) {
						queryParams.includeContent = params.includeContent;
					}

					// Make API request
					const response = await this.apiClient.get(endpoint, queryParams);

					return {
						content: [{
							type: 'text',
							text: JSON.stringify(response.data, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'get_page',
						toolName: 'cms_get_page',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create page creation tool
	 */
	private createCreatePageTool(): MCPTool {
		return {
			name: 'cms_create_page',
			description: 'Create a new page in the CMS',
			inputSchema: {
				type: 'object',
				properties: {
					title: {
						type: 'string',
						description: 'The title of the page'
					},
					path: {
						type: 'string',
						description: 'The URL path for the page'
					},
					content: {
						type: 'string',
						description: 'The content of the page'
					},
					template: {
						type: 'string',
						description: 'The template to use for the page'
					},
					parentId: {
						type: 'string',
						description: 'The ID of the parent page'
					},
					metadata: {
						type: 'object',
						description: 'Additional metadata for the page'
					}
				},
				required: ['title', 'path'],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate required parameters
					errorHandler.validateRequest(params, ['title', 'path']);

					// Validate path format
					if (!Validators.isValidFilePath(params.path)) {
						throw new Error('Invalid page path format');
					}

					// Prepare page data
					const pageData = {
						title: Validators.sanitizeString(params.title),
						path: params.path,
						content: params.content || '',
						template: params.template,
						parentId: params.parentId,
						metadata: params.metadata || {}
					};

					// Make API request
					const response = await this.apiClient.post('/pages', pageData);

					return {
						content: [{
							type: 'text',
							text: `Page created successfully. ID: ${response.data.id || 'Unknown'}`
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'create_page',
						toolName: 'cms_create_page',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create page update tool
	 */
	private createUpdatePageTool(): MCPTool {
		return {
			name: 'cms_update_page',
			description: 'Update an existing page in the CMS',
			inputSchema: {
				type: 'object',
				properties: {
					pageId: {
						type: 'string',
						description: 'The ID of the page to update'
					},
					title: {
						type: 'string',
						description: 'The new title of the page'
					},
					content: {
						type: 'string',
						description: 'The new content of the page'
					},
					metadata: {
						type: 'object',
						description: 'Updated metadata for the page'
					}
				},
				required: ['pageId'],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate required parameters
					errorHandler.validateRequest(params, ['pageId']);

					// Prepare update data
					const updateData: any = {};
					if (params.title) {
						updateData.title = Validators.sanitizeString(params.title);
					}
					if (params.content) {
						updateData.content = params.content;
					}
					if (params.metadata) {
						updateData.metadata = params.metadata;
					}

					// Make API request
					await this.apiClient.put(`/pages/${params.pageId}`, updateData);

					return {
						content: [{
							type: 'text',
							text: `Page updated successfully. ID: ${params.pageId}`
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'update_page',
						toolName: 'cms_update_page',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create page deletion tool
	 */
	private createDeletePageTool(): MCPTool {
		return {
			name: 'cms_delete_page',
			description: 'Delete a page from the CMS',
			inputSchema: {
				type: 'object',
				properties: {
					pageId: {
						type: 'string',
						description: 'The ID of the page to delete'
					},
					force: {
						type: 'boolean',
						description: 'Force deletion even if page has children',
						default: false
					}
				},
				required: ['pageId'],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate required parameters
					errorHandler.validateRequest(params, ['pageId']);

					// Build endpoint with query parameters
					let endpoint = `/pages/${params.pageId}`;
					if (params.force) {
						endpoint += '?force=true';
					}

					// Make API request
					await this.apiClient.delete(endpoint);

					return {
						content: [{
							type: 'text',
							text: `Page deleted successfully. ID: ${params.pageId}`
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'delete_page',
						toolName: 'cms_delete_page',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create list pages tool
	 */
	private createListPagesTool(): MCPTool {
		return {
			name: 'cms_list_pages',
			description: 'List pages in the CMS with optional filtering',
			inputSchema: {
				type: 'object',
				properties: {
					parentId: {
						type: 'string',
						description: 'Filter by parent page ID'
					},
					template: {
						type: 'string',
						description: 'Filter by template name'
					},
					page: {
						type: 'number',
						description: 'Page number for pagination',
						minimum: 1,
						default: 1
					},
					limit: {
						type: 'number',
						description: 'Number of items per page',
						minimum: 1,
						maximum: 100,
						default: 20
					}
				},
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate pagination
					const pagination = Validators.validatePagination(params.page, params.limit);

					// Build query parameters
					const queryParams: any = {
						page: pagination.page,
						limit: pagination.limit
					};

					if (params.parentId) {
						queryParams.parentId = params.parentId;
					}
					if (params.template) {
						queryParams.template = params.template;
					}

					// Make API request
					const response = await this.apiClient.get('/pages', queryParams);

					return {
						content: [{
							type: 'text',
							text: JSON.stringify(response.data, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'list_pages',
						toolName: 'cms_list_pages',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create publish page tool
	 */
	private createPublishPageTool(): MCPTool {
		return {
			name: 'cms_publish_page',
			description: 'Publish a page to make it live',
			inputSchema: {
				type: 'object',
				properties: {
					pageId: {
						type: 'string',
						description: 'The ID of the page to publish'
					},
					publishDate: {
						type: 'string',
						description: 'Schedule publish date (ISO format)',
						format: 'date-time'
					}
				},
				required: ['pageId'],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate required parameters
					errorHandler.validateRequest(params, ['pageId']);

					// Prepare publish data
					const publishData: any = {};
					if (params.publishDate) {
						if (!Validators.isValidDate(params.publishDate)) {
							throw new Error('Invalid publish date format');
						}
						publishData.publishDate = params.publishDate;
					}

					// Make API request
					await this.apiClient.post(`/pages/${params.pageId}/publish`, publishData);

					return {
						content: [{
							type: 'text',
							text: `Page published successfully. ID: ${params.pageId}`
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'publish_page',
						toolName: 'cms_publish_page',
						timestamp: new Date()
					});
				}
			}
		};
	}

	/**
	 * Create search content tool
	 */
	private createSearchContentTool(): MCPTool {
		return {
			name: 'cms_search_content',
			description: 'Search for content in the CMS',
			inputSchema: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description: 'Search query string'
					},
					type: {
						type: 'string',
						description: 'Content type to search',
						enum: ['page', 'asset', 'all']
					},
					page: {
						type: 'number',
						description: 'Page number for pagination',
						minimum: 1,
						default: 1
					},
					limit: {
						type: 'number',
						description: 'Number of results per page',
						minimum: 1,
						maximum: 50,
						default: 10
					}
				},
				required: ['query'],
				additionalProperties: false
			},
			handler: async (params: any): Promise<ToolResult> => {
				try {
					// Validate required parameters
					errorHandler.validateRequest(params, ['query']);

					// Validate pagination
					const pagination = Validators.validatePagination(params.page, params.limit);

					// Build query parameters
					const queryParams = {
						q: Validators.sanitizeString(params.query),
						type: params.type || 'all',
						page: pagination.page,
						limit: pagination.limit
					};

					// Make API request
					const response = await this.apiClient.get('/search', queryParams);

					return {
						content: [{
							type: 'text',
							text: JSON.stringify(response.data, null, 2)
						}]
					};
				} catch (error) {
					return errorHandler.createErrorResult(error, {
						operation: 'search_content',
						toolName: 'cms_search_content',
						timestamp: new Date()
					});
				}
			}
		};
	}
}