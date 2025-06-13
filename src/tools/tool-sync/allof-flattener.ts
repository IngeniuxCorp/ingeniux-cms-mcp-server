/**
 * Flattens a JSON Schema object with allOf, merging all properties and resolving conflicts.
 * Handles nested allOfs and property conflicts.
 * No hardcoded secrets or environment values.
 * @module allof-flattener
 */

type JSONSchema = Record<string, any>;

/**
 * Resolves property conflicts between multiple property objects.
 * Later objects in the array take precedence.
 * @param propertyObjs Array of property objects to merge.
 * @returns Merged property object.
 */
export function resolvePropertyConflicts(propertyObjs: Array<Record<string, any>>): Record<string, any> {
	try {
		if (!Array.isArray(propertyObjs)) return {};
		const merged: Record<string, any> = {};
		for (const obj of propertyObjs) {
			if (obj && typeof obj === 'object') {
				for (const [key, value] of Object.entries(obj)) {
					// If conflict, prefer the last occurrence
					merged[key] = value;
				}
			}
		}
		return merged;
	} catch (err) {
		// Fail-safe: return empty object on error
		return {};
	}
}

/**
 * Recursively flattens allOf schemas into a single schema object.
 * Merges properties, required, and other top-level fields.
 * @param schema The JSON Schema object to flatten.
 * @returns The flattened schema.
 */
export function flattenAllOfSchema(schema: JSONSchema): JSONSchema {
	try {
		if (!schema || typeof schema !== 'object') return {};

		// If no allOf, return as is
		if (!Array.isArray(schema.allOf)) {
			// Recursively flatten nested schemas in properties
			const result: JSONSchema = { ...schema };
			if (result.properties && typeof result.properties === 'object') {
				const newProps: Record<string, any> = {};
				for (const [k, v] of Object.entries(result.properties)) {
					if (v && typeof v === 'object') {
						newProps[k] = flattenAllOfSchema(v as JSONSchema);
					} else {
						newProps[k] = v;
					}
				}
				result.properties = newProps;
			}
			return result;
		}

		// Flatten allOf schemas recursively
		const schemasToMerge: JSONSchema[] = [];
		for (const sub of schema.allOf) {
			const flat = flattenAllOfSchema(sub);
			if (flat && typeof flat === 'object') {
				schemasToMerge.push(flat);
			}
		}

		// Merge properties
		const propertyObjs = schemasToMerge.map(s => s.properties || {});
		const mergedProperties = resolvePropertyConflicts(propertyObjs);

		// Merge required fields
		const requiredArrs = schemasToMerge.map(s => Array.isArray(s.required) ? s.required : []);
		const mergedRequired = Array.from(new Set(requiredArrs.flat()));

		// Merge other top-level fields (type, description, etc.)
		const merged: JSONSchema = {};
		for (const s of schemasToMerge) {
			for (const [k, v] of Object.entries(s)) {
				if (k === 'properties' || k === 'required' || k === 'allOf') continue;
				merged[k] = v;
			}
		}

		// Compose final schema
		const result: JSONSchema = {
			...merged,
			properties: Object.keys(mergedProperties).length > 0 ? mergedProperties : undefined,
			required: mergedRequired.length > 0 ? mergedRequired : undefined,
		};

		// Recursively flatten nested properties
		if (result.properties && typeof result.properties === 'object') {
			const newProps: Record<string, any> = {};
			for (const [k, v] of Object.entries(result.properties)) {
				if (v && typeof v === 'object') {
					newProps[k] = flattenAllOfSchema(v as JSONSchema);
				} else {
					newProps[k] = v;
				}
			}
			result.properties = newProps;
		}

		return result;
	} catch (err) {
		// Fail-safe: return empty object on error
		return {};
	}
}