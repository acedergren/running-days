/**
 * Health Check Route Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createTestApp } from './setup.js';

describe('Health Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when database is connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.status).toBe('ready');
      expect(body).toHaveProperty('database');
      expect(body.database).toBe('connected');
    });
  });
});
