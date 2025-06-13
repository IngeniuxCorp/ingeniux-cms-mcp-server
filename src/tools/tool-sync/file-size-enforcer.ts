// File Size Enforcer: ensures tool file is <500 lines

import { promises as fs } from 'fs';

export async function enforceFileSize(file: string): Promise<void> {
	const data = await fs.readFile(file, 'utf8');
	const lines = data.split('\n');
	if (lines.length > 500) {
		throw new Error(`File ${file} exceeds 500 lines (${lines.length})`);
	}
}