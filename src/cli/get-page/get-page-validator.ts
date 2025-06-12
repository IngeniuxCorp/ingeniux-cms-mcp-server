/**
 * Input validation for get page CLI tool
 */

import { GetPageCLIOptions, GetPageRequest, GetPageValidationError } from './get-page-types.js';

export class GetPageValidator {
	public static validateCLIOptions(options: GetPageCLIOptions): GetPageValidationError[] {
		const errors: GetPageValidationError[] = [];

		try {
			// Validate required parameters
			if (!options.pageId && !options.path) {
				errors.push({
					field: 'pageId/path',
					message: 'Either pageId or path is required',
					code: 'MISSING_REQUIRED_PARAM'
				});
			}

			// Validate mutual exclusivity
			if (options.pageId && options.path) {
				errors.push({
					field: 'pageId/path',
					message: 'Cannot specify both pageId and path',
					code: 'MUTUALLY_EXCLUSIVE'
				});
			}

			// Validate pageId format if provided
			if (options.pageId && !this.isValidPageId(options.pageId)) {
				errors.push({
					field: 'pageId',
					message: 'Invalid pageId format',
					code: 'INVALID_FORMAT'
				});
			}

			// Validate path format if provided
			if (options.path && !this.isValidPath(options.path)) {
				errors.push({
					field: 'path',
					message: 'Invalid path format',
					code: 'INVALID_FORMAT'
				});
			}

			// Validate timeout
			if (options.timeout < 30 || options.timeout > 1800) {
				errors.push({
					field: 'timeout',
					message: 'Timeout must be between 30 and 1800 seconds',
					code: 'INVALID_RANGE'
				});
			}

			// Validate format
			const validFormats = ['json', 'table', 'minimal'];
			if (!validFormats.includes(options.format)) {
				errors.push({
					field: 'format',
					message: `Invalid format. Valid options: ${validFormats.join(', ')}`,
					code: 'INVALID_VALUE'
				});
			}

		} catch (error) {
			errors.push({
				field: 'validation',
				message: 'Validation error occurred',
				code: 'VALIDATION_ERROR'
			});
		}

		return errors;
	}

	public static validateRequest(request: GetPageRequest): GetPageValidationError[] {
		const errors: GetPageValidationError[] = [];

		try {
			// Validate required parameters
			if (!request.pageId && !request.path) {
				errors.push({
					field: 'pageId/path',
					message: 'Either pageId or path is required',
					code: 'MISSING_REQUIRED_PARAM'
				});
			}

			// Validate mutual exclusivity
			if (request.pageId && request.path) {
				errors.push({
					field: 'pageId/path',
					message: 'Cannot specify both pageId and path',
					code: 'MUTUALLY_EXCLUSIVE'
				});
			}

			// Validate pageId format if provided
			if (request.pageId && !this.isValidPageId(request.pageId)) {
				errors.push({
					field: 'pageId',
					message: 'Invalid pageId format',
					code: 'INVALID_FORMAT'
				});
			}

			// Validate path format if provided
			if (request.path && !this.isValidPath(request.path)) {
				errors.push({
					field: 'path',
					message: 'Invalid path format',
					code: 'INVALID_FORMAT'
				});
			}

		} catch (error) {
			errors.push({
				field: 'validation',
				message: 'Request validation error occurred',
				code: 'VALIDATION_ERROR'
			});
		}

		return errors;
	}

	private static isValidPageId(pageId: string): boolean {
		try {
			// Basic validation - non-empty string, reasonable length
			return pageId.length > 0 && 
				   pageId.length <= 100 && 
				   /^[a-zA-Z0-9\-_]+$/.test(pageId);
		} catch (error) {
			return false;
		}
	}

	private static isValidPath(path: string): boolean {
		try {
			// Basic validation - starts with /, reasonable length
			return path.startsWith('/') && path.length <= 500;
		} catch (error) {
			return false;
		}
	}

	public static parseBoolean(value: string): boolean {
		try {
			const lowerValue = value.toLowerCase();
			if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
				return true;
			}
			if (['false', '0', 'no', 'off'].includes(lowerValue)) {
				return false;
			}
			throw new Error(`Invalid boolean value: ${value}`);
		} catch (error) {
			throw new Error(`Invalid boolean value: ${value}`);
		}
	}

	public static validateFormat(format: string): 'json' | 'table' | 'minimal' {
		const validFormats = ['json', 'table', 'minimal'];
		if (!validFormats.includes(format)) {
			throw new Error(`Invalid format: ${format}. Valid options: ${validFormats.join(', ')}`);
		}
		return format as 'json' | 'table' | 'minimal';
	}
}