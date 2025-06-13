// Orchestrator for MCP tool sync logic
import { iterateToolFiles } from './tool-file-iterator.js';
import { loadTools, writeTools } from './loader-writer.js';
import { fetchSwaggerSpec, getSwaggerEndpointSchemas } from './swagger-client.js';
import { extractToolSchemas } from './schema-extractor.js';
import { compareSchemas } from './comparator.js';
import { updateToolSchemas } from './update-logic.js';
import { enforceFileSize } from './file-size-enforcer.js';
import { validateTool } from './validator.js';
import { handleError } from './error-handler.js';

const TOOL_DIR = 'mcp-tools-generated';
const TOOL_FILE_PREFIX = 'tools-';
const TOOL_FILE_SUFFIX = '.json';
const TOOL_FILE_COUNT = 20;
const SWAGGER_URL = 'http://localhost/cxp4/swagger/v1/swagger.json';

export async function syncMcpTools() {
	try {
		const swagger = await fetchSwaggerSpec(SWAGGER_URL);
		for (const file of iterateToolFiles(TOOL_DIR, TOOL_FILE_PREFIX, TOOL_FILE_SUFFIX, TOOL_FILE_COUNT)) {
			let tools = await loadTools(file);
			let updated = false;
			for (const tool of tools) {
				const toolSchemas = extractToolSchemas(tool);
				const swaggerSchemas = getSwaggerEndpointSchemas(swagger, tool);
				if (!swaggerSchemas) continue;
				const diff = compareSchemas(toolSchemas, swaggerSchemas);
				if (diff) {
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