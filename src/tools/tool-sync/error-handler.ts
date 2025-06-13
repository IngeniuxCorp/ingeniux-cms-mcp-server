// Error Handler: handles and reports errors

export function handleError(err: any): void {
	if (err instanceof Error) {
		console.error('[Tool Sync Error]', err.message);
	} else {
		console.error('[Tool Sync Error]', err);
	}
}