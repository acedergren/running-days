/**
 * Session Management
 *
 * Secure session handling with:
 * - HTTP-only cookies (XSS protection)
 * - Secure flag (HTTPS only)
 * - SameSite=Lax (CSRF protection)
 * - Short-lived sessions with refresh
 */

import { query, queryOne, execute } from '../db/index.js';
import { logAudit, type AuditContext } from '../audit.js';
import { randomBytes } from 'crypto';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'rd_session';
const SESSION_DURATION_HOURS = 24 * 7; // 1 week

interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
	ipAddress: string | null;
	userAgent: string | null;
}

/**
 * Create a new session for a user
 */
export async function createSession(
	userId: string,
	context: AuditContext
): Promise<string> {
	const sessionId = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

	await execute(
		`INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
		 VALUES (:id, :userId, :expiresAt, :ipAddress, :userAgent)`,
		{
			id: sessionId,
			userId,
			expiresAt,
			ipAddress: context.ipAddress || null,
			userAgent: context.userAgent?.substring(0, 500) || null
		}
	);

	await logAudit(userId, 'login', 'sessions', sessionId, context);

	return sessionId;
}

/**
 * Validate a session and return user ID
 */
export async function validateSession(sessionId: string): Promise<string | null> {
	const session = await queryOne<{ USER_ID: string; EXPIRES_AT: Date }>(
		`SELECT user_id, expires_at FROM sessions
		 WHERE id = :sessionId AND expires_at > SYSTIMESTAMP`,
		{ sessionId }
	);

	return session?.USER_ID || null;
}

/**
 * Destroy a session (logout)
 */
export async function destroySession(
	sessionId: string,
	context?: AuditContext
): Promise<void> {
	const session = await queryOne<{ USER_ID: string }>(
		`SELECT user_id FROM sessions WHERE id = :sessionId`,
		{ sessionId }
	);

	if (session) {
		await execute(`DELETE FROM sessions WHERE id = :sessionId`, { sessionId });
		await logAudit(session.USER_ID, 'logout', 'sessions', sessionId, context);
	}
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions(): Promise<number> {
	return execute(`DELETE FROM sessions WHERE expires_at < SYSTIMESTAMP`);
}

/**
 * Set session cookie
 */
export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: SESSION_DURATION_HOURS * 60 * 60
	});
}

/**
 * Get session ID from cookie
 */
export function getSessionCookie(cookies: Cookies): string | undefined {
	return cookies.get(SESSION_COOKIE);
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ============================================================================
// SESSION TIMEOUT BEHAVIOR
// ============================================================================
// This is a security vs UX trade-off. Options:
// 1. Hard timeout: Session expires exactly at expiresAt
// 2. Sliding window: Extend session on each request
// 3. Hybrid: Extend only if > 50% of session time has passed
//
// TODO: Implement your preferred timeout behavior below
// ============================================================================

/**
 * Check if a session should be extended based on the hybrid timeout policy
 *
 * Policy: Extend session only if more than half the session duration has passed.
 * This balances security (sessions eventually expire) with UX (active users stay logged in).
 *
 * @param sessionId - The session ID to check
 * @returns Whether to extend the session, or false if session not found
 */
export async function shouldExtendSession(sessionId: string): Promise<boolean> {
	const session = await queryOne<{ EXPIRES_AT: Date }>(
		`SELECT expires_at FROM sessions WHERE id = :sessionId AND expires_at > SYSTIMESTAMP`,
		{ sessionId }
	);

	if (!session) {
		return false;
	}

	const now = new Date();
	const sessionDuration = SESSION_DURATION_HOURS * 60 * 60 * 1000;

	// Calculate when the session was created based on expiry
	const createdAt = new Date(session.EXPIRES_AT.getTime() - sessionDuration);
	const elapsed = now.getTime() - createdAt.getTime();

	// Extend only if more than half the session has passed
	return elapsed > sessionDuration / 2;
}

/**
 * Extend session expiration
 */
export async function extendSession(sessionId: string): Promise<void> {
	const newExpiry = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
	await execute(
		`UPDATE sessions SET expires_at = :newExpiry WHERE id = :sessionId`,
		{ sessionId, newExpiry }
	);
}
