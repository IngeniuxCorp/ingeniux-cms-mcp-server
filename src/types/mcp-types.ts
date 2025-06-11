/**
 * MCP protocol type definitions
 */

export interface MCPTool {
	name: string;
	description: string;
	inputSchema: JSONSchema;
	handler: (params: any) => Promise<ToolResult>;
}

export interface JSONSchema {
	type: string;
	properties?: Record<string, any>;
	required?: string[];
	additionalProperties?: boolean;
}

export interface ToolResult {
	content: ToolContent[];
	isError?: boolean;
}

export interface ToolContent {
	type: 'text' | 'image' | 'resource';
	text?: string;
	data?: string;
	mimeType?: string;
}

export interface MCPRequest {
	method: string;
	params?: any;
	id?: string | number;
}

export interface MCPResponse {
	result?: any;
	error?: MCPError;
	id: string | number | undefined;
}

export interface MCPError {
	code: number;
	message: string;
	data?: any;
}

export interface AuthenticatedRequest extends MCPRequest {
	headers: Record<string, string>;
}

export interface ToolRegistry {
	tools: Map<string, MCPTool>;
	registerTool(tool: MCPTool): void;
	getTool(name: string): MCPTool | undefined;
	listTools(): MCPTool[];
}

export interface RequestContext {
	requestId: string;
	timestamp: Date;
	toolName?: string;
	userId?: string;
}