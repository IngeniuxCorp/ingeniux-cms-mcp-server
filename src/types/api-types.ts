/**
 * API-related type definitions for Ingeniux CMS
 */

export interface TokenData {
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
	tokenType: string;
	scope: string | undefined;
}

export interface OAuthTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope?: string;
}

export interface APIRequest {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
	url: string;
	headers?: Record<string, string>;
	data?: any;
	params?: Record<string, any>;
	timeout?: number;
}

export interface APIResponse<T = any> {
	data: T;
	status: number;
	statusText: string;
	headers: Record<string, string>;
}

export interface APIError {
	message: string;
	status?: number;
	code?: string;
	details?: any;
}

export interface SwaggerEndpoint {
	path: string;
	method: string;
	operationId?: string;
	summary?: string;
	description?: string;
	parameters?: SwaggerParameter[];
	responses?: Record<string, SwaggerResponse>;
	tags?: string[];
}

export interface SwaggerParameter {
	name: string;
	in: 'query' | 'path' | 'header' | 'body';
	required?: boolean;
	type?: string;
	schema?: any;
	description?: string;
}

export interface SwaggerResponse {
	description: string;
	schema?: any;
	examples?: any;
}

export interface APISpecification {
	baseUrl: string;
	endpoints: SwaggerEndpoint[];
	version: string;
	title: string;
	description?: string;
}

export enum EndpointCategory {
	CONTENT_MANAGEMENT = 'content_management',
	USER_MANAGEMENT = 'user_management',
	ANALYTICS = 'analytics',
	SYSTEM_ADMIN = 'system_admin',
	WORKFLOW = 'workflow',
	PUBLISHING = 'publishing'
}

export interface CategorizedEndpoint {
	endpoint: SwaggerEndpoint;
	category: EndpointCategory;
	toolName: string;
}

export interface RateLimitInfo {
	limit: number;
	remaining: number;
	resetTime: Date;
}