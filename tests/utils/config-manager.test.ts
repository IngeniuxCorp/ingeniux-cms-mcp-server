/**
 * Configuration Manager Tests
 */

import { ConfigManager } from '../../src/utils/config-manager';
import { MockFactories } from '../mocks/mock-factories';

describe('ConfigManager', () => {
	let configManager: ConfigManager;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		// Reset singleton for each test
		(ConfigManager as any).instance = null;
		configManager = ConfigManager.getInstance();

		// Save original environment
		originalEnv = { ...process.env };

		// Set test environment variables
		const testEnv = MockFactories.createEnvironmentVariables();
		Object.assign(process.env, testEnv);
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
	});

	describe('getInstance', () => {
		it('should create singleton instance', () => {
			const instance1 = ConfigManager.getInstance();
			const instance2 = ConfigManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('loadConfiguration', () => {
		it('should load configuration from environment variables', () => {
			const config = configManager.loadConfiguration();

			expect(config).toEqual({
				port: 3000,
				host: 'localhost',
				cmsBaseUrl: 'https://test-cms.example.com',
				apiTimeout: 5000,
				maxRetries: 2,
				oauth: {
					clientId: 'test-client-id',
					clientSecret: 'test-client-secret',
					authorizationUrl: 'https://test-cms.example.com/oauth/authorize',
					tokenUrl: 'https://test-cms.example.com/oauth/token',
					redirectUri: 'http://localhost:3000/callback',
					scopes: ['read', 'write']
				},
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
				rateLimitRpm: 100
			});
		});

		it('should use default values when environment variables missing', () => {
			// Clear environment variables
			delete process.env.PORT;
			delete process.env.HOST;
			delete process.env.API_TIMEOUT;

			const config = configManager.loadConfiguration();

			expect(config.port).toBe(3000); // Default port
			expect(config.host).toBe('localhost'); // Default host
			expect(config.apiTimeout).toBe(30000); // Default timeout
		});

		it('should validate configuration', () => {
			// Set invalid port
			process.env.PORT = '99999';

			expect(() => configManager.loadConfiguration()).toThrow('Configuration validation failed');
		});

		it('should handle missing required environment variables', () => {
			delete process.env.CMS_BASE_URL;

			expect(() => configManager.loadConfiguration()).toThrow('Configuration validation failed');
		});

		it('should build OAuth URLs from base URL', () => {
			process.env.CMS_BASE_URL = 'https://custom-cms.example.com';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://custom-cms.example.com/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://custom-cms.example.com/oauth/token');
		});

		it('should handle invalid base URL gracefully', () => {
			process.env.CMS_BASE_URL = 'invalid-url';

			expect(() => configManager.loadConfiguration()).toThrow('Configuration validation failed');
		});
	});

	describe('validateConfig', () => {
		it('should validate valid configuration', () => {
			const validConfig = MockFactories.createServerConfig();

			const result = configManager.validateConfig(validConfig);

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should reject invalid port', () => {
			const invalidConfig = MockFactories.createServerConfig({
				port: 99999 // Invalid port
			});

			const result = configManager.validateConfig(invalidConfig);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain('port: Number must be less than or equal to 65535');
		});

		it('should reject invalid URL', () => {
			const invalidConfig = MockFactories.createServerConfig({
				cmsBaseUrl: 'not-a-url'
			});

			const result = configManager.validateConfig(invalidConfig);

			expect(result.isValid).toBe(false);
			expect(result.errors.some(error => error.includes('cmsBaseUrl'))).toBe(true);
		});

		it('should reject missing required fields', () => {
			const invalidConfig = {
				port: 3000
				// Missing other required fields
			};

			const result = configManager.validateConfig(invalidConfig);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it('should handle validation errors gracefully', () => {
			const result = configManager.validateConfig(null);

			expect(result.isValid).toBe(false);
			expect(result.errors).toContain(': Expected object, received null');
		});
	});

	describe('getConfig', () => {
		it('should return loaded configuration', () => {
			const loadedConfig = configManager.loadConfiguration();
			const retrievedConfig = configManager.getConfig();

			expect(retrievedConfig).toEqual(loadedConfig);
		});

		it('should throw error when configuration not loaded', () => {
			// Create new instance without loading config
			(ConfigManager as any).instance = null;
			const newManager = ConfigManager.getInstance();

			expect(() => newManager.getConfig()).toThrow('Configuration not loaded');
		});
	});

	describe('checkRequiredEnvVars', () => {
		it('should pass when all required variables present', () => {
			const result = configManager.checkRequiredEnvVars();

			expect(result.isValid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should fail when required variables missing', () => {
			delete process.env.CMS_BASE_URL;
			delete process.env.OAUTH_CLIENT_ID;

			const result = configManager.checkRequiredEnvVars();

			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain('Missing required environment variables');
			expect(result.errors[0]).toContain('CMS_BASE_URL');
			expect(result.errors[0]).toContain('OAUTH_CLIENT_ID');
		});

		it('should identify specific missing variables', () => {
			delete process.env.OAUTH_CLIENT_SECRET;

			const result = configManager.checkRequiredEnvVars();

			expect(result.isValid).toBe(false);
			expect(result.errors[0]).toContain('OAUTH_CLIENT_SECRET');
		});
	});

	describe('getConfigValue', () => {
		it('should return nested configuration values', () => {
			configManager.loadConfiguration();

			expect(configManager.getConfigValue('port')).toBe(3000);
			expect(configManager.getConfigValue('oauth.clientId')).toBe('test-client-id');
			expect(configManager.getConfigValue('cache.ttl')).toBe(300);
		});

		it('should return undefined for non-existent paths', () => {
			configManager.loadConfiguration();

			expect(configManager.getConfigValue('nonexistent')).toBeUndefined();
			expect(configManager.getConfigValue('oauth.nonexistent')).toBeUndefined();
		});

		it('should return undefined when config not loaded', () => {
			expect(configManager.getConfigValue('port')).toBeUndefined();
		});

		it('should handle deep nested paths', () => {
			configManager.loadConfiguration();

			expect(configManager.getConfigValue('oauth.scopes')).toEqual(['read', 'write']);
		});
	});

	describe('environment variable parsing', () => {
		it('should parse numeric environment variables', () => {
			process.env.PORT = '8080';
			process.env.API_TIMEOUT = '10000';
			process.env.MAX_RETRIES = '5';

			const config = configManager.loadConfiguration();

			expect(config.port).toBe(8080);
			expect(config.apiTimeout).toBe(10000);
			expect(config.maxRetries).toBe(5);
		});

		it('should handle invalid numeric values', () => {
			process.env.PORT = 'invalid';

			expect(() => configManager.loadConfiguration()).toThrow('Configuration validation failed');
		});

		it('should use custom redirect URI when provided', () => {
			process.env.OAUTH_REDIRECT_URI = 'https://custom.example.com/callback';

			const config = configManager.loadConfiguration();

			expect(config.oauth.redirectUri).toBe('https://custom.example.com/callback');
		});
	});

	describe('OAuth URL building', () => {
		it('should build OAuth URLs correctly', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/oauth/token');
		});

		it('should handle base URL with trailing slash', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/oauth/authorize');
		});

		it('should handle base URL with /api suffix', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/api';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/oauth/token');
		});

		it('should handle base URL with path and /api suffix', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/cxp4/api';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/cxp4/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/cxp4/oauth/token');
		});

		it('should handle base URL with path but no /api suffix', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/cxp4';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/cxp4/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/cxp4/oauth/token');
		});

		it('should handle base URL with /api suffix and trailing slash', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/api/';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/oauth/token');
		});

		it('should handle base URL with path, /api suffix, and trailing slash', () => {
			process.env.CMS_BASE_URL = 'https://cms.example.com/cxp4/api/';

			const config = configManager.loadConfiguration();

			expect(config.oauth.authorizationUrl).toBe('https://cms.example.com/cxp4/oauth/authorize');
			expect(config.oauth.tokenUrl).toBe('https://cms.example.com/cxp4/oauth/token');
		});

		it('should handle empty base URL', () => {
			process.env.CMS_BASE_URL = '';

			expect(() => configManager.loadConfiguration()).toThrow('Configuration validation failed');
		});
	});

	describe('error handling', () => {
		it('should handle configuration loading errors', () => {
			// Mock validation to throw error
			const originalValidate = configManager.validateConfig;
			configManager.validateConfig = jest.fn().mockImplementation(() => {
				throw new Error('Validation error');
			});

			expect(() => configManager.loadConfiguration()).toThrow('Failed to load configuration');

			// Restore original method
			configManager.validateConfig = originalValidate;
		});

		it('should provide detailed validation errors', () => {
			const invalidConfig = {
				port: -1,
				host: '',
				cmsBaseUrl: 'invalid',
				oauth: {
					clientId: '',
					scopes: 'invalid'
				}
			};

			const result = configManager.validateConfig(invalidConfig);

			expect(result.isValid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
			expect(result.errors.some(error => error.includes('port'))).toBe(true);
			expect(result.errors.some(error => error.includes('host'))).toBe(true);
		});
	});

	describe('configuration caching', () => {
		it('should cache loaded configuration', () => {
			const config1 = configManager.loadConfiguration();
			const config2 = configManager.getConfig();

			expect(config1).toBe(config2); // Same object reference
		});

		it('should reload configuration when called again', () => {
			const config1 = configManager.loadConfiguration();
			
			// Change environment
			process.env.PORT = '8080';
			
			const config2 = configManager.loadConfiguration();

			expect(config1.port).toBe(3000);
			expect(config2.port).toBe(8080);
		});
	});
});