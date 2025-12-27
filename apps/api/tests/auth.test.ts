/**
 * Authentication Route Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { createTestApp, createTestUser, loginTestUser } from './setup.js';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await createTestUser(app, 'login@example.com', 'testpassword');
    });

    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'testpassword'
        }
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe('login@example.com');
      expect(body).toHaveProperty('message', 'Login successful');

      // Should set cookies
      const cookies = response.cookies;
      expect(cookies.find(c => c.name === 'access_token')).toBeDefined();
      expect(cookies.find(c => c.name === 'refresh_token')).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'wrongpassword'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'testpassword'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      await createTestUser(app, 'me@example.com', 'testpassword');
      const { cookies } = await loginTestUser(app, 'me@example.com', 'testpassword');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie: cookies }
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body.email).toBe('me@example.com');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear auth cookies', async () => {
      await createTestUser(app, 'logout@example.com', 'testpassword');
      const { cookies } = await loginTestUser(app, 'logout@example.com', 'testpassword');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie: cookies }
      });

      expect(response.statusCode).toBe(200);

      // Cookies should be cleared (max-age 0)
      const accessTokenCookie = response.cookies.find(c => c.name === 'access_token');
      expect(accessTokenCookie?.value).toBe('');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens', async () => {
      await createTestUser(app, 'refresh@example.com', 'testpassword');
      const { cookies } = await loginTestUser(app, 'refresh@example.com', 'testpassword');

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        headers: { cookie: cookies }
      });

      expect(response.statusCode).toBe(200);

      // Should set new cookies
      const newAccessToken = response.cookies.find(c => c.name === 'access_token');
      expect(newAccessToken).toBeDefined();
    });

    it('should reject without refresh token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
