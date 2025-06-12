/**
 * Type definitions for get page CLI tool
 */

export interface GetPageCLIOptions {
	pageId?: string;
	path?: string;
	includeContent?: boolean;
	format: 'json' | 'table' | 'minimal';
	timeout: number;
	verbose: boolean;
	help?: boolean;
}

export interface GetPageRequest {
	pageId?: string;
	path?: string;
	includeContent: boolean;
}

export interface GetPageResult {
	success: boolean;
	data?: any;
	error?: string;
	metadata: GetPageMetadata;
}

export interface GetPageMetadata {
	requestId: string;
	timestamp: Date;
	duration: number;
	endpoint: string;
}

export interface FormattedOutput {
	content: string;
	exitCode: number;
}

export interface GetPageValidationError {
	field: string;
	message: string;
	code: string;
}