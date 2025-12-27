/**
 * Authentication domain types
 */

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  role?: 'user' | 'admin';
}

export interface RefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  isRevoked: boolean;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

export interface WebhookToken {
  id: number;
  token: string;
  name: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}
