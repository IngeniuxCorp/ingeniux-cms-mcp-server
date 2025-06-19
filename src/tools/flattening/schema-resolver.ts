// Schema resolver for deep parameter flattening
// Handles recursive $ref, allOf, oneOf resolution using Swagger definitions

import { RefResolver } from './ref-resolver';

export interface SchemaContext {
	definitions?: Record<string, any>;
	rootSchema?: any;
	visited?: Set<string>;
}

export class SchemaResolver {
	private refResolver: RefResolver;
	private circularRefs: Set<string> = new Set();

	constructor(definitions?: Record<string, any>) {
		this.refResolver = new RefResolver(definitions);
	}

	resolve(schema: any, context?: SchemaContext): any {
		try {
			if (!schema || typeof schema !== 'object') {
				return schema;
			}

			const ctx: SchemaContext = {
				definitions: context?.definitions || {},
				rootSchema: context?.rootSchema || schema,
				visited: context?.visited || new Set()
			};

			return this.resolveRecursive(schema, ctx);
		} catch (e) {
			// Return original schema on error
			return schema;
		}
	}

	private resolveRecursive(schema: any, context: SchemaContext): any {
		try {
			if (!schema || typeof schema !== 'object') {
				return schema;
			}

			// Handle $ref resolution
			if (schema.$ref && typeof schema.$ref === 'string') {
				return this.resolveRef(schema.$ref, context);
			}

			// Handle allOf
			if (Array.isArray(schema.allOf)) {
				return this.resolveAllOf(schema, context);
			}

			// Handle oneOf
			if (Array.isArray(schema.oneOf)) {
				return this.resolveOneOf(schema, context);
			}

			// Handle anyOf (similar to oneOf)
			if (Array.isArray(schema.anyOf)) {
				return this.resolveAnyOf(schema, context);
			}

			// Recursively resolve properties
			const resolved = { ...schema };
			if (resolved.properties && typeof resolved.properties === 'object') {
				resolved.properties = this.resolveProperties(resolved.properties, context);
			}

			// Handle items for arrays
			if (resolved.items) {
				resolved.items = this.resolveRecursive(resolved.items, context);
			}

			// Handle additionalProperties
			if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
				resolved.additionalProperties = this.resolveRecursive(resolved.additionalProperties, context);
			}

			return resolved;
		} catch (e) {
			return schema;
		}
	}

	private resolveRef(ref: string, context: SchemaContext): any {
		try {
			// Check for circular reference
			if (context.visited?.has(ref)) {
				this.circularRefs.add(ref);
				return { type: 'object', description: `Circular reference: ${ref}` };
			}

			const resolved = this.refResolver.resolve(ref, context.definitions || {});
			if (!resolved) {
				return { type: 'object', description: `Unresolved reference: ${ref}` };
			}

			// Add to visited set
			const newVisited = new Set(context.visited);
			newVisited.add(ref);
			const newContext = { ...context, visited: newVisited };

			return this.resolveRecursive(resolved, newContext);
		} catch (e) {
			return { type: 'object', description: `Error resolving reference: ${ref}` };
		}
	}

	private resolveAllOf(schema: any, context: SchemaContext): any {
		try {
			const allOfSchemas = schema.allOf || [];
			const resolvedSchemas: any[] = [];

			for (const subSchema of allOfSchemas) {
				const resolved = this.resolveRecursive(subSchema, context);
				if (resolved) {
					resolvedSchemas.push(resolved);
				}
			}

			if (resolvedSchemas.length === 0) {
				return { type: 'object' };
			}

			// Merge all schemas
			return this.mergeSchemas(resolvedSchemas, schema);
		} catch (e) {
			return { type: 'object' };
		}
	}

	private resolveOneOf(schema: any, context: SchemaContext): any {
		try {
			const oneOfSchemas = schema.oneOf || [];
			if (oneOfSchemas.length === 0) {
				return { type: 'object' };
			}

			// Resolve all oneOf schemas
			const resolvedSchemas: any[] = [];
			for (const subSchema of oneOfSchemas) {
				const resolved = this.resolveRecursive(subSchema, context);
				if (resolved) {
					resolvedSchemas.push(resolved);
				}
			}

			if (resolvedSchemas.length === 0) {
				return { type: 'object' };
			}

			// For oneOf, we typically take the first valid schema
			// or create a union type representation
			const baseSchema = { ...schema };
			delete baseSchema.oneOf;

			return {
				...baseSchema,
				oneOf: resolvedSchemas,
				type: 'object',
				description: baseSchema.description || 'One of the following schemas'
			};
		} catch (e) {
			return { type: 'object' };
		}
	}

	private resolveAnyOf(schema: any, context: SchemaContext): any {
		try {
			const anyOfSchemas = schema.anyOf || [];
			if (anyOfSchemas.length === 0) {
				return { type: 'object' };
			}

			// Similar to oneOf but more permissive
			const resolvedSchemas: any[] = [];
			for (const subSchema of anyOfSchemas) {
				const resolved = this.resolveRecursive(subSchema, context);
				if (resolved) {
					resolvedSchemas.push(resolved);
				}
			}

			if (resolvedSchemas.length === 0) {
				return { type: 'object' };
			}

			const baseSchema = { ...schema };
			delete baseSchema.anyOf;

			return {
				...baseSchema,
				anyOf: resolvedSchemas,
				type: 'object',
				description: baseSchema.description || 'Any of the following schemas'
			};
		} catch (e) {
			return { type: 'object' };
		}
	}

	private resolveProperties(properties: Record<string, any>, context: SchemaContext): Record<string, any> {
		try {
			const resolved: Record<string, any> = {};
			for (const [key, value] of Object.entries(properties)) {
				resolved[key] = this.resolveRecursive(value, context);
			}
			return resolved;
		} catch (e) {
			return properties;
		}
	}

	private mergeSchemas(schemas: any[], baseSchema?: any): any {
		try {
			const merged: any = { ...(baseSchema || {}) };
			delete merged.allOf;

			const allProperties: Record<string, any> = {};
			const allRequired: string[] = [];

			// Merge properties and required from all schemas
			for (const schema of schemas) {
				if (schema.properties && typeof schema.properties === 'object') {
					Object.assign(allProperties, schema.properties);
				}
				if (Array.isArray(schema.required)) {
					allRequired.push(...schema.required);
				}
				// Merge other top-level properties (type, description, etc.)
				for (const [key, value] of Object.entries(schema)) {
					if (key !== 'properties' && key !== 'required') {
						merged[key] = value;
					}
				}
			}

			if (Object.keys(allProperties).length > 0) {
				merged.properties = allProperties;
			}
			if (allRequired.length > 0) {
				merged.required = Array.from(new Set(allRequired));
			}

			return merged;
		} catch (e) {
			return baseSchema || { type: 'object' };
		}
	}

	getCircularRefs(): string[] {
		return Array.from(this.circularRefs);
	}

	clearCircularRefs(): void {
		this.circularRefs.clear();
	}

	hasCircularRefs(): boolean {
		return this.circularRefs.size > 0;
	}
}

// Utility functions for common schema resolution tasks
export function resolveSchema(schema: any, definitions?: Record<string, any>): any {
	try {
		const resolver = new SchemaResolver(definitions);
		return resolver.resolve(schema);
	} catch (e) {
		return schema;
	}
}

export function flattenSchema(schema: any, definitions?: Record<string, any>): any {
	try {
		const resolver = new SchemaResolver(definitions);
		const context: SchemaContext = {
			definitions: definitions || {},
			rootSchema: schema,
			visited: new Set()
		};
		const resolved = resolver.resolve(schema, context);
		
		// Additional flattening for deep nested structures
		return flattenNestedProperties(resolved);
	} catch (e) {
		return schema;
	}
}

function flattenNestedProperties(schema: any): any {
	try {
		if (!schema || typeof schema !== 'object') {
			return schema;
		}

		const result = { ...schema };
		
		if (result.properties && typeof result.properties === 'object') {
			const flatProps: Record<string, any> = {};
			
			for (const [key, prop] of Object.entries(result.properties)) {
				if (prop && typeof prop === 'object') {
					flatProps[key] = flattenNestedProperties(prop);
				} else {
					flatProps[key] = prop;
				}
			}
			
			result.properties = flatProps;
		}

		return result;
	} catch (e) {
		return schema;
	}
}