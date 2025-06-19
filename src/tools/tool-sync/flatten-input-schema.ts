// Batch flatten input_schema for POST/PUT tools in mcp-tools-generated/tools-*.json
import * as fs from 'fs';
import * as path from 'path';
import { flattenSchema } from '../flattening/schema-resolver';

const GENERATED_DIR = path.resolve(__dirname, '../../mcp-tools-generated');

function flattenInputSchema(schema: any): {schema: any, changed: boolean} {
	if (!schema || typeof schema !== 'object') {
		return {schema, changed: false};
	}

	try {
		const originalJson = JSON.stringify(schema);
		const flattened = flattenSchema(schema);
		const flattenedJson = JSON.stringify(flattened);
		
		return {
			schema: flattened,
			changed: originalJson !== flattenedJson
		};
	} catch (error) {
		console.warn('Schema flattening failed, using original:', error);
		return {schema, changed: false};
	}
}

function processFile(filePath: string): boolean {
	let changed = false;
	const arr = JSON.parse(fs.readFileSync(filePath, 'utf8'));
	for (const tool of arr) {
		const method = (tool.method || '').toUpperCase();
		if (method === 'POST' || method === 'PUT') {
			const {schema: flat, changed: didChange} = flattenInputSchema(tool.input_schema);
			if (didChange) {
				tool.input_schema = flat;
				changed = true;
			}
		}
	}
	if (changed) {
		fs.writeFileSync(filePath, JSON.stringify(arr, null, '\t') + '\n', 'utf8');
	}
	return changed;
}

function main() {
	const files = fs.readdirSync(GENERATED_DIR)
		.filter(f => f.startsWith('tools-') && f.endsWith('.json'));
	let totalChanged = 0;
	for (const file of files) {
		const fullPath = path.join(GENERATED_DIR, file);
		if (processFile(fullPath)) {
			console.log('Updated:', file);
			totalChanged++;
		}
	}
	console.log('Flattening complete. Files updated:', totalChanged);
}

if (require.main === module) {
	try {
		main();
	} catch (e) {
		console.error('Error during flattening:', e);
		process.exit(1);
	}
}