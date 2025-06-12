/**
 * CLI Type Definitions
 */

import { OAuthConfig } from '../../types/config-types.js';
import { TokenData } from '../../types/api-types.js';

export interface CLIOptions {
	format: string;
	browser: boolean;
	timeout: string;
	verbose: boolean;
	help?: boolean;
	version?: boolean;
}

export interface CLIConfig {
	// OAuth configuration
	oauth: OAuthConfig;
	cmsBaseUrl: string;
	apiTimeout: number;
	
	// CLI-specific settings
	format: 'json' | 'table' | 'minimal';
	openBrowser: boolean;
	timeoutSeconds: number;
	verbose: boolean;
}

export interface AuthResult {
	success: boolean;
	tokens?: TokenData;
	message: string;
	error?: string;
}

export interface AuthFlowResult {
	authUrl: string;
	state: string;
	codeVerifier: string;
}

export interface TokenDisplayOptions {
	format: 'json' | 'table' | 'minimal';
	maskSensitive: boolean;
	includeInstructions: boolean;
}

export interface CLIError {
	code: string;
	message: string;
	suggestions: string[];
	recoverable: boolean;
}