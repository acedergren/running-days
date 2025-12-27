import pino from 'pino';
import { dev } from '$app/environment';
import { mkdirSync, existsSync } from 'fs';

// Ensure logs directory exists
const LOG_DIR = 'logs';
if (!existsSync(LOG_DIR)) {
	mkdirSync(LOG_DIR, { recursive: true });
}

// Configure pino logger
export const logger = pino({
	level: dev ? 'debug' : 'info',
	// Use pretty printing in development, JSON in production
	transport: dev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:standard',
					ignore: 'pid,hostname'
				}
			}
		: {
				targets: [
					// Console output
					{
						target: 'pino/file',
						options: { destination: 1 } // stdout
					},
					// File output for Promtail
					{
						target: 'pino/file',
						options: { destination: `${LOG_DIR}/app.log` }
					}
				]
			},
	// Base fields included in every log
	base: {
		app: 'running-days',
		env: dev ? 'development' : 'production'
	}
});

// Request logger - creates child logger with request context
export function createRequestLogger(requestId: string) {
	return logger.child({ req_id: requestId });
}

// Typed log methods for common operations
export const appLogger = {
	// HTTP request logging
	request(req: { method: string; url: string; id: string }) {
		logger.info({ req }, 'HTTP request');
	},

	response(req: { method: string; url: string; id: string }, res: { statusCode: number }, responseTime: number) {
		logger.info({ req, res, responseTime }, 'HTTP response');
	},

	// Webhook logging
	webhookReceived(source: string, payloadSize: number) {
		logger.info({ webhook: { source, payloadSize } }, 'Webhook received');
	},

	webhookProcessed(source: string, workoutsCount: number, duration: number) {
		logger.info({ webhook: { source, workoutsCount, duration } }, 'Webhook processed');
	},

	webhookError(source: string, error: Error) {
		logger.error({ webhook: { source }, err: error }, 'Webhook error');
	},

	// Database logging
	dbQuery(operation: string, table: string, duration: number) {
		logger.debug({ db: { operation, table, duration } }, 'Database query');
	},

	dbError(operation: string, table: string, error: Error) {
		logger.error({ db: { operation, table }, err: error }, 'Database error');
	},

	// Application events
	startup() {
		logger.info('Application starting');
	},

	shutdown() {
		logger.info('Application shutting down');
	},

	// Error logging
	error(message: string, error: Error, context?: Record<string, unknown>) {
		logger.error({ err: error, ...context }, message);
	},

	warn(message: string, context?: Record<string, unknown>) {
		logger.warn(context, message);
	},

	info(message: string, context?: Record<string, unknown>) {
		logger.info(context, message);
	},

	debug(message: string, context?: Record<string, unknown>) {
		logger.debug(context, message);
	}
};

export default logger;
