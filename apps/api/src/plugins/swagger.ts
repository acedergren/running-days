/**
 * Swagger/OpenAPI Plugin
 *
 * Auto-generates OpenAPI 3.0 specification from route schemas
 */

import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

interface SwaggerPluginOptions {
  config: Config;
}

async function swaggerPlugin(
  app: FastifyInstance,
  { config }: SwaggerPluginOptions
): Promise<void> {
  // Only enable in development or when explicitly configured
  if (!config.isDev && !process.env.ENABLE_SWAGGER) {
    return;
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Running Days API',
        description: 'Backend API for Running Days fitness tracking application',
        version: '1.0.0',
        contact: {
          name: 'Running Days',
          url: 'https://github.com/acedergren/running-days'
        },
        license: {
          name: 'AGPL-3.0',
          url: 'https://www.gnu.org/licenses/agpl-3.0.html'
        }
      },
      servers: [
        {
          url: config.isDev ? 'http://localhost:3000' : 'https://api.running-days.com',
          description: config.isDev ? 'Development server' : 'Production server'
        }
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Goals', description: 'Goal management endpoints' },
        { name: 'Stats', description: 'Statistics and dashboard data' },
        { name: 'Webhooks', description: 'Webhook management' },
        { name: 'Health', description: 'Health check endpoints' }
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'access_token',
            description: 'JWT access token stored in httpOnly cookie'
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true
    },
    staticCSP: true
  });

  app.log.info('Swagger UI available at /docs');
}

export default fp(swaggerPlugin, {
  name: 'swagger',
  dependencies: []
});
