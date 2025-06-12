/**
 * Output formatting for get page tool results
 */

import { GetPageResult, FormattedOutput } from './get-page-types.js';

export class GetPageFormatter {
	private format: 'json' | 'table' | 'minimal';
	
	constructor(format: 'json' | 'table' | 'minimal') {
		this.format = format;
	}
	
	public formatResult(result: GetPageResult): FormattedOutput {
		try {
			switch (this.format) {
				case 'json':
					return this.formatAsJSON(result);
				case 'table':
					return this.formatAsTable(result);
				case 'minimal':
					return this.formatAsMinimal(result);
				default:
					throw new Error(`Unsupported format: ${this.format}`);
			}
		} catch (error) {
			return {
				content: `Formatting error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				exitCode: 1
			};
		}
	}
	
	private formatAsJSON(result: GetPageResult): FormattedOutput {
		try {
			const content = JSON.stringify(result, null, 2);
			const exitCode = result.success ? 0 : 1;
			return { content, exitCode };
		} catch (error) {
			return {
				content: `JSON formatting error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				exitCode: 1
			};
		}
	}
	
	private formatAsTable(result: GetPageResult): FormattedOutput {
		try {
			if (!result.success) {
				return this.formatError(result);
			}
			
			const lines: string[] = [];
			lines.push('┌─────────────────┬──────────────────────────────────┐');
			lines.push('│ Property        │ Value                            │');
			lines.push('├─────────────────┼──────────────────────────────────┤');
			
			// Add data rows
			if (result.data) {
				for (const [key, value] of Object.entries(result.data)) {
					if (key !== 'content' || this.shouldShowContent(value)) {
						const formattedValue = this.formatTableValue(value);
						lines.push(`│ ${this.padRight(key, 15)} │ ${this.padRight(formattedValue, 32)} │`);
					}
				}
			}
			
			// Add metadata
			lines.push('├─────────────────┼──────────────────────────────────┤');
			lines.push(`│ Request ID      │ ${this.padRight(result.metadata.requestId, 32)} │`);
			lines.push(`│ Duration        │ ${this.padRight(result.metadata.duration + 'ms', 32)} │`);
			lines.push(`│ Timestamp       │ ${this.padRight(result.metadata.timestamp.toISOString(), 32)} │`);
			lines.push('└─────────────────┴──────────────────────────────────┘');
			
			return {
				content: lines.join('\n'),
				exitCode: 0
			};
		} catch (error) {
			return {
				content: `Table formatting error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				exitCode: 1
			};
		}
	}
	
	private formatAsMinimal(result: GetPageResult): FormattedOutput {
		try {
			if (!result.success) {
				return {
					content: `Error: ${result.error || 'Unknown error'}`,
					exitCode: 1
				};
			}
			
			const lines: string[] = [];
			
			if (result.data) {
				if (result.data.id) {
					lines.push(`Page ID: ${result.data.id}`);
				}
				if (result.data.title) {
					lines.push(`Title: ${result.data.title}`);
				}
				if (result.data.path) {
					lines.push(`Path: ${result.data.path}`);
				}
				if (result.data.status) {
					lines.push(`Status: ${result.data.status}`);
				}
			}
			
			lines.push(`Result: Success (${result.metadata.duration}ms)`);
			
			return {
				content: lines.join('\n'),
				exitCode: 0
			};
		} catch (error) {
			return {
				content: `Minimal formatting error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				exitCode: 1
			};
		}
	}
	
	private formatError(result: GetPageResult): FormattedOutput {
		try {
			const lines: string[] = [];
			lines.push('┌─────────────────┬──────────────────────────────────┐');
			lines.push('│ Error Details   │                                  │');
			lines.push('├─────────────────┼──────────────────────────────────┤');
			lines.push(`│ Message         │ ${this.padRight(result.error || 'Unknown error', 32)} │`);
			lines.push(`│ Request ID      │ ${this.padRight(result.metadata.requestId, 32)} │`);
			lines.push(`│ Duration        │ ${this.padRight(result.metadata.duration + 'ms', 32)} │`);
			lines.push('└─────────────────┴──────────────────────────────────┘');
			
			return {
				content: lines.join('\n'),
				exitCode: 1
			};
		} catch (error) {
			return {
				content: `Error formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				exitCode: 1
			};
		}
	}
	
	private formatTableValue(value: any): string {
		try {
			if (value === null || value === undefined) {
				return 'N/A';
			}
			if (typeof value === 'object') {
				const jsonStr = JSON.stringify(value);
				return jsonStr.length > 30 ? jsonStr.substring(0, 30) + '...' : jsonStr;
			}
			if (typeof value === 'string' && value.length > 30) {
				return value.substring(0, 30) + '...';
			}
			return String(value);
		} catch (error) {
			return '[FORMAT_ERROR]';
		}
	}
	
	private padRight(str: string, length: number): string {
		try {
			if (str.length >= length) {
				return str.substring(0, length);
			}
			return str + ' '.repeat(length - str.length);
		} catch (error) {
			return str.substring(0, length);
		}
	}
	
	private shouldShowContent(content: any): boolean {
		try {
			// Only show content if it's short enough for table display
			if (typeof content === 'string') {
				return content.length <= 100;
			}
			return true;
		} catch (error) {
			return false;
		}
	}
}