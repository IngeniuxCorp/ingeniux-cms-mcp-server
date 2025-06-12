/**
 * Core execution logic for get page tool
 */

import { APIClient } from '../../api/api-client.js';
import { ContentTools } from '../../tools/content-tools.js';
import { GetPageRequest, GetPageResult } from './get-page-types.js';
import { CLIConfig } from '../types/cli-types.js';
import { ServerConfig } from '../../types/config-types.js';
import { logger } from '../../utils/logger.js';
import { generateRequestId } from './request-utils.js';
import { GetPageValidator } from './get-page-validator.js';

export class GetPageExecutor {
	private apiClient: APIClient;
	private contentTools: ContentTools;
	private config: CLIConfig;
	
	constructor(config: CLIConfig) {
		this.config = config;
		this.apiClient = APIClient.getInstance(this.convertToServerConfig(config));
		this.contentTools = new ContentTools(this.apiClient);
	}
	
	public async execute(request: GetPageRequest): Promise<GetPageResult> {
		const requestId = generateRequestId();
		const startTime = Date.now();
		
		try {
			// Log request start
			if (this.config.verbose) {
				logger.info('Starting get page request', {
					requestId,
					pageId: request.pageId,
					path: request.path,
					includeContent: request.includeContent
				});
			}
			
			// Validate request
			this.validateRequest(request);
			
			// Get the cms_get_page tool
			const tools = this.contentTools.getTools();
			const getPageTool = tools.find(tool => tool.name === 'cms_get_page');
			
			if (!getPageTool) {
				throw new Error('cms_get_page tool not found');
			}
			
			// Prepare tool parameters
			const toolParams = this.prepareToolParameters(request);
			
			// Execute tool with timeout
			const toolResult = await this.executeWithTimeout(
				getPageTool.handler(toolParams),
				this.config.timeoutSeconds * 1000
			);
			
			// Process tool result
			const result = this.processToolResult(toolResult, requestId, startTime);
			
			// Log success
			if (this.config.verbose) {
				logger.info('Get page request completed', {
					requestId,
					success: result.success,
					duration: result.metadata.duration
				});
			}
			
			return result;
			
		} catch (error) {
			const duration = Date.now() - startTime;
			
			// Log error
			logger.error('Get page request failed', {
				requestId,
				error: error instanceof Error ? error.message : 'Unknown error',
				duration
			});
			
			// Return error result
			return {
				success: false,
				error: this.formatError(error),
				metadata: {
					requestId,
					timestamp: new Date(),
					duration,
					endpoint: this.buildEndpoint(request)
				}
			};
		}
	}
	
	private validateRequest(request: GetPageRequest): void {
		const errors = GetPageValidator.validateRequest(request);
		if (errors.length > 0) {
			const errorMessages = errors.map(e => e.message).join(', ');
			throw new Error(`Validation failed: ${errorMessages}`);
		}
	}
	
	private prepareToolParameters(request: GetPageRequest): any {
		const params: any = {
			includeContent: request.includeContent
		};
		
		if (request.pageId) {
			params.pageId = request.pageId;
		} else if (request.path) {
			params.path = request.path;
		}
		
		return params;
	}
	
	private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new Error(`Request timed out after ${timeoutMs}ms`));
			}, timeoutMs);
		});
		
		return Promise.race([promise, timeoutPromise]);
	}
	
	private processToolResult(toolResult: any, requestId: string, startTime: number): GetPageResult {
		const duration = Date.now() - startTime;
		
		try {
			// Check if tool result indicates success
			if (toolResult && toolResult.content && toolResult.content.length > 0) {
				// Parse JSON content if possible
				try {
					const data = JSON.parse(toolResult.content[0].text);
					return {
						success: true,
						data,
						metadata: {
							requestId,
							timestamp: new Date(),
							duration,
							endpoint: this.buildEndpointFromData(data)
						}
					};
				} catch (parseError) {
					// Return raw content if JSON parsing fails
					return {
						success: true,
						data: { rawContent: toolResult.content[0].text },
						metadata: {
							requestId,
							timestamp: new Date(),
							duration,
							endpoint: 'unknown'
						}
					};
				}
			} else {
				throw new Error('Empty or invalid tool result');
			}
		} catch (error) {
			throw new Error(`Failed to process tool result: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}
	
	private formatError(error: any): string {
		if (error instanceof Error) {
			return error.message;
		}
		if (typeof error === 'string') {
			return error;
		}
		return 'Unknown error occurred';
	}
	
	private buildEndpoint(request: GetPageRequest): string {
		try {
			if (request.pageId) {
				return `/pages/${request.pageId}`;
			}
			if (request.path) {
				return `/pages?path=${encodeURIComponent(request.path)}`;
			}
			return '/pages';
		} catch (error) {
			return '/pages';
		}
	}
	
	private buildEndpointFromData(data: any): string {
		try {
			if (data && data.id) {
				return `/pages/${data.id}`;
			}
			if (data && data.path) {
				return `/pages?path=${encodeURIComponent(data.path)}`;
			}
			return '/pages';
		} catch (error) {
			return '/pages';
		}
	}
	
	private convertToServerConfig(cliConfig: CLIConfig): ServerConfig {
		return {
			port: 3000,
			host: 'localhost',
			cmsBaseUrl: cliConfig.cmsBaseUrl,
			apiTimeout: cliConfig.apiTimeout,
			maxRetries: 3,
			oauth: cliConfig.oauth,
			cache: {
				ttl: 300,
				maxSize: 1000,
				evictionPolicy: 'lru'
			},
			logging: {
				level: cliConfig.verbose ? 'debug' : 'info',
				format: 'json',
				destination: 'console'
			},
			rateLimitRpm: 60
		};
	}
}