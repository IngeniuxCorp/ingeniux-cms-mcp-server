// Semantic normalizer for content comparison
// Ignores irrelevant differences like timestamps, formatting, and order variations

export interface NormalizationOptions {
	ignoreTimestamps?: boolean;
	ignoreFormatting?: boolean;
	ignoreOrder?: boolean;
	ignoreDescriptions?: boolean;
	customIgnoreFields?: string[];
}

export class SemanticNormalizer {
	private options: NormalizationOptions;

	constructor(options?: NormalizationOptions) {
		this.options = {
			ignoreTimestamps: true,
			ignoreFormatting: true,
			ignoreOrder: false,
			ignoreDescriptions: false,
			customIgnoreFields: [],
			...options
		};
	}

	normalize(content: any): any {
		try {
			if (!content) {
				return content;
			}

			if (typeof content !== 'object') {
				return this.normalizeValue(content);
			}

			if (Array.isArray(content)) {
				return this.normalizeArray(content);
			}

			return this.normalizeObject(content);
		} catch (e) {
			return content;
		}
	}

	private normalizeValue(value: any): any {
		try {
			if (typeof value === 'string') {
				// Remove extra whitespace if ignoring formatting
				if (this.options.ignoreFormatting) {
					return value.trim().replace(/\s+/g, ' ');
				}
			}

			return value;
		} catch (e) {
			return value;
		}
	}

	private normalizeArray(arr: any[]): any[] {
		try {
			const normalized = arr.map(item => this.normalize(item));

			// Sort arrays if ignoring order (only for primitive arrays)
			if (this.options.ignoreOrder && this.isPrimitiveArray(normalized)) {
				return normalized.sort();
			}

			return normalized;
		} catch (e) {
			return arr;
		}
	}

	private normalizeObject(obj: Record<string, any>): Record<string, any> {
		try {
			const normalized: Record<string, any> = {};

			for (const [key, value] of Object.entries(obj)) {
				// Skip ignored fields
				if (this.shouldIgnoreField(key)) {
					continue;
				}

				normalized[key] = this.normalize(value);
			}

			return normalized;
		} catch (e) {
			return obj;
		}
	}

	private shouldIgnoreField(fieldName: string): boolean {
		try {
			// Ignore timestamp fields
			if (this.options.ignoreTimestamps) {
				const timestampFields = [
					'timestamp', 'created', 'updated', 'modified', 
					'createdAt', 'updatedAt', 'modifiedAt',
					'created_at', 'updated_at', 'modified_at',
					'lastModified', 'lastUpdated', 'date'
				];
				if (timestampFields.some(field => 
					fieldName.toLowerCase().includes(field.toLowerCase()))) {
					return true;
				}
			}

			// Ignore description fields if configured
			if (this.options.ignoreDescriptions) {
				const descriptionFields = ['description', 'desc', 'comment', 'note'];
				if (descriptionFields.some(field => 
					fieldName.toLowerCase().includes(field.toLowerCase()))) {
					return true;
				}
			}

			// Ignore custom fields
			if (this.options.customIgnoreFields?.includes(fieldName)) {
				return true;
			}

			return false;
		} catch (e) {
			return false;
		}
	}

	private isPrimitiveArray(arr: any[]): boolean {
		try {
			return arr.every(item => 
				typeof item === 'string' || 
				typeof item === 'number' || 
				typeof item === 'boolean' ||
				item === null
			);
		} catch (e) {
			return false;
		}
	}

	// Specific normalization for schemas
	normalizeSchema(schema: any): any {
		try {
			if (!schema || typeof schema !== 'object') {
				return schema;
			}

			const normalized = this.normalize(schema);

			// Additional schema-specific normalization
			if (normalized.properties && typeof normalized.properties === 'object') {
				// Sort properties by key for consistent comparison
				const sortedProps: Record<string, any> = {};
				const keys = Object.keys(normalized.properties).sort();
				for (const key of keys) {
					sortedProps[key] = normalized.properties[key];
				}
				normalized.properties = sortedProps;
			}

			// Sort required array
			if (Array.isArray(normalized.required)) {
				normalized.required = [...normalized.required].sort();
			}

			return normalized;
		} catch (e) {
			return schema;
		}
	}

