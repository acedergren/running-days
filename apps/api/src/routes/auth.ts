/**
 * Authentication Routes
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import * as argon2 from 'argon2';
import { eq, and } from 'drizzle-orm';
import { users, refreshTokens } from '@running-days/database';
import { hashToken } from '../plugins/auth.js';
import { config } from '../config.js';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/auth/register
   * Create a new user account
   */
  fastify.post('/register', async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const { email, password } = parseResult.data;

    // Check if user already exists
    const existingUser = await fastify.db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return reply.conflict('User with this email already exists');
    }

    // Hash password
    const passwordHash = await argon2.hash(password);

    // Create user
    const [newUser] = await fastify.db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'user'
      })
      .returning();

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: newUser.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'LOGIN',
      resource: '/auth/register',
      resource_type: 'user',
      outcome: 'success',
      phi_accessed: false
    });

    return reply.code(201).send({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      }
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate user and issue tokens
   */
  fastify.post('/login', async (request, reply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const { email, password } = parseResult.data;

    // Find user
    const user = await fastify.db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        null,
        false,
        'User not found'
      );
      return reply.unauthorized('Invalid credentials');
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

    // Verify password
    const validPassword = await argon2.verify(user.passwordHash, password);
    if (!validPassword) {
      fastify.auditLogger.logAuthEvent(
        request.raw as unknown as Request,
        user.id,
        false,
        'Invalid password'
      );
      return reply.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const accessToken = await fastify.jwt.sign({
      sub: user.id,
      email: user.email,
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
      path: '/api/v1/auth',
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
  });

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
    reply.clearCookie('rd_refresh_token', { path: '/api/v1/auth' });

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
      reply.clearCookie('rd_refresh_token', { path: '/api/v1/auth' });
      return reply.unauthorized('Invalid refresh token');
    }

    // Check expiry
    if (new Date(storedToken.expiresAt) < new Date()) {
      await fastify.db
        .update(refreshTokens)
        .set({ isRevoked: true })
        .where(eq(refreshTokens.id, storedToken.id));

      reply.clearCookie('rd_access_token', { path: '/' });
      reply.clearCookie('rd_refresh_token', { path: '/api/v1/auth' });
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
      email: user.email,
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
      path: '/api/v1/auth',
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
