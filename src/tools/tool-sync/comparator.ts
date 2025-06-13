// Comparator: compares tool and Swagger schemas (input/output)
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a !== 'object' || a === null || b === null) return false;
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (!bKeys.includes(key)) return false;
		if (!deepEqual(a[key], b[key])) return false;
	}
	return true;
}

// Returns true if schemas differ, false if equal
export function compareSchemas(
	a: {input_schema: any, output_schema: any},
	b: {input_schema: any, output_schema: any}
): boolean {
	return !deepEqual(a.input_schema, b.input_schema) || !deepEqual(a.output_schema, b.output_schema);
}