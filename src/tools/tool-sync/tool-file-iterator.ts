// Tool File Iterator: yields tool JSON file paths for sync logic
import * as path from 'path';

export function* iterateToolFiles(
	toolDir: string,
	prefix: string,
	suffix: string,
	count: number
): Generator<string> {
	for (let i = 1; i <= count; i++) {
		yield path.join(toolDir, `${prefix}${i}${suffix}`);
	}
}