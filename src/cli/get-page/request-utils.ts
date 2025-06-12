/**
 * Utility functions for request handling
 */

import { randomBytes } from 'crypto';

export function generateRequestId(): string {
	try {
		// Generate unique request ID
		const timestamp = Date.now().toString(36);
		const random = randomBytes(4).toString('hex');
		return `req_${timestamp}_${random}`;
	} catch (error) {
		// Fallback if crypto fails
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 10);
		return `req_${timestamp}_${random}`;
	}
}

export function validateTimeout(timeout: number): number {
	if (timeout < 30) {
		return 30;
	}
	if (timeout > 1800) {
		return 1800;
	}
	return timeout;
}

export function sanitizeForLogging(data: any): any {
	// Remove sensitive data from logging
	if (typeof data !== 'object' || data === null) {
		return data;
	}
	
	try {
		const sanitized = { ...data };
		
		// Remove common sensitive fields
		const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
		for (const field of sensitiveFields) {
			if (field in sanitized) {
				sanitized[field] = '[REDACTED]';
			}
		}
		
		return sanitized;
	} catch (error) {
		return '[SANITIZATION_ERROR]';
	}
}