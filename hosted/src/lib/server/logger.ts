/**
 * Application Logger
 *
 * Pino-based structured logging for the hosted app.
 * Provides consistent logging interface similar to Fastify's built-in logger.
 */

import pino from 'pino';
import { dev } from '$app/environment';

/**
 * Application logger instance
 *
 * In development: Pretty-printed output with colors
 * In production: JSON structured logs for log aggregation
 */
export const logger = pino({
	level: dev ? 'debug' : 'info',
	transport: dev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
					ignore: 'pid,hostname'
				}
			}
		: undefined
});

/**
 * Create a child logger with additional context
 * Useful for request-scoped logging
 */
export function createChildLogger(bindings: Record<string, unknown>) {
	return logger.child(bindings);
}
