/**
 * Error handling utilities for Ingeniux CMS MCP Server
 */

import { MCPError, ToolResult } from '../types/mcp-types.js';
import { APIError } from '../types/api-types.js';

export enum ErrorType {
	AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	API_ERROR = 'API_ERROR',
	NETWORK_ERROR = 'NETWORK_ERROR',
	CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
	TOOL_ERROR = 'TOOL_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
	operation?: string;
	toolName?: string;
	userId?: string;
	requestId?: string;
	timestamp: Date;
}

export class ErrorHandler {
	private static instance: ErrorHandler;

	private constructor() {}

	public static getInstance(): ErrorHandler {
		if (!ErrorHandler.instance) {
			ErrorHandler.instance = new ErrorHandler();
		}
		return ErrorHandler.instance;
	}

	/**
	 * Handle and format errors for MCP responses
	 */
	public handleError(error: unknown, context?: ErrorContext): MCPError {
		try {
			const errorType = this.determineErrorType(error);
			const errorMessage = this.extractErrorMessage(error);
			const errorCode = this.getErrorCode(errorType);

			// Log error with context
			this.logError(error, errorType, context);

			return {
				code: errorCode,
				message: this.formatUserFriendlyMessage(errorType, errorMessage),
				data: {
					type: errorType,
					originalMessage: errorMessage,
					context: context || {},
					timestamp: new Date().toISOString()
				}
			};
		} catch (handlingError) {
			// Fallback error handling
			return {
				code: -32603,
				message: 'Internal server error occurred while processing request',
				data: {
					type: ErrorType.UNKNOWN_ERROR,
					timestamp: new Date().toISOString()
				}
			};
		}
	}

	/**
	 * Create error tool result
	 */
	public createErrorResult(error: unknown, context?: ErrorContext): ToolResult {
		try {
			const mcpError = this.handleError(error, context);
			
			return {
				content: [{
					type: 'text',
					text: `Error: ${mcpError.message}`
				}],
				isError: true
			};
		} catch {
			return {
				content: [{
					type: 'text',
					text: 'An unexpected error occurred while processing your request.'
				}],
				isError: true
			};
		}
	}

	/**
	 * Determine error type from error object
	 */
	private determineErrorType(error: unknown): ErrorType {
		if (!error) {
			return ErrorType.UNKNOWN_ERROR;
		}

		if (typeof error === 'object') {
			const err = error as any;

			// Check for authentication errors
			if (err.status === 401 || err.code === 'UNAUTHORIZED' || 
				err.message?.includes('authentication') || err.message?.includes('token')) {
				return ErrorType.AUTHENTICATION_ERROR;
			}

			// Check for validation errors
			if (err.status === 400 || err.code === 'VALIDATION_ERROR' ||
				err.name === 'ValidationError' || err.message?.includes('validation')) {
				return ErrorType.VALIDATION_ERROR;
			}

			// Check for API errors
			if (err.status >= 400 && err.status < 500) {
				return ErrorType.API_ERROR;
			}

			// Check for network errors
			if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' ||
				err.code === 'ETIMEDOUT' || err.message?.includes('network')) {
				return ErrorType.NETWORK_ERROR;
			}

			// Check for configuration errors
			if (err.message?.includes('configuration') || err.message?.includes('config')) {
				return ErrorType.CONFIGURATION_ERROR;
			}
		}

		return ErrorType.UNKNOWN_ERROR;
	}

	/**
	 * Extract error message from various error types
	 */
	private extractErrorMessage(error: unknown): string {
		if (!error) {
			return 'Unknown error occurred';
		}

		if (typeof error === 'string') {
			return error;
		}

		if (typeof error === 'object') {
			const err = error as any;
			
			// Try different message properties
			if (err.message) {
				return err.message;
			}
			
			if (err.error && typeof err.error === 'string') {
				return err.error;
			}
			
			if (err.statusText) {
				return err.statusText;
			}
		}

		return 'Unknown error occurred';
	}

	/**
	 * Get MCP error code for error type
	 */
	private getErrorCode(errorType: ErrorType): number {
		switch (errorType) {
			case ErrorType.AUTHENTICATION_ERROR:
				return -32001;
			case ErrorType.VALIDATION_ERROR:
				return -32602;
			case ErrorType.API_ERROR:
				return -32603;
			case ErrorType.NETWORK_ERROR:
				return -32604;
			case ErrorType.CONFIGURATION_ERROR:
				return -32605;
			case ErrorType.TOOL_ERROR:
				return -32606;
			default:
				return -32603;
		}
	}

	/**
	 * Format user-friendly error message
	 */
	private formatUserFriendlyMessage(errorType: ErrorType, originalMessage: string): string {
		switch (errorType) {
			case ErrorType.AUTHENTICATION_ERROR:
				return 'Authentication failed. Please check your credentials and try again.';
			case ErrorType.VALIDATION_ERROR:
				return `Invalid input parameters: ${originalMessage}`;
			case ErrorType.API_ERROR:
				return `API request failed: ${originalMessage}`;
			case ErrorType.NETWORK_ERROR:
				return 'Network connection error. Please check your connection and try again.';
			case ErrorType.CONFIGURATION_ERROR:
				return `Configuration error: ${originalMessage}`;
			case ErrorType.TOOL_ERROR:
				return `Tool execution failed: ${originalMessage}`;
			default:
				return 'An unexpected error occurred. Please try again later.';
		}
	}

	/**
	 * Log error with context
	 */
	private logError(error: unknown, errorType: ErrorType, context?: ErrorContext): void {
		try {
			const logData = {
				errorType,
				error: error instanceof Error ? {
					name: error.name,
					message: error.message,
					stack: error.stack
				} : error,
				context: context || {},
				timestamp: new Date().toISOString()
			};

			// In a real implementation, this would use the logger
			// For now, we'll use console as fallback
			if (typeof console !== 'undefined') {
				console.error('Error occurred:', logData);
			}
		} catch {
			// Silent fail for logging errors
		}
	}

	/**
	 * Validate request parameters
	 */
	public validateRequest(params: any, requiredFields: string[]): void {
		if (!params || typeof params !== 'object') {
			throw new Error('Request parameters are required');
		}

		const missing: string[] = [];
		
		for (const field of requiredFields) {
			if (!(field in params) || params[field] === null || params[field] === undefined) {
				missing.push(field);
			}
		}

		if (missing.length > 0) {
			throw new Error(`Missing required parameters: ${missing.join(', ')}`);
		}
	}

	/**
	 * Create API error from response
	 */
	public createAPIError(status: number, message: string, details?: any): APIError {
		return {
			message,
			status,
			details,
			code: `HTTP_${status}`
		};
	}

	/**
	 * Check if error is retryable
	 */
	public isRetryableError(error: unknown): boolean {
		if (!error || typeof error !== 'object') {
			return false;
		}

		const err = error as any;
		
		// Network errors are usually retryable
		if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
			return true;
		}

		// 5xx HTTP errors are retryable
		if (err.status >= 500 && err.status < 600) {
			return true;
		}

		// Rate limiting is retryable
		if (err.status === 429) {
			return true;
		}

		return false;
	}
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();