	// Specific normalization for tool definitions
	normalizeTool(tool: any): any {
		try {
			if (!tool || typeof tool !== 'object') {
				return tool;
			}

			const normalized = this.normalize(tool);

			// Normalize input and output schemas
			if (normalized.input_schema) {
				normalized.input_schema = this.normalizeSchema(normalized.input_schema);
			}

			if (normalized.output_schema) {
				normalized.output_schema = this.normalizeSchema(normalized.output_schema);
			}

			// Sort tags if present
			if (Array.isArray(normalized.tags)) {
				normalized.tags = [...normalized.tags].sort();
			}

			return normalized;
		} catch (e) {
			return tool;
		}
	}

	// Remove semantically irrelevant differences
	removeSemanticNoise(content: any): any {
		try {
			const strictOptions: NormalizationOptions = {
				ignoreTimestamps: true,
				ignoreFormatting: true,
				ignoreOrder: true,
				ignoreDescriptions: true,
				customIgnoreFields: [
					'id', '_id', 'uuid', 'guid',
					'version', 'revision', 'etag',
					'lastModifiedUser', 'creationUser',
					'metadata', 'meta', 'extras'
				]
			};

			const strictNormalizer = new SemanticNormalizer(strictOptions);
			return strictNormalizer.normalize(content);
		} catch (e) {
			return content;
		}
	}

	// Check if two normalized objects are structurally equivalent
	isStructurallyEquivalent(obj1: any, obj2: any): boolean {
		try {
			const clean1 = this.removeSemanticNoise(obj1);
			const clean2 = this.removeSemanticNoise(obj2);
			
			return this.deepEqual(clean1, clean2);
		} catch (e) {
			return false;
		}
	}

	private deepEqual(a: any, b: any): boolean {
		try {
			if (a === b) return true;
			if (typeof a !== typeof b) return false;
			if (typeof a !== 'object' || a === null || b === null) return false;

			if (Array.isArray(a) !== Array.isArray(b)) return false;

			if (Array.isArray(a)) {
				if (a.length !== b.length) return false;
				for (let i = 0; i < a.length; i++) {
					if (!this.deepEqual(a[i], b[i])) return false;
				}
				return true;
			}

			const aKeys = Object.keys(a);
			const bKeys = Object.keys(b);
			if (aKeys.length !== bKeys.length) return false;

			for (const key of aKeys) {
				if (!bKeys.includes(key)) return false;
				if (!this.deepEqual(a[key], b[key])) return false;
			}

			return true;
		} catch (e) {
			return false;
		}
	}

	updateOptions(options: Partial<NormalizationOptions>): void {
		this.options = { ...this.options, ...options };
	}

	getOptions(): NormalizationOptions {
		return { ...this.options };
	}
}

// Utility functions for common normalization tasks
export function normalizeForComparison(content: any): any {
	try {
		const normalizer = new SemanticNormalizer();
		return normalizer.normalize(content);
	} catch (e) {
		return content;
	}
}

export function normalizeSchema(schema: any): any {
	try {
		const normalizer = new SemanticNormalizer();
		return normalizer.normalizeSchema(schema);
	} catch (e) {
		return schema;
	}
}

export function normalizeTool(tool: any): any {
	try {
		const normalizer = new SemanticNormalizer();
		return normalizer.normalizeTool(tool);
	} catch (e) {
		return tool;
	}
}

export function removeTimestamps(content: any): any {
	try {
		const normalizer = new SemanticNormalizer({ ignoreTimestamps: true });
		return normalizer.normalize(content);
	} catch (e) {
		return content;
	}
}

// Factory for creating normalizers with different configurations
export class NormalizerFactory {
	static createDefault(): SemanticNormalizer {
		return new SemanticNormalizer();
	}

	static createStrict(): SemanticNormalizer {
		return new SemanticNormalizer({
			ignoreTimestamps: true,
			ignoreFormatting: true,
			ignoreOrder: true,
			ignoreDescriptions: true
		});
	}

	static createForSchemas(): SemanticNormalizer {
		return new SemanticNormalizer({
			ignoreTimestamps: true,
			ignoreFormatting: true,
			ignoreOrder: false,
			ignoreDescriptions: false
		});
	}

	static createCustom(options: NormalizationOptions): SemanticNormalizer {
		return new SemanticNormalizer(options);
	}
}