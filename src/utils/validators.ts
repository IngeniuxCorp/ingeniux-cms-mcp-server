/**
 * Input validation utilities for Ingeniux CMS MCP Server
 */

import { z } from 'zod';

export class Validators {
	/**
	 * Validate URL format
	 */
	public static isValidUrl(url: string): boolean {
		try {
			const urlSchema = z.string().url();
			urlSchema.parse(url);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate email format
	 */
	public static isValidEmail(email: string): boolean {
		try {
			const emailSchema = z.string().email();
			emailSchema.parse(email);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate required string field
	 */
	public static isValidString(value: any, minLength = 1): boolean {
		try {
			const stringSchema = z.string().min(minLength);
			stringSchema.parse(value);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate number within range
	 */
	public static isValidNumber(value: any, min?: number, max?: number): boolean {
		try {
			let numberSchema = z.number();
			
			if (min !== undefined) {
				numberSchema = numberSchema.min(min);
			}
			
			if (max !== undefined) {
				numberSchema = numberSchema.max(max);
			}
			
			numberSchema.parse(value);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate array with minimum length
	 */
	public static isValidArray(value: any, minLength = 0): boolean {
		try {
			const arraySchema = z.array(z.any()).min(minLength);
			arraySchema.parse(value);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Validate object has required properties
	 */
	public static hasRequiredProperties(obj: any, properties: string[]): boolean {
		if (!obj || typeof obj !== 'object') {
			return false;
		}

		for (const prop of properties) {
			if (!(prop in obj) || obj[prop] === null || obj[prop] === undefined) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Sanitize string input
	 */
	public static sanitizeString(input: string): string {
		if (typeof input !== 'string') {
			return '';
		}

		// Remove potentially dangerous characters
		return input
			.replace(/[<>]/g, '') // Remove angle brackets
			.replace(/javascript:/gi, '') // Remove javascript: protocol
			.replace(/on\w+=/gi, '') // Remove event handlers
			.trim();
	}

	/**
	 * Validate OAuth token format
	 */
	public static isValidToken(token: string): boolean {
		if (!token || typeof token !== 'string') {
			return false;
		}

		// Basic token format validation
		return token.length > 10 && /^[A-Za-z0-9._-]+$/.test(token);
	}

	/**
	 * Validate HTTP method
	 */
	public static isValidHttpMethod(method: string): boolean {
		const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
		return validMethods.includes(method?.toUpperCase());
	}

	/**
	 * Validate content type
	 */
	public static isValidContentType(contentType: string): boolean {
		if (!contentType || typeof contentType !== 'string') {
			return false;
		}

		// Basic content type validation
		return /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*$/.test(contentType);
	}

	/**
	 * Validate pagination parameters
	 */
	public static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
		const validPage = this.isValidNumber(page, 1) ? page! : 1;
		const validLimit = this.isValidNumber(limit, 1, 1000) ? limit! : 50;
		
		return { page: validPage, limit: validLimit };
	}

	/**
	 * Validate date string
	 */
	public static isValidDate(dateString: string): boolean {
		try {
			const date = new Date(dateString);
			return !isNaN(date.getTime());
		} catch {
			return false;
		}
	}

	/**
	 * Validate UUID format
	 */
	public static isValidUUID(uuid: string): boolean {
		if (!uuid || typeof uuid !== 'string') {
			return false;
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		return uuidRegex.test(uuid);
	}

	/**
	 * Validate file path
	 */
	public static isValidFilePath(path: string): boolean {
		if (!path || typeof path !== 'string') {
			return false;
		}

		// Basic path validation - no directory traversal
		return !path.includes('..') && !path.includes('//') && path.length > 0;
	}

	/**
	 * Validate JSON string
	 */
	public static isValidJSON(jsonString: string): boolean {
		try {
			JSON.parse(jsonString);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Create validation schema for tool parameters
	 */
	public static createToolParameterSchema(requiredFields: string[], optionalFields: string[] = []): z.ZodSchema {
		const schemaObject: Record<string, z.ZodTypeAny> = {};

		// Add required fields
		for (const field of requiredFields) {
			schemaObject[field] = z.any();
		}

		// Add optional fields
		for (const field of optionalFields) {
			schemaObject[field] = z.any().optional();
		}

		return z.object(schemaObject);
	}

	/**
	 * Validate tool parameters against schema
	 */
	public static validateToolParameters(params: any, schema: z.ZodSchema): { isValid: boolean; errors: string[] } {
		try {
			schema.parse(params);
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
	 * Validate rate limit parameters
	 */
	public static validateRateLimit(requests: number, windowMs: number): boolean {
		return this.isValidNumber(requests, 1) && this.isValidNumber(windowMs, 1000);
	}

	/**
	 * Validate timeout value
	 */
	public static validateTimeout(timeout: number): number {
		if (!this.isValidNumber(timeout, 1000, 300000)) {
			return 30000; // Default 30 seconds
		}
		return timeout;
	}

	/**
	 * Validate retry count
	 */
	public static validateRetryCount(retries: number): number {
		if (!this.isValidNumber(retries, 0, 10)) {
			return 3; // Default 3 retries
		}
		return retries;
	}
}

export default Validators;