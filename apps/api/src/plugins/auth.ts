/**
 * Authentication Plugin
 * Provides JWT utilities and user context
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';
import type { Config } from '../config.js';
import type { AccessTokenPayload } from '@running-days/types';

declare module 'fastify' {
  interface FastifyInstance {
    jwt: {
      sign: (payload: Omit<AccessTokenPayload, 'iat' | 'exp'>) => Promise<string>;
      verify: (token: string) => Promise<AccessTokenPayload | null>;
      generateRefreshToken: () => Promise<string>;
    };
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: 'user' | 'admin';
    };
  }
}

interface AuthPluginOptions {
  config: Config;
}

const authPluginImpl: FastifyPluginAsync<AuthPluginOptions> = async (fastify, options) => {
  const { config } = options;
  const secret = new TextEncoder().encode(config.jwtSecret);

  /**
   * Sign an access token
   */
  async function sign(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): Promise<string> {
    return new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(config.accessTokenExpiry)
      .sign(secret);
  }

  /**
   * Verify an access token
   */
  async function verify(token: string): Promise<AccessTokenPayload | null> {
    try {
      const { payload } = await jose.jwtVerify(token, secret);
      // Validate required fields exist
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        (payload.role !== 'user' && payload.role !== 'admin')
      ) {
        return null;
      }
      return payload as unknown as AccessTokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Generate a random refresh token
   */
  async function generateRefreshToken(): Promise<string> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Decorate with JWT utilities
  fastify.decorate('jwt', {
    sign,
    verify,
    generateRefreshToken
  });

  /**
   * Authentication hook - extracts and validates JWT
   */
  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Try to get token from cookie first, then Authorization header
    const cookieToken = request.cookies.rd_access_token;
    const headerToken = request.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return reply.unauthorized('Missing authentication token');
    }

    const payload = await verify(token);
    if (!payload) {
      return reply.unauthorized('Invalid or expired token');
    }

    // Attach user to request
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }

  fastify.decorate('authenticate', authenticate);
};

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
  dependencies: ['@fastify/cookie', '@fastify/sensible'],
  fastify: '5.x'
});

/**
 * Helper to hash refresh tokens before storing
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
