// Enrichment strategies for description enhancement
// Implements strategy pattern for different description enrichment approaches

import { EnrichmentStrategy, SwaggerEndpoint } from './description-enricher.js';

export class SummaryStrategy implements EnrichmentStrategy {
	enrich(endpoint: SwaggerEndpoint): string | null {
		try {
			if (!endpoint) {
				return null;
			}

			const summary = endpoint.summary;
			if (!summary || typeof summary !== 'string') {
				return null;
			}

			const trimmed = summary.trim();
			if (!trimmed) {
				return null;
			}

			return trimmed;
		} catch (e) {
			return null;
		}
	}
}

export class TagDescriptionStrategy implements EnrichmentStrategy {
	enrich(endpoint: SwaggerEndpoint): string | null {
		try {
			if (!endpoint || !Array.isArray(endpoint.tags)) {
				return null;
			}

			// Use first tag as description prefix
			const firstTag = endpoint.tags[0];
			if (!firstTag || typeof firstTag !== 'string') {
				return null;
			}

			const tagName = firstTag.trim();
			if (!tagName) {
				return null;
			}

			// Create description from tag and endpoint description
			const baseDesc = endpoint.description;
			if (baseDesc && typeof baseDesc === 'string' && baseDesc.trim()) {
				return `${tagName}: ${baseDesc.trim()}`;
			}

			// Fallback to tag-based description
			const method = endpoint.method || 'Unknown';
			return `${tagName} ${method} operation`;
		} catch (e) {
			return null;
		}
	}
}

export class OperationIdStrategy implements EnrichmentStrategy {
	enrich(endpoint: SwaggerEndpoint): string | null {
		try {
			if (!endpoint) {
				return null;
			}

			const operationId = endpoint.operationId;
			if (!operationId || typeof operationId !== 'string') {
				return null;
			}

			const trimmed = operationId.trim();
			if (!trimmed) {
				return null;
			}

			// Convert camelCase/PascalCase to readable format
			const readable = this.formatOperationId(trimmed);
			return readable;
		} catch (e) {
			return null;
		}
	}

	private formatOperationId(operationId: string): string {
		try {
			// Split on camelCase boundaries and underscores
			const words = operationId
				.replace(/([a-z])([A-Z])/g, '$1 $2')
				.replace(/_/g, ' ')
				.split(/\s+/)
				.filter(word => word.length > 0);

			if (words.length === 0) {
				return operationId;
			}

			// Capitalize first word, lowercase others
			const formatted = words.map((word, index) => {
				if (index === 0) {
					return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
				}
				return word.toLowerCase();
			}).join(' ');

			return formatted;
		} catch (e) {
			return operationId;
		}
	}
}

export class FallbackStrategy implements EnrichmentStrategy {
	enrich(endpoint: SwaggerEndpoint): string | null {
		try {
			if (!endpoint) {
				return 'API endpoint';
			}

			// Try to use existing description first
			if (endpoint.description && typeof endpoint.description === 'string') {
				const trimmed = endpoint.description.trim();
				if (trimmed) {
					return trimmed;
				}
			}

			// Create basic description from method and path
			const method = endpoint.method || 'UNKNOWN';
			const path = endpoint.path || '/';
			return `${method.toUpperCase()} ${path}`;
		} catch (e) {
			return 'API endpoint';
		}
	}
}

// Strategy factory for creating specific strategies
export class StrategyFactory {
	static createSummaryStrategy(): SummaryStrategy {
		return new SummaryStrategy();
	}

	static createTagDescriptionStrategy(): TagDescriptionStrategy {
		return new TagDescriptionStrategy();
	}

	static createOperationIdStrategy(): OperationIdStrategy {
		return new OperationIdStrategy();
	}

	static createFallbackStrategy(): FallbackStrategy {
		return new FallbackStrategy();
	}

	static createDefaultStrategies(): EnrichmentStrategy[] {
		try {
			return [
				new SummaryStrategy(),
				new TagDescriptionStrategy(),
				new OperationIdStrategy(),
				new FallbackStrategy()
			];
		} catch (e) {
			return [new FallbackStrategy()];
		}
	}
}

// Utility functions for specific enrichment needs
export function enrichFromSummary(endpoint: SwaggerEndpoint): string | null {
	try {
		const strategy = new SummaryStrategy();
		return strategy.enrich(endpoint);
	} catch (e) {
		return null;
	}
}

export function enrichFromTags(endpoint: SwaggerEndpoint): string | null {
	try {
		const strategy = new TagDescriptionStrategy();
		return strategy.enrich(endpoint);
	} catch (e) {
		return null;
	}
}

export function enrichFromOperationId(endpoint: SwaggerEndpoint): string | null {
	try {
		const strategy = new OperationIdStrategy();
		return strategy.enrich(endpoint);
	} catch (e) {
		return null;
	}
}