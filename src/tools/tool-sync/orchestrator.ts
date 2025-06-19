/*
 * Orchestrator for MCP tool sync logic
 * Loads swagger.json from local file instead of fetching from URL.
 */
import { iterateToolFiles } from './tool-file-iterator.js';
import { loadTools, writeTools } from './loader-writer.js';
import { getSwaggerEndpointSchemas } from './swagger-client.js';
import { extractToolSchemas } from './schema-extractor.js';
import { ContentDiffer } from '../comparison/content-differ';
import { updateToolSchemas } from './update-logic.js';
import { enforceFileSize } from './file-size-enforcer.js';
import { validateTool } from './validator.js';
import { handleError } from './error-handler.js';
import { readFile } from 'fs/promises';

const TOOL_DIR = 'mcp-tools-generated';
const TOOL_FILE_PREFIX = 'tools-';
const TOOL_FILE_SUFFIX = '.json';
const TOOL_FILE_COUNT = 20;
const SWAGGER_PATH = 'def/swagger.json';

export async function syncMcpTools() {
	try {
		const swaggerRaw = await readFile(SWAGGER_PATH, 'utf-8');
		const swagger = JSON.parse(swaggerRaw);
		const differ = new ContentDiffer();
		
		for (const file of iterateToolFiles(TOOL_DIR, TOOL_FILE_PREFIX, TOOL_FILE_SUFFIX, TOOL_FILE_COUNT)) {
			let tools = await loadTools(file);
			let updated = false;
			for (const tool of tools) {
				const toolSchemas = extractToolSchemas(tool);
				const swaggerSchemas = getSwaggerEndpointSchemas(swagger, tool);
				if (!swaggerSchemas) continue;
				
				const diffResult = differ.compareSchemas(toolSchemas, swaggerSchemas);
				if (diffResult.hasChanges) {
					updateToolSchemas(tool, swaggerSchemas);
					updated = true;
				}
				if (!validateTool(tool)) {
					handleError(`Invalid schema for tool ${tool.tool_name} in ${file}`);
				}
			}
			if (updated) {
				await writeTools(file, tools);
				enforceFileSize(file);
			}
		}
	} catch (err) {
		handleError(err);
	}
}