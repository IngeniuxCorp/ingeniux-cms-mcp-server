/**
 * Structured logging utility for Ingeniux CMS MCP Server
 */

import winston from 'winston';
import { LoggingConfig } from '../types/config-types.js';

export class Logger {
	private static instance: Logger;
	private logger: winston.Logger;

	private constructor(config?: LoggingConfig) {
		this.logger = this.createLogger(config);
	}

	public static getInstance(config?: LoggingConfig): Logger {
		if (!Logger.instance) {
			Logger.instance = new Logger(config);
		}
		return Logger.instance;
	}

	/**
	 * Create Winston logger instance
	 */
	private createLogger(config?: LoggingConfig): winston.Logger {
		const logLevel = config?.level || 'info';
		const format = config?.format || 'json';

		const logFormat = format === 'json' 
			? winston.format.combine(
				winston.format.timestamp(),
				winston.format.errors({ stack: true }),
				winston.format.json()
			)
			: winston.format.combine(
				winston.format.timestamp(),
				winston.format.errors({ stack: true }),
				winston.format.simple()
			);

		const transports: winston.transport[] = [
			new winston.transports.Console({
				handleExceptions: true,
				handleRejections: true
			})
		];

		// Add file transport if enabled
		if (process.env.ENABLE_FILE_LOGGING === 'true') {
			const logFilePath = process.env.LOG_FILE_PATH || './logs/mcp-server.log';
			try {
				transports.push(new winston.transports.File({
					filename: logFilePath,
					handleExceptions: true,
					handleRejections: true,
					maxsize: 5242880, // 5MB
					maxFiles: 5
				}));
			} catch (error) {
				console.warn('Failed to create file transport:', error);
			}
		}

		return winston.createLogger({
			level: logLevel,
			format: logFormat,
			defaultMeta: { service: 'ingeniux-cms-mcp-server' },
			transports,
			exitOnError: false
		});
	}

	/**
	 * Log error message
	 */
	public error(message: string, meta?: any): void {
		try {
			this.logger.error(message, meta);
		} catch (error) {
			console.error('Logger error:', error);
			console.error('Original message:', message, meta);
		}
	}

	/**
	 * Log warning message
	 */
	public warn(message: string, meta?: any): void {
		try {
			this.logger.warn(message, meta);
		} catch (error) {
			console.warn('Logger warning:', error);
			console.warn('Original message:', message, meta);
		}
	}

	/**
	 * Log info message
	 */
	public info(message: string, meta?: any): void {
		try {
			this.logger.info(message, meta);
		} catch (error) {
			console.info('Logger info:', error);
			console.info('Original message:', message, meta);
		}
	}

	/**
	 * Log debug message
	 */
	public debug(message: string, meta?: any): void {
		try {
			this.logger.debug(message, meta);
		} catch (error) {
			console.debug('Logger debug:', error);
			console.debug('Original message:', message, meta);
		}
	}

	/**
	 * Log HTTP request
	 */
	public logRequest(method: string, url: string, status?: number, duration?: number): void {
		try {
			const meta = {
				method,
				url,
				status,
				duration,
				type: 'http_request'
			};
			this.info(`${method} ${url}`, meta);
		} catch (error) {
			console.error('Request logging error:', error);
		}
	}

	/**
	 * Log authentication events
	 */
	public logAuth(event: string, userId?: string, success?: boolean): void {
		try {
			const meta = {
				event,
				userId,
				success,
				type: 'authentication'
			};
			this.info(`Auth event: ${event}`, meta);
		} catch (error) {
			console.error('Auth logging error:', error);
		}
	}

	/**
	 * Log tool execution
	 */
	public logTool(toolName: string, duration?: number, success?: boolean, error?: string): void {
		try {
			const meta = {
				toolName,
				duration,
				success,
				error,
				type: 'tool_execution'
			};
			
			if (success) {
				this.info(`Tool executed: ${toolName}`, meta);
			} else {
				this.error(`Tool failed: ${toolName}`, meta);
			}
		} catch (logError) {
			console.error('Tool logging error:', logError);
		}
	}

	/**
	 * Update logger configuration
	 */
	public updateConfig(config: LoggingConfig): void {
		try {
			this.logger.level = config.level;
			this.info('Logger configuration updated', { newLevel: config.level });
		} catch (error) {
			console.error('Logger config update error:', error);
		}
	}

	/**
	 * Get current log level
	 */
	public getLevel(): string {
		return this.logger.level;
	}

	/**
	 * Close logger and cleanup resources
	 */
	public close(): Promise<void> {
		return new Promise((resolve) => {
			try {
				this.logger.end(() => {
					resolve();
				});
			} catch (error) {
				console.error('Logger close error:', error);
				resolve();
			}
		});
	}
}

// Export singleton instance
export const logger = Logger.getInstance();