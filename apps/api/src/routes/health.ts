/**
 * Health Check Routes
 */

import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Basic health check
  fastify.get('/', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  });

  // Ready check - verifies database connection
  fastify.get('/ready', async (request, reply) => {
    try {
      // Simple query to verify database is accessible
      const result = fastify.db.query.goals.findFirst();
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: 'connected'
      };
    } catch (error) {
      return reply.serviceUnavailable('Database not ready');
    }
  });

  // Live check - basic liveness
  fastify.get('/live', async () => {
    return {
      status: 'live',
      timestamp: new Date().toISOString()
    };
  });
};
