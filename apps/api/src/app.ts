/**
 * Fastify Application Factory
 */

import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySensible from '@fastify/sensible';

import { config, type Config } from './config.js';
import { databasePlugin } from './plugins/database.js';
import { observabilityPlugin } from './plugins/observability.js';
import { authPlugin } from './plugins/auth.js';

import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { goalsRoutes } from './routes/goals.js';
import { statsRoutes } from './routes/stats.js';
import { webhookRoutes } from './routes/webhook.js';
import { outboundWebhookRoutes } from './routes/outbound-webhooks.js';
import { metricsRoutes } from './routes/metrics.js';

export interface AppOptions {
  config?: Partial<Config>;
  logger?: boolean;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const appConfig = { ...config, ...options.config };

  const app = Fastify({
    logger: options.logger ?? {
      level: appConfig.isDev ? 'debug' : 'info',
      transport: appConfig.isDev
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname'
            }
          }
        : undefined
    }
  });

  // Security plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false // Disable for API
  });

  await app.register(fastifyCors, {
    origin: appConfig.isDev ? true : ['https://running-days.com', 'https://app.running-days.com'],
    credentials: true
  });

  await app.register(fastifyRateLimit, {
    max: appConfig.rateLimitMax,
    timeWindow: appConfig.rateLimitWindow
  });

  // Utility plugins
  await app.register(fastifySensible);

  await app.register(fastifyCookie, {
    secret: appConfig.jwtSecret,
    hook: 'onRequest'
  });

  // Custom plugins
  await app.register(observabilityPlugin, { config: appConfig });
  await app.register(databasePlugin, { config: appConfig });
  await app.register(authPlugin, { config: appConfig });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(metricsRoutes, { prefix: '/metrics' });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(goalsRoutes, { prefix: '/api/v1/goals' });
  await app.register(statsRoutes, { prefix: '/api/v1/stats' });
  await app.register(webhookRoutes, { prefix: '/api/webhook' });
  await app.register(outboundWebhookRoutes, { prefix: '/api/v1/webhooks' });

  return app;
}
