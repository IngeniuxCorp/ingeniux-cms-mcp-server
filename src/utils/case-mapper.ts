/**
 * Utility for recursively mapping object keys to camelCase.
 * Handles arrays, nested objects, and leaves primitives untouched.
 */
import camelCase from 'camelcase';

/**
 * Recursively converts all object keys to camelCase.
 * @param input - The object, array, or value to convert.
 * @returns The same structure with all keys in camelCase.
 */
export function toCamelCaseDeep(input: any): any {
	if (Array.isArray(input)) {
		return input.map(toCamelCaseDeep);
	}
	if (input && typeof input === 'object' && input.constructor === Object) {
		const result: Record<string, any> = {};
		for (const [key, value] of Object.entries(input)) {
			const camelKey = camelCase(key);
			result[camelKey] = toCamelCaseDeep(value);
		}
		return result;
	}
	return input;
}