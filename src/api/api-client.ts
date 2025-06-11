/**
 * HTTP API client for Ingeniux CMS with authentication integration
 */

import { APIRequest, APIResponse, APIError, RateLimitInfo } from '../types/api-types.js';
import { ServerConfig } from '../types/config-types.js';

export class APIClient {
	private static instance: APIClient;
	private config: ServerConfig;
	private rateLimitInfo: RateLimitInfo | null = null;

	private constructor(config: ServerConfig) {
		this.config = config;
	}

	public static getInstance(config: ServerConfig): APIClient {
		if (!APIClient.instance) {
			APIClient.instance = new APIClient(config);
		}
		return APIClient.instance;
	}

	/**
	 * Make authenticated API request
	 */
	public async request<T = any>(request: APIRequest): Promise<APIResponse<T>> {
		try {
			// Validate request
			this.validateRequest(request);

			// Check rate limits
			await this.checkRateLimit();

			// Prepare fetch options
			const url = this.buildUrl(request.url, request.params);
			const options: RequestInit = {
				method: request.method,
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'User-Agent': 'Ingeniux-CMS-MCP-Server/1.0.0',
					...request.headers
				},
				signal: AbortSignal.timeout(request.timeout || this.config.apiTimeout)
			};

			// Add body for non-GET requests
			if (request.data && request.method !== 'GET') {
				options.body = JSON.stringify(request.data);
			}

			// Make request with retry logic
			const response = await this.makeRequestWithRetry(url, options);

			// Extract rate limit info
			this.extractRateLimitInfo(response);

			// Parse response
			const data = await this.parseResponse<T>(response);

			return {
				data,
				status: response.status,
				statusText: response.statusText,
				headers: this.normalizeHeaders(response.headers)
			};
		} catch (error) {
			throw this.createAPIError(error);
		}
	}

	/**
	 * GET request
	 */
	public async get<T = any>(url: string, params?: any, headers?: Record<string, string>): Promise<APIResponse<T>> {
		return this.request<T>({
			method: 'GET',
			url,
			params,
			headers: headers || {}
		});
	}

	/**
	 * POST request
	 */
	public async post<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<APIResponse<T>> {
		return this.request<T>({
			method: 'POST',
			url,
			data,
			headers: headers || {}
		});
	}

	/**
	 * PUT request
	 */
	public async put<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<APIResponse<T>> {
		return this.request<T>({
			method: 'PUT',
			url,
			data,
			headers: headers || {}
		});
	}

	/**
	 * DELETE request
	 */
	public async delete<T = any>(url: string, headers?: Record<string, string>): Promise<APIResponse<T>> {
		return this.request<T>({
			method: 'DELETE',
			url,
			headers: headers || {}
		});
	}

	/**
	 * PATCH request
	 */
	public async patch<T = any>(url: string, data?: any, headers?: Record<string, string>): Promise<APIResponse<T>> {
		return this.request<T>({
			method: 'PATCH',
			url,
			data,
			headers: headers || {}
		});
	}

	/**
	 * Build full URL with query parameters
	 */
	private buildUrl(endpoint: string, params?: Record<string, any>): string {
		try {
			const baseUrl = this.config.cmsBaseUrl.replace(/\/$/, '');
			const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
			const url = new URL(`${baseUrl}${cleanEndpoint}`);

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (value !== null && value !== undefined) {
						url.searchParams.append(key, String(value));
					}
				});
			}

			return url.toString();
		} catch (error) {
			throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Make request with retry logic
	 */
	private async makeRequestWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
		try {
			const startTime = Date.now();
			const response = await fetch(url, options);

			// Log request
			const duration = Date.now() - startTime;
			this.logRequest(options.method || 'UNKNOWN', url, response.status, duration);

			// Check if response is ok
			if (!response.ok) {
				const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
				throw error;
			}

			return response;
		} catch (error) {
			// Check if error is retryable and we haven't exceeded max retries
			if (this.isRetryableError(error) && attempt < this.config.maxRetries) {
				// Calculate delay with exponential backoff
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
				
				// Wait before retry
				await this.sleep(delay);
				
				return this.makeRequestWithRetry(url, options, attempt + 1);
			}
			
			throw error;
		}
	}

	/**
	 * Parse response based on content type
	 */
	private async parseResponse<T>(response: Response): Promise<T> {
		try {
			const contentType = response.headers.get('content-type') || '';
			
			if (contentType.includes('application/json')) {
				return await response.json() as T;
			} else if (contentType.includes('text/')) {
				return await response.text() as unknown as T;
			} else {
				// For other content types, return as blob
				return await response.blob() as unknown as T;
			}
		} catch (error) {
			throw new Error(`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Validate API request
	 */
	private validateRequest(request: APIRequest): void {
		if (!request) {
			throw new Error('Request is required');
		}

		if (!request.method) {
			throw new Error('Request method is required');
		}

		if (!request.url) {
			throw new Error('Request URL is required');
		}

		// Validate HTTP method
		const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
		if (!validMethods.includes(request.method.toUpperCase())) {
			throw new Error(`Invalid HTTP method: ${request.method}`);
		}
	}

	/**
	 * Check rate limits before making request
	 */
	private async checkRateLimit(): Promise<void> {
		if (!this.rateLimitInfo) {
			return; // No rate limit info available
		}

		if (this.rateLimitInfo.remaining <= 0) {
			const now = new Date();
			const resetTime = this.rateLimitInfo.resetTime;
			
			if (now < resetTime) {
				const waitTime = resetTime.getTime() - now.getTime();
				throw new Error(`Rate limit exceeded. Reset in ${Math.ceil(waitTime / 1000)} seconds`);
			}
		}
	}

	/**
	 * Extract rate limit information from response headers
	 */
	private extractRateLimitInfo(response: Response): void {
		try {
			const limitHeader = response.headers.get('x-ratelimit-limit');
			const remainingHeader = response.headers.get('x-ratelimit-remaining');
			const resetHeader = response.headers.get('x-ratelimit-reset');
			
			if (limitHeader && remainingHeader) {
				const limit = parseInt(limitHeader, 10);
				const remaining = parseInt(remainingHeader, 10);
				
				let resetTime = new Date();
				if (resetHeader) {
					// Assume reset time is Unix timestamp
					resetTime = new Date(parseInt(resetHeader, 10) * 1000);
				}

				this.rateLimitInfo = {
					limit,
					remaining,
					resetTime
				};
			}
		} catch {
			// Ignore rate limit extraction errors
		}
	}

	/**
	 * Create API error from various error types
	 */
	private createAPIError(error: unknown): APIError {
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return {
				message: 'Network error: Unable to connect to server',
				code: 'NETWORK_ERROR'
			};
		}

		if (error instanceof Error) {
			// Check for HTTP errors
			const httpMatch = error.message.match(/HTTP (\d+):/);
			if (httpMatch) {
				const status = parseInt(httpMatch[1], 10);
				return {
					message: error.message,
					status,
					code: `HTTP_${status}`
				};
			}

			return {
				message: error.message,
				code: 'REQUEST_ERROR'
			};
		}

		return {
			message: 'Unknown API error occurred',
			code: 'UNKNOWN_ERROR'
		};
	}

	/**
	 * Check if error is retryable
	 */
	private isRetryableError(error: unknown): boolean {
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return true; // Network errors
		}

		if (error instanceof Error) {
			// Server errors (5xx) and rate limiting (429)
			const httpMatch = error.message.match(/HTTP (\d+):/);
			if (httpMatch) {
				const status = parseInt(httpMatch[1], 10);
				return status >= 500 || status === 429;
			}
		}

		return false;
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Log API request
	 */
	private logRequest(method: string, url: string, status?: number, duration?: number): void {
		try {
			// In a real implementation, this would use the logger
			// For now, we'll use console as fallback
			if (typeof console !== 'undefined') {
				const logData = {
					method,
					url,
					status,
					duration,
					timestamp: new Date().toISOString()
				};
				console.log('API Request:', logData);
			}
		} catch {
			// Silent fail for logging
		}
	}

	/**
	 * Normalize fetch headers to Record<string, string>
	 */
	private normalizeHeaders(headers: Headers): Record<string, string> {
		try {
			const normalized: Record<string, string> = {};
			
			headers.forEach((value, key) => {
				normalized[key] = value;
			});
			
			return normalized;
		} catch {
			return {};
		}
	}

	/**
	 * Get current rate limit info
	 */
	public getRateLimitInfo(): RateLimitInfo | null {
		return this.rateLimitInfo;
	}

	/**
	 * Update configuration
	 */
	public updateConfig(newConfig: ServerConfig): void {
		this.config = newConfig;
	}

	/**
	 * Get base URL
	 */
	public getBaseUrl(): string {
		return this.config.cmsBaseUrl;
	}
}