// Content differ for detecting changes in schemas and tool definitions
// Uses semantic normalization to ignore irrelevant differences

import { SemanticNormalizer } from './semantic-normalizer';

export interface DiffResult {
	hasChanges: boolean;
	changes: Change[];
	summary: string;
}

export interface Change {
	type: 'added' | 'removed' | 'modified';
	path: string;
	oldValue?: any;
	newValue?: any;
	description?: string;
}

export class ContentDiffer {
	private normalizer: SemanticNormalizer;

	constructor(normalizer?: SemanticNormalizer) {
		this.normalizer = normalizer || new SemanticNormalizer();
	}

	diff(oldContent: any, newContent: any): DiffResult {
		try {
			if (!oldContent && !newContent) {
				return {
					hasChanges: false,
					changes: [],
					summary: 'No content to compare'
				};
			}

			if (!oldContent) {
				return {
					hasChanges: true,
					changes: [{ type: 'added', path: 'root', newValue: newContent }],
					summary: 'Content added'
				};
			}

			if (!newContent) {
				return {
					hasChanges: true,
					changes: [{ type: 'removed', path: 'root', oldValue: oldContent }],
					summary: 'Content removed'
				};
			}

			// Normalize both contents before comparison
			const normalizedOld = this.normalizer.normalize(oldContent);
			const normalizedNew = this.normalizer.normalize(newContent);

			// Perform deep comparison
			const changes = this.compareObjects(normalizedOld, normalizedNew, '');

			return {
				hasChanges: changes.length > 0,
				changes,
				summary: this.generateSummary(changes)
			};
		} catch (e) {
			return {
				hasChanges: false,
				changes: [],
				summary: 'Error during comparison'
			};
		}
	}

	private compareObjects(oldObj: any, newObj: any, path: string): Change[] {
		try {
			const changes: Change[] = [];

			if (oldObj === newObj) {
				return changes;
			}

			// Handle primitive types
			if (typeof oldObj !== 'object' || typeof newObj !== 'object' || 
				oldObj === null || newObj === null) {
				if (oldObj !== newObj) {
					changes.push({
						type: 'modified',
						path: path || 'root',
						oldValue: oldObj,
						newValue: newObj
					});
				}
				return changes;
			}

			// Handle arrays
			if (Array.isArray(oldObj) || Array.isArray(newObj)) {
				return this.compareArrays(oldObj, newObj, path);
			}

			// Compare object properties
			const allKeys = new Set([
				...Object.keys(oldObj || {}),
				...Object.keys(newObj || {})
			]);

			for (const key of allKeys) {
				const currentPath = path ? `${path}.${key}` : key;
				const oldValue = oldObj[key];
				const newValue = newObj[key];

				if (!(key in oldObj)) {
					changes.push({
						type: 'added',
						path: currentPath,
						newValue
					});
				} else if (!(key in newObj)) {
					changes.push({
						type: 'removed',
						path: currentPath,
						oldValue
					});
				} else {
					changes.push(...this.compareObjects(oldValue, newValue, currentPath));
				}
			}

			return changes;
		} catch (e) {
			return [];
		}
	}

	private compareArrays(oldArr: any, newArr: any, path: string): Change[] {
		try {
			const changes: Change[] = [];

			if (!Array.isArray(oldArr) && !Array.isArray(newArr)) {
				return this.compareObjects(oldArr, newArr, path);
			}

			if (!Array.isArray(oldArr)) {
				changes.push({
					type: 'modified',
					path,
					oldValue: oldArr,
					newValue: newArr,
					description: 'Changed from non-array to array'
				});
				return changes;
			}

			if (!Array.isArray(newArr)) {
				changes.push({
					type: 'modified',
					path,
					oldValue: oldArr,
					newValue: newArr,
					description: 'Changed from array to non-array'
				});
				return changes;
			}

			// Compare array lengths
			const maxLength = Math.max(oldArr.length, newArr.length);

			for (let i = 0; i < maxLength; i++) {
				const currentPath = `${path}[${i}]`;
				const oldValue = i < oldArr.length ? oldArr[i] : undefined;
				const newValue = i < newArr.length ? newArr[i] : undefined;

				if (i >= oldArr.length) {
					changes.push({
						type: 'added',
						path: currentPath,
						newValue
					});
				} else if (i >= newArr.length) {
					changes.push({
						type: 'removed',
						path: currentPath,
						oldValue
					});
				} else {
					changes.push(...this.compareObjects(oldValue, newValue, currentPath));
				}
			}

			return changes;
		} catch (e) {
			return [];
		}
	}

	private generateSummary(changes: Change[]): string {
		try {
			if (changes.length === 0) {
				return 'No changes detected';
			}

			const added = changes.filter(c => c.type === 'added').length;
			const removed = changes.filter(c => c.type === 'removed').length;
			const modified = changes.filter(c => c.type === 'modified').length;

			const parts: string[] = [];
			if (added > 0) parts.push(`${added} added`);
			if (removed > 0) parts.push(`${removed} removed`);
			if (modified > 0) parts.push(`${modified} modified`);

			return parts.join(', ');
		} catch (e) {
			return 'Changes detected';
		}
	}

	// Compare schemas specifically (input/output schemas)
	compareSchemas(oldSchemas: any, newSchemas: any): DiffResult {
		try {
			const oldNormalized = this.normalizer.normalizeSchema(oldSchemas);
			const newNormalized = this.normalizer.normalizeSchema(newSchemas);
			
			return this.diff(oldNormalized, newNormalized);
		} catch (e) {
			return {
				hasChanges: false,
				changes: [],
				summary: 'Error comparing schemas'
			};
		}
	}

	// Compare tool definitions
	compareTools(oldTool: any, newTool: any): DiffResult {
		try {
			const oldNormalized = this.normalizer.normalizeTool(oldTool);
			const newNormalized = this.normalizer.normalizeTool(newTool);
			
			return this.diff(oldNormalized, newNormalized);
		} catch (e) {
			return {
				hasChanges: false,
				changes: [],
				summary: 'Error comparing tools'
			};
		}
	}

	// Check if changes are significant (excludes minor formatting changes)
	hasSignificantChanges(changes: Change[]): boolean {
		try {
			return changes.some(change => {
				// Consider structural changes significant
				if (change.type === 'added' || change.type === 'removed') {
					return true;
				}

				// Consider type changes significant
				if (change.path.includes('type')) {
					return true;
				}

				// Consider required field changes significant
				if (change.path.includes('required')) {
					return true;
				}

				// Consider property changes significant
				if (change.path.includes('properties')) {
					return true;
				}

				return false;
			});
		} catch (e) {
			return false;
		}
	}

	setNormalizer(normalizer: SemanticNormalizer): void {
		this.normalizer = normalizer;
	}

	getNormalizer(): SemanticNormalizer {
		return this.normalizer;
	}
}

// Utility functions for backward compatibility
export function compareSchemas(oldSchemas: any, newSchemas: any): boolean {
	try {
		const differ = new ContentDiffer();
		const result = differ.compareSchemas(oldSchemas, newSchemas);
		return result.hasChanges;
	} catch (e) {
		return false;
	}
}

export function hasSchemaChanges(oldSchemas: any, newSchemas: any): DiffResult {
	try {
		const differ = new ContentDiffer();
		return differ.compareSchemas(oldSchemas, newSchemas);
	} catch (e) {
		return {
			hasChanges: false,
			changes: [],
			summary: 'Error during comparison'
		};
	}
}

// Factory for creating content differs
export class ContentDifferFactory {
	static create(normalizer?: SemanticNormalizer): ContentDiffer {
		return new ContentDiffer(normalizer);
	}

	static createDefault(): ContentDiffer {
		return new ContentDiffer(new SemanticNormalizer());
	}
}