/**
 * Configuration management for Ingeniux CMS MCP Server
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { ServerConfig, ValidationResult, EnvironmentVariables } from '../types/config-types.js';
import { toCamelCaseDeep } from './case-mapper.js';

// Load environment variables
config();

// Validation schema for configuration
const ConfigSchema = z.object({
    port: z.number().min(1).max(65535),
    host: z.string().min(1),
    cmsBaseUrl: z.string().url(),
    apiTimeout: z.number().min(1000),
    maxRetries: z.number().min(0).max(10),
    oauth: z.object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        authorizationUrl: z.string().url(),
        tokenUrl: z.string().url(),
        redirectUri: z.string().url(),
        scopes: z.array(z.string())
    }),
    cache: z.object({
        ttl: z.number().min(0),
        maxSize: z.number().min(1),
        evictionPolicy: z.string()
    }),
    logging: z.object({
        level: z.enum(['error', 'warn', 'info', 'debug']),
        format: z.string(),
        destination: z.string()
    }),
    rateLimitRpm: z.number().min(1)
});

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ServerConfig | null = null;

    private constructor() { }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Load configuration from environment variables and defaults
     */
    public loadConfiguration(): ServerConfig {
        try {
            const env = process.env as EnvironmentVariables;

            // Build configuration object
            const configData = {
                port: parseInt(env.PORT || '3000', 10),
                host: env.HOST || 'localhost',
                cmsBaseUrl: env.CMS_BASE_URL || '',
                apiTimeout: parseInt(env.API_TIMEOUT || '30000', 10),
                maxRetries: parseInt(env.MAX_RETRIES || '3', 10),
                oauth: {
                    clientId: env.OAUTH_CLIENT_ID || '',
                    clientSecret: env.OAUTH_CLIENT_SECRET || '',
                    authorizationUrl: this.buildOAuthUrl(env.CMS_BASE_URL, 'auth'),
                    tokenUrl: this.buildOAuthUrl(env.CMS_BASE_URL, 'token'),
                    redirectUri: env.OAUTH_REDIRECT_URI || 'http://localhost:3000/callback',
                    scopes: ['read', 'write']
                },
                cache: {
                    ttl: parseInt(env.CACHE_TTL || '300', 10),
                    maxSize: 1000,
                    evictionPolicy: 'lru'
                },
                logging: {
                    level: env.LOG_LEVEL || 'info',
                    format: 'json',
                    destination: 'console'
                },
                rateLimitRpm: parseInt(env.RATE_LIMIT_RPM || '100', 10)
            };

            // If configData is loaded from a flattened schema, map to camelCase
            const camelConfig = toCamelCaseDeep(configData) as ServerConfig;

            console.log('Loaded configuration:', camelConfig);

            // Validate configuration
            const validation = this.validateConfig(camelConfig);
            if (!validation.isValid) {
                throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            this.config = camelConfig;
            return this.config;
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Validate configuration against schema
     */
    public validateConfig(config: any): ValidationResult {
        try {
            ConfigSchema.parse(config);
            return { isValid: true, errors: [] };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
                return { isValid: false, errors };
            }
            return { isValid: false, errors: ['Unknown validation error'] };
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): ServerConfig {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfiguration() first.');
        }
        return this.config;
    }

    /**
     * Check if required environment variables are present
     */
    public checkRequiredEnvVars(): ValidationResult {
        const required = ['CMS_BASE_URL', 'OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET'];
        const missing: string[] = [];

        for (const envVar of required) {
            if (!process.env[envVar]) {
                missing.push(envVar);
            }
        }

        if (missing.length > 0) {
            return {
                isValid: false,
                errors: [`Missing required environment variables: ${missing.join(', ')}`]
            };
        }

        return { isValid: true, errors: [] };
    }

    /**
     * Build OAuth URL from base CMS URL
     */
    private buildOAuthUrl(baseUrl: string | undefined, endpoint: string): string {
        if (!baseUrl) {
            return '';
        }

        try {
            const url = new URL(baseUrl);

            // Extract base path by removing '/api' suffix if present
            let basePath = url.pathname;

            // Remove trailing slash if present
            if (basePath.endsWith('/')) {
                basePath = basePath.slice(0, -1);
            }

            // Remove '/api' suffix if present
            if (basePath.endsWith('/api')) {
                basePath = basePath.slice(0, -4);
            }

            // Construct OAuth URL with proper base path
            url.pathname = `${basePath}/oauth/${endpoint}`;
            return url.toString();
        } catch {
            return '';
        }
    }

    /**
     * Get configuration value by path
     */
    public getConfigValue<T>(path: string): T | undefined {
        if (!this.config) {
            return undefined;
        }

        const keys = path.split('.');
        let value: any = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value as T;
    }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();