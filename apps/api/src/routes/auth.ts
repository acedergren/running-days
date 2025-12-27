/**
 * Authentication Routes
 *
 * Supports Apple Sign-In OAuth with PKCE and nonce validation.
 * Password auth has been removed in favor of Apple Sign-In only.
 */

import { FastifyPluginAsync } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { users, refreshTokens } from '@running-days/database';
import { hashToken } from '../plugins/auth.js';
import { config } from '../config.js';
import {
  getAppleAuthUrl,
  authenticateWithApple,
  generateCodeVerifier,
  generateCodeChallenge,
  generateNonce,
  generateState
} from '../lib/apple-auth.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================================================
  // APPLE SIGN-IN ROUTES
  // ============================================================================

  /**
   * GET /api/v1/auth/apple
   * Initiate Apple Sign-In flow
   * Returns the authorization URL and sets security cookies
   */
  fastify.get('/apple', async (request, reply) => {
    // Generate security tokens
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const nonce = generateNonce();

    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
      maxAge: 600 // 10 minutes
    };

    // Set security cookies
    reply.setCookie('apple_auth_state', state, cookieOptions);
    reply.setCookie('apple_auth_verifier', codeVerifier, cookieOptions);
    reply.setCookie('apple_auth_nonce', nonce, cookieOptions);

    // Generate auth URL
    const authUrl = getAppleAuthUrl(state, codeChallenge, nonce);

    return { authUrl };
  });

  /**
   * POST /api/v1/auth/apple/callback
   * Handle Apple Sign-In callback
   * Validates PKCE, nonce, and creates/updates user
   */
  fastify.post<{
    Body: { code: string; state: string }
  }>('/apple/callback', async (request, reply) => {
    const { code, state } = request.body;

    // Validate inputs
    if (!code || typeof code !== 'string') {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'Missing authorization code'
      );
      return reply.badRequest('Missing authorization code');
    }

    if (!state || typeof state !== 'string') {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'Missing state parameter'
      );
      return reply.badRequest('Missing state parameter');
    }

    // Retrieve security cookies
    const savedState = request.cookies.apple_auth_state;
    const codeVerifier = request.cookies.apple_auth_verifier;
    const expectedNonce = request.cookies.apple_auth_nonce;

    // Clear security cookies
    reply.clearCookie('apple_auth_state', { path: '/api/v1/auth' });
    reply.clearCookie('apple_auth_verifier', { path: '/api/v1/auth' });
    reply.clearCookie('apple_auth_nonce', { path: '/api/v1/auth' });

    // Validate state (CSRF protection)
    if (state !== savedState) {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'Invalid state parameter'
      );
      return reply.badRequest('Invalid state parameter');
    }

    // Validate PKCE verifier exists
    if (!codeVerifier) {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'Missing PKCE verifier'
      );
      return reply.badRequest('Missing PKCE verifier - please restart sign-in');
    }

    // Validate nonce exists
    if (!expectedNonce) {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'Missing nonce'
      );
      return reply.badRequest('Missing nonce - please restart sign-in');
    }

    try {
      // Exchange code for user info
      const appleUser = await authenticateWithApple(code, codeVerifier, expectedNonce);

      // Check if user exists by Apple ID
      let user = await fastify.db.query.users.findFirst({
        where: eq(users.appleUserId, appleUser.sub)
      });

      if (!user) {
        // Create new user
        const [newUser] = await fastify.db
          .insert(users)
          .values({
            appleUserId: appleUser.sub,
            email: appleUser.email || null,
            emailVerified: appleUser.emailVerified ?? false,
            authProvider: 'apple',
            role: 'user'
          })
          .returning();

        user = newUser;

        fastify.auditLogger.logAuditEvent({
          user_id: user.id,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'] || 'unknown',
          action: 'LOGIN',
          resource: '/auth/apple/callback',
          resource_type: 'user',
          outcome: 'success',
          phi_accessed: false
        });
      }

      if (!user.isActive) {
        fastify.auditLogger.logAuthEvent(
          request.raw as unknown as Request,
          user.id,
          false,
          'Account disabled'
        );
        return reply.forbidden('Account is disabled');
      }

      // Generate tokens
      const accessToken = await fastify.jwt.sign({
        sub: user.id,
        email: user.email ?? '',
        role: user.role as 'user' | 'admin'
      });

      const refreshToken = await fastify.jwt.generateRefreshToken();
      const tokenHash = await hashToken(refreshToken);

      // Calculate expiry
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiryDays);

      // Store refresh token
      await fastify.db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: expiresAt.toISOString(),
        userAgent: request.headers['user-agent'] || null,
        ipAddress: request.ip
      });

      // Update last login
      await fastify.db
        .update(users)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(users.id, user.id));

      // Log success
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        user.id,
        true
      );

      // Set cookies
      reply.setCookie('rd_access_token', accessToken, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 // 15 minutes
      });

      reply.setCookie('rd_refresh_token', refreshToken, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: 'strict',
        path: '/',
        maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      fastify.log.error({ err }, 'Apple auth error');

      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        message.includes('Nonce') ? 'nonce_mismatch' : 'token_exchange_failed'
      );

      return reply.internalServerError('Authentication failed');
    }
  });

  // ============================================================================
  // SESSION MANAGEMENT ROUTES (work with any auth provider)
  // ============================================================================

  /**
   * POST /api/v1/auth/logout
   * Revoke refresh token and clear cookies
   */
  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.rd_refresh_token;

    if (refreshToken) {
      const tokenHash = await hashToken(refreshToken);

      // Revoke the token
      await fastify.db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    // Clear cookies
    reply.clearCookie('rd_access_token', { path: '/' });
    reply.clearCookie('rd_refresh_token', { path: '/' });

    return { success: true };
  });

  /**
   * POST /api/v1/auth/refresh
   * Issue new access token using refresh token
   */
  fastify.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.rd_refresh_token;

    if (!refreshToken) {
      return reply.unauthorized('No refresh token provided');
    }

    const tokenHash = await hashToken(refreshToken);

    // Find the token
    const storedToken = await fastify.db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.isRevoked, false)
      )
    });

    if (!storedToken) {
      reply.clearCookie('rd_access_token', { path: '/' });
      reply.clearCookie('rd_refresh_token', { path: '/' });
      return reply.unauthorized('Invalid refresh token');
    }

    // Check expiry
    if (new Date(storedToken.expiresAt) < new Date()) {
      await fastify.db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.id, storedToken.id));

      reply.clearCookie('rd_access_token', { path: '/' });
      reply.clearCookie('rd_refresh_token', { path: '/' });
      return reply.unauthorized('Refresh token expired');
    }

    // Get user
    const user = await fastify.db.query.users.findFirst({
      where: eq(users.id, storedToken.userId)
    });

    if (!user || !user.isActive) {
      return reply.unauthorized('User not found or disabled');
    }

    // Revoke old token (rotation)
    await fastify.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, storedToken.id));

    // Generate new tokens
    const newAccessToken = await fastify.jwt.sign({
      sub: user.id,
      email: user.email ?? '',
      role: user.role as 'user' | 'admin'
    });

    const newRefreshToken = await fastify.jwt.generateRefreshToken();
    const newTokenHash = await hashToken(newRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiryDays);

    // Store new refresh token
    await fastify.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: expiresAt.toISOString(),
      userAgent: request.headers['user-agent'] || null,
      ipAddress: request.ip
    });

    // Set new cookies
    reply.setCookie('rd_access_token', newAccessToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60
    });

    reply.setCookie('rd_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: 'strict',
      path: '/',
      maxAge: config.refreshTokenExpiryDays * 24 * 60 * 60
    });

    return { success: true };
  });

  /**
   * GET /api/v1/auth/me
   * Get current user info
   */
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    return {
      user: request.user
    };
  });

  /**
   * GET /api/v1/auth/sessions
   * List active sessions for current user
   */
  fastify.get('/sessions', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const sessions = await fastify.db.query.refreshTokens.findMany({
      where: and(
        eq(refreshTokens.userId, request.user!.id),
        eq(refreshTokens.isRevoked, false)
      )
    });

    return {
      sessions: sessions
        .filter(s => new Date(s.expiresAt) > new Date())
        .map(s => ({
          id: s.id,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt
        }))
    };
  });

  /**
   * DELETE /api/v1/auth/sessions/:id
   * Revoke a specific session
   */
  fastify.delete<{ Params: { id: string } }>('/sessions/:id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { id } = request.params;

    // Find and verify ownership
    const session = await fastify.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.id, id)
    });

    if (!session || session.userId !== request.user!.id) {
      return reply.notFound('Session not found');
    }

    // Revoke
    await fastify.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, id));

    return { success: true };
  });
};
