// Description enrichment using strategy pattern
// Enriches tool descriptions using fallback chain: summary → description → tag descriptions → operationId

export interface EnrichmentStrategy {
	enrich(endpoint: SwaggerEndpoint): string | null;
}

export interface SwaggerEndpoint {
	method: string;
	path: string;
	operationId: string;
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: any[];
	requestSchemas?: any[];
	responseSchemas?: any[];
}

export class DescriptionEnricher {
	private strategies: EnrichmentStrategy[] = [];

	constructor(strategies: EnrichmentStrategy[]) {
		this.strategies = strategies || [];
	}

	enrich(endpoint: SwaggerEndpoint): string {
		try {
			if (!endpoint) {
				return this.getFallbackDescription(endpoint);
			}

			// Try each strategy in order until one succeeds
			for (const strategy of this.strategies) {
				try {
					const result = strategy.enrich(endpoint);
					if (result && result.trim()) {
						return result.trim();
					}
				} catch (e) {
					// Continue to next strategy on error
					continue;
				}
			}

			// If all strategies fail, return fallback
			return this.getFallbackDescription(endpoint);
		} catch (e) {
			return this.getFallbackDescription(endpoint);
		}
	}

	private getFallbackDescription(endpoint: SwaggerEndpoint): string {
		try {
			if (!endpoint) {
				return 'API endpoint';
			}
			const method = endpoint.method || 'UNKNOWN';
			const path = endpoint.path || '/';
			return `${method} ${path}`;
		} catch (e) {
			return 'API endpoint';
		}
	}

	addStrategy(strategy: EnrichmentStrategy): void {
		if (strategy) {
			this.strategies.push(strategy);
		}
	}

	clearStrategies(): void {
		this.strategies = [];
	}

	getStrategies(): EnrichmentStrategy[] {
		return [...this.strategies];
	}
}

// Factory function to create enricher with default strategies
export async function createDefaultEnricher(): Promise<DescriptionEnricher> {
	try {
		// Import strategies dynamically to avoid circular imports
		const {
			SummaryStrategy,
			TagDescriptionStrategy,
			OperationIdStrategy,
			FallbackStrategy
		} = await import('./enrichment-strategies.js');

		const strategies = [
			new SummaryStrategy(),
			new TagDescriptionStrategy(),
			new OperationIdStrategy(),
			new FallbackStrategy()
		];

		return new DescriptionEnricher(strategies);
	} catch (e) {
		// Return basic enricher on import error
		return new DescriptionEnricher([]);
	}
}

// Utility function for backward compatibility
export async function enrichDescription(endpoint: SwaggerEndpoint): Promise<string> {
	try {
		const enricher = await createDefaultEnricher();
		return enricher.enrich(endpoint);
	} catch (e) {
		// Fallback to basic description
		if (!endpoint) {
			return 'API endpoint';
		}
		const method = endpoint.method || 'UNKNOWN';
		const path = endpoint.path || '/';
		return `${method} ${path}`;
	}
}