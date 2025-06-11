/**
 * Configuration type definitions for Ingeniux CMS MCP Server
 */

export interface OAuthConfig {
	clientId: string;
	clientSecret: string;
	authorizationUrl: string;
	tokenUrl: string;
	redirectUri: string;
	scopes: string[];
}

export interface CacheConfig {
	ttl: number;
	maxSize: number;
	evictionPolicy: string;
}

export interface LoggingConfig {
	level: string;
	format: string;
	destination: string;
}

export interface ServerConfig {
	// Server settings
	port: number;
	host: string;
	
	// CMS connection
	cmsBaseUrl: string;
	apiTimeout: number;
	maxRetries: number;
	
	// OAuth configuration
	oauth: OAuthConfig;
	
	// Performance settings
	cache: CacheConfig;
	
	// Logging configuration
	logging: LoggingConfig;
	
	// Rate limiting
	rateLimitRpm: number;
}

export interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export interface EnvironmentVariables {
	CMS_BASE_URL?: string;
	OAUTH_CLIENT_ID?: string;
	OAUTH_CLIENT_SECRET?: string;
	OAUTH_REDIRECT_URI?: string;
	API_TIMEOUT?: string;
	MAX_RETRIES?: string;
	LOG_LEVEL?: string;
	CACHE_TTL?: string;
	RATE_LIMIT_RPM?: string;
	PORT?: string;
	HOST?: string;
}