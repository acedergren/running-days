/**
 * SvelteKit Server Hooks
 *
 * Handles:
 * - Session validation on every request
 * - User context injection into locals
 * - Session extension (sliding window)
 * - Security headers (HSTS, CSP, etc.)
 */

import type { Handle } from '@sveltejs/kit';
import { initDatabase } from '$lib/server/db/index.js';
import { logger } from '$lib/server/logger.js';
import {
	validateSession,
	getSessionCookie,
	extendSession,
	shouldExtendSession
} from '$lib/server/auth/session.js';

// Initialize database on first request
let dbInitialized = false;

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize database connection pool
	if (!dbInitialized) {
		await initDatabase();
		dbInitialized = true;
	}

	// Extract session from cookie
	const sessionId = getSessionCookie(event.cookies);

	if (sessionId) {
		const userId = await validateSession(sessionId);

		if (userId) {
			// Inject user context into locals
			event.locals.userId = userId;
			event.locals.sessionId = sessionId;

			// Check if session should be extended (hybrid timeout policy)
			// Only extend if more than half the session duration has passed
			shouldExtendSession(sessionId)
				.then((shouldExtend) => {
					if (shouldExtend) {
						return extendSession(sessionId);
					}
				})
				.catch((err) => {
					// Extension failure is non-critical - session still valid
					logger.warn({ err }, 'Session extension failed');
				});
		}
	}

	// Add security headers
	const response = await resolve(event);

	// HSTS - enforce HTTPS for 1 year
	response.headers.set(
		'Strict-Transport-Security',
		'max-age=31536000; includeSubDomains; preload'
	);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
	// CSP - 'unsafe-inline' required for SvelteKit hydration
	response.headers.set(
		'Content-Security-Policy',
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"
	);

	return response;
};

// Type augmentation for locals
declare global {
	namespace App {
		interface Locals {
			userId?: string;
			sessionId?: string;
		}
	}
}
