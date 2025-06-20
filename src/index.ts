/**
 * Entry point for Ingeniux CMS MCP Server
 */

import 'dotenv/config';
import { mcpServer } from './core/mcp-server.js';
import { configManager } from './utils/config-manager.js';
import { logger } from './utils/logger.js';

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
	try {

		// Check required environment variables
		const envCheck = configManager.checkRequiredEnvVars();
		if (!envCheck.isValid) {
			logger.error('Environment validation failed', { errors: envCheck.errors });
			process.exit(1);
		}

		// Start the MCP server
		await mcpServer.start();

		// Handle graceful shutdown
		process.on('SIGINT', async () => {
			logger.info('Received SIGINT, shutting down gracefully...');
			await shutdown();
		});

		process.on('SIGTERM', async () => {
			logger.info('Received SIGTERM, shutting down gracefully...');
			await shutdown();
		});

		process.on('uncaughtException', (error) => {
			logger.error('Uncaught exception', { error: error.message, stack: error.stack });
			process.exit(1);
		});

		process.on('unhandledRejection', (reason, promise) => {
			logger.error('Unhandled rejection', { reason, promise });
			process.exit(1);
		});

		logger.info('MCP server is running and ready to accept connections');
	} catch (error) {
		logger.error('Failed to start MCP server', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		process.exit(1);
	}
}

/**
 * Graceful shutdown handler
 */
async function shutdown(): Promise<void> {
	try {
		await mcpServer.stop();
		logger.info('Server shutdown completed');
		process.exit(0);
	} catch (error) {
		logger.error('Error during shutdown', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});
		process.exit(1);
	}
}

// const metaUrl = import.meta.url;
// const argUrl = `file:///${process.argv[1]}`.replace(/\\/g, '/'); // Normalize path for Windows compatibility
// // Start the server if this file is run directly
// if (metaUrl === argUrl) {
main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
// }

export { mcpServer };