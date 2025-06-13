// Loader/Writer for tool JSON files
import { promises as fs } from 'fs';

export async function loadTools(file: string): Promise<any[]> {
	try {
		const data = await fs.readFile(file, 'utf8');
		return JSON.parse(data);
	} catch (err) {
		throw new Error(`Failed to load tools from ${file}: ${err}`);
	}
}

export async function writeTools(file: string, tools: any[]): Promise<void> {
	try {
		const json = JSON.stringify(tools, null, '\t');
		await fs.writeFile(file, json, 'utf8');
	} catch (err) {
		throw new Error(`Failed to write tools to ${file}: ${err}`);
	}
}