/**
 * Authentication Route Tests
 *
 * Tests session management routes (logout, refresh, me, sessions).
 * Apple Sign-In OAuth flow is tested via integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
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

  describe('GET /api/v1/auth/apple', () => {
    // Skip: Requires actual Apple credentials configured
    // The Apple auth flow is tested via integration tests
    it.skip('should return Apple auth URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/apple'
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty('authUrl');
      expect(body.authUrl).toContain('appleid.apple.com');

      // Should set security cookies
      const cookies = response.cookies;
      expect(cookies.find(c => c.name === 'apple_auth_state')).toBeDefined();
      expect(cookies.find(c => c.name === 'apple_auth_verifier')).toBeDefined();
      expect(cookies.find(c => c.name === 'apple_auth_nonce')).toBeDefined();
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
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe('me@example.com');
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

      // Cookies should be cleared (empty value)
      const accessTokenCookie = response.cookies.find(c => c.name === 'rd_access_token');
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
      const newAccessToken = response.cookies.find(c => c.name === 'rd_access_token');
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

  describe('GET /api/v1/auth/sessions', () => {
    it('should list active sessions', async () => {
      await createTestUser(app, 'sessions@example.com', 'testpassword');
      const { cookies } = await loginTestUser(app, 'sessions@example.com', 'testpassword');

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: { cookie: cookies }
      });

      expect(response.statusCode).toBe(200);

      const body = response.json();
      expect(body).toHaveProperty('sessions');
      expect(Array.isArray(body.sessions)).toBe(true);
      expect(body.sessions.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
