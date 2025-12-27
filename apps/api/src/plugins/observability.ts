/**
 * Observability Plugin
 * Provides logging, metrics, and audit logging
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import {
  createLogger,
  createAppLogger,
  createMetricsRegistry,
  createMetricsHelpers,
  createAuditLogger,
  type AppLogger,
  type MetricsHelpers,
  type AuditLogger
} from '@running-days/observability';
import type { Config } from '../config.js';

declare module 'fastify' {
  interface FastifyInstance {
    appLogger: AppLogger;
    metrics: MetricsHelpers;
    auditLogger: AuditLogger;
  }
}

interface ObservabilityPluginOptions {
  config: Config;
}

const observabilityPluginImpl: FastifyPluginAsync<ObservabilityPluginOptions> = async (
  fastify,
  options
) => {
  const { config } = options;

  // Create logger
  const logger = createLogger({
    isDev: config.isDev,
    logDir: 'logs',
    appName: 'running-days-api'
  });

  const appLogger = createAppLogger(logger);

  // Create metrics
  const metricsRegistry = createMetricsRegistry();
  const metricsHelpers = createMetricsHelpers(metricsRegistry);

  // Create audit logger
  const auditLogger = createAuditLogger({
    logger,
    metricsHelpers
  });

  // Decorate fastify instance
  fastify.decorate('appLogger', appLogger);
  fastify.decorate('metrics', metricsHelpers);
  fastify.decorate('auditLogger', auditLogger);

  // Request timing hook
  fastify.addHook('onRequest', async (request) => {
    request.startTime = performance.now();
  });

  // Response logging hook
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = performance.now() - (request.startTime ?? 0);
    const route = request.routeOptions?.url ?? request.url;

    metricsHelpers.recordHttpRequest(
      request.method,
      route,
      reply.statusCode,
      duration
    );

    fastify.log.info({
      req: {
        method: request.method,
        url: request.url,
        id: request.id
      },
      res: {
        statusCode: reply.statusCode
      },
      responseTime: duration.toFixed(2)
    });
  });

  appLogger.startup();
};

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export const observabilityPlugin = fp(observabilityPluginImpl, {
  name: 'observability',
  fastify: '5.x'
});
