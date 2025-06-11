/**
 * Mock factories for test data generation
 */

import { TokenData, OAuthTokenResponse, APIResponse } from '../../src/types/api-types';
import { OAuthConfig, ServerConfig } from '../../src/types/config-types';
import { MCPTool, ToolResult } from '../../src/types/mcp-types';

export class MockFactories {
	static createTokenData(overrides: Partial<TokenData> = {}): TokenData {
		return {
			accessToken: 'mock-access-token',
			refreshToken: 'mock-refresh-token',
			expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
			tokenType: 'Bearer',
			scope: 'read write',
			...overrides
		};
	}

	static createExpiredTokenData(overrides: Partial<TokenData> = {}): TokenData {
		return {
			accessToken: 'expired-access-token',
			refreshToken: 'expired-refresh-token',
			expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
			tokenType: 'Bearer',
			scope: 'read write',
			...overrides
		};
	}

	static createOAuthConfig(overrides: Partial<OAuthConfig> = {}): OAuthConfig {
		return {
			clientId: 'test-client-id',
			clientSecret: 'test-client-secret',
			authorizationUrl: 'https://test-cms.example.com/oauth/authorize',
			tokenUrl: 'https://test-cms.example.com/oauth/token',
			redirectUri: 'http://localhost:3000/callback',
			scopes: ['read', 'write'],
			...overrides
		};
	}

	static createServerConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
		return {
			port: 3000,
			host: 'localhost',
			cmsBaseUrl: 'https://test-cms.example.com',
			apiTimeout: 5000,
			maxRetries: 2,
			oauth: this.createOAuthConfig(),
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
			rateLimitRpm: 100,
			...overrides
		};
	}

	static createOAuthTokenResponse(overrides: Partial<OAuthTokenResponse> = {}): OAuthTokenResponse {
		return {
			access_token: 'mock-access-token',
			refresh_token: 'mock-refresh-token',
			expires_in: 3600,
			token_type: 'Bearer',
			scope: 'read write',
			...overrides
		};
	}

	static createAPIResponse<T = any>(data: T, overrides: Partial<APIResponse<T>> = {}): APIResponse<T> {
		return {
			data,
			status: 200,
			statusText: 'OK',
			headers: {},
			...overrides
		};
	}

	static createMCPTool(overrides: Partial<MCPTool> = {}): MCPTool {
		return {
			name: 'test_tool',
			description: 'Test tool for unit testing',
			inputSchema: {
				type: 'object',
				properties: {
					param1: { type: 'string' }
				},
				required: ['param1']
			},
			handler: jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: 'Test result' }]
			}),
			...overrides
		};
	}

	static createToolResult(overrides: Partial<ToolResult> = {}): ToolResult {
		return {
			content: [
				{
					type: 'text',
					text: 'Mock tool result'
				}
			],
			...overrides
		};
	}

	static createAxiosError(status = 500, message = 'Internal Server Error') {
		const error = new Error(message) as any;
		error.isAxiosError = true;
		error.response = {
			status,
			statusText: message,
			data: { error: message },
			headers: {}
		};
		error.config = {
			method: 'GET',
			url: '/test',
			metadata: { startTime: Date.now() }
		};
		return error;
	}

	static createNetworkError() {
		const error = new Error('Network Error') as any;
		error.isAxiosError = true;
		error.code = 'ECONNREFUSED';
		error.config = {
			method: 'GET',
			url: '/test',
			metadata: { startTime: Date.now() }
		};
		return error;
	}

	static createRateLimitHeaders() {
		return {
			'x-ratelimit-limit': '100',
			'x-ratelimit-remaining': '50',
			'x-ratelimit-reset': Math.floor(Date.now() / 1000 + 3600).toString()
		};
	}

	static createEnvironmentVariables() {
		return {
			NODE_ENV: 'test',
			CMS_BASE_URL: 'https://test-cms.example.com',
			OAUTH_CLIENT_ID: 'test-client-id',
			OAUTH_CLIENT_SECRET: 'test-client-secret',
			OAUTH_REDIRECT_URI: 'http://localhost:3000/callback',
			API_TIMEOUT: '5000',
			MAX_RETRIES: '2',
			LOG_LEVEL: 'error',
			CACHE_TTL: '300',
			RATE_LIMIT_RPM: '100'
		};
	}
}