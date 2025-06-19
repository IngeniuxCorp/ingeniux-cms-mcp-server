// Reference resolver for handling $ref resolution in Swagger/OpenAPI schemas
// Handles circular reference detection and prevention

export interface RefContext {
	definitions: Record<string, any>;
	visited?: Set<string>;
}

export class RefResolver {
	private definitions: Record<string, any>;
	private circularRefDetector: CircularRefDetector;

	constructor(definitions?: Record<string, any>) {
		this.definitions = definitions || {};
		this.circularRefDetector = new CircularRefDetector();
	}

	resolve(ref: string, definitions?: Record<string, any>): any {
		try {
			if (!ref || typeof ref !== 'string') {
				return null;
			}

			const defs = definitions || this.definitions;
			const context: RefContext = {
				definitions: defs,
				visited: new Set()
			};

			return this.resolveWithContext(ref, context);
		} catch (e) {
			return null;
		}
	}

	private resolveWithContext(ref: string, context: RefContext): any {
		try {
			// Check for circular reference
			if (context.visited?.has(ref)) {
				this.circularRefDetector.addCircularRef(ref);
				return {
					type: 'object',
					description: `Circular reference detected: ${ref}`
				};
			}

			// Parse the reference
			const parsed = this.parseRef(ref);
			if (!parsed) {
				return null;
			}

			// Get the referenced schema
			const schema = this.getSchemaFromRef(parsed, context.definitions);
			if (!schema) {
				return {
					type: 'object',
					description: `Unresolved reference: ${ref}`
				};
			}

			// Add to visited set for circular detection
			const newVisited = new Set(context.visited);
			newVisited.add(ref);
			const newContext = { ...context, visited: newVisited };

			// Recursively resolve nested references
			return this.resolveNestedRefs(schema, newContext);
		} catch (e) {
			return null;
		}
	}

	private parseRef(ref: string): { type: string; path: string[] } | null {
		try {
			// Handle JSON Pointer references like "#/definitions/Model"
			if (ref.startsWith('#/')) {
				const path = ref.substring(2).split('/');
				return { type: 'local', path };
			}

			// Handle external references (not implemented yet)
			if (ref.includes('#')) {
				const [_external, internal] = ref.split('#');
				const path = internal ? internal.substring(1).split('/') : [];
				return { type: 'external', path };
			}

			return null;
		} catch (e) {
			return null;
		}
	}

	private getSchemaFromRef(parsed: { type: string; path: string[] }, definitions: Record<string, any>): any {
		try {
			if (parsed.type !== 'local' || !Array.isArray(parsed.path)) {
				return null;
			}

			let current: any = { definitions };
			
			for (const segment of parsed.path) {
				if (!current || typeof current !== 'object') {
					return null;
				}
				current = current[segment];
			}

			return current;
		} catch (e) {
			return null;
		}
	}

	private resolveNestedRefs(schema: any, context: RefContext): any {
		try {
			if (!schema || typeof schema !== 'object') {
				return schema;
			}

			// Handle $ref in current schema
			if (schema.$ref && typeof schema.$ref === 'string') {
				return this.resolveWithContext(schema.$ref, context);
			}

			const resolved = { ...schema };

			// Recursively resolve properties
			if (resolved.properties && typeof resolved.properties === 'object') {
				const newProps: Record<string, any> = {};
				for (const [key, value] of Object.entries(resolved.properties)) {
					newProps[key] = this.resolveNestedRefs(value, context);
				}
				resolved.properties = newProps;
			}

			// Handle allOf
			if (Array.isArray(resolved.allOf)) {
				resolved.allOf = resolved.allOf.map((item: any) => 
					this.resolveNestedRefs(item, context)
				);
			}

			// Handle oneOf
			if (Array.isArray(resolved.oneOf)) {
				resolved.oneOf = resolved.oneOf.map((item: any) => 
					this.resolveNestedRefs(item, context)
				);
			}

			// Handle anyOf
			if (Array.isArray(resolved.anyOf)) {
				resolved.anyOf = resolved.anyOf.map((item: any) => 
					this.resolveNestedRefs(item, context)
				);
			}

			// Handle items for arrays
			if (resolved.items) {
				resolved.items = this.resolveNestedRefs(resolved.items, context);
			}

			// Handle additionalProperties
			if (resolved.additionalProperties && typeof resolved.additionalProperties === 'object') {
				resolved.additionalProperties = this.resolveNestedRefs(resolved.additionalProperties, context);
			}

			return resolved;
		} catch (e) {
			return schema;
		}
	}

	getCircularRefs(): string[] {
		return this.circularRefDetector.getCircularRefs();
	}

	clearCircularRefs(): void {
		this.circularRefDetector.clear();
	}

	hasCircularRefs(): boolean {
		return this.circularRefDetector.hasCircularRefs();
	}

	updateDefinitions(definitions: Record<string, any>): void {
		this.definitions = definitions || {};
	}
}

export class CircularRefDetector {
	private circularRefs: Set<string> = new Set();

	addCircularRef(ref: string): void {
		if (ref) {
			this.circularRefs.add(ref);
		}
	}

	hasCircularRef(ref: string): boolean {
		return this.circularRefs.has(ref);
	}

	getCircularRefs(): string[] {
		return Array.from(this.circularRefs);
	}

	hasCircularRefs(): boolean {
		return this.circularRefs.size > 0;
	}

	clear(): void {
		this.circularRefs.clear();
	}
}

// Utility functions for common ref resolution tasks
export function resolveRef(ref: string, definitions: Record<string, any>): any {
	try {
		const resolver = new RefResolver(definitions);
		return resolver.resolve(ref);
	} catch (e) {
		return null;
	}
}

export function detectCircularRefs(_schema: any, definitions: Record<string, any>): string[] {
	try {
		const resolver = new RefResolver(definitions);
		resolver.resolve('#/', definitions);
		return resolver.getCircularRefs();
	} catch (e) {
		return [];
	}
}

// Factory for creating resolvers
export class RefResolverFactory {
	static create(definitions?: Record<string, any>): RefResolver {
		return new RefResolver(definitions);
	}

	static createWithDetector(definitions?: Record<string, any>): RefResolver {
		const resolver = new RefResolver(definitions);
		return resolver;
	}
}