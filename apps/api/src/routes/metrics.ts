/**
 * Prometheus Metrics Route
 */

import { FastifyPluginAsync } from 'fastify';

export const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    const metrics = await fastify.metrics.getMetrics();
    return reply
      .header('Content-Type', fastify.metrics.getContentType())
      .send(metrics);
  });
};
