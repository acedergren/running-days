/**
 * Structured logging with Pino
 */

import pino, { type Logger } from 'pino';
import { mkdirSync, existsSync } from 'fs';

export interface LoggerConfig {
  isDev: boolean;
  logDir?: string;
  appName?: string;
}

/**
 * Create a configured Pino logger
 */
export function createLogger(config: LoggerConfig): Logger {
  const { isDev, logDir = 'logs', appName = 'running-days' } = config;

  // Ensure logs directory exists in production
  if (!isDev && !existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  return pino({
    level: isDev ? 'debug' : 'info',
    transport: isDev
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
              options: { destination: `${logDir}/app.log` }
            }
          ]
        },
    base: {
      app: appName,
      env: isDev ? 'development' : 'production'
    }
  });
}

/**
 * Create a child logger with request context
 */
export function createRequestLogger(logger: Logger, requestId: string): Logger {
  return logger.child({ req_id: requestId });
}

/**
 * Create typed application logger methods
 */
export function createAppLogger(logger: Logger) {
  return {
    // HTTP request logging
    request(req: { method: string; url: string; id: string }) {
      logger.info({ req }, 'HTTP request');
    },

    response(
      req: { method: string; url: string; id: string },
      res: { statusCode: number },
      responseTime: number
    ) {
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
}

export type AppLogger = ReturnType<typeof createAppLogger>;
