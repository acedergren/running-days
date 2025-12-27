/**
 * Logout
 * POST /auth/logout - Destroys session and redirects to home
 */

import { redirect } from '@sveltejs/kit';
import {
	destroySession,
	getSessionCookie,
	clearSessionCookie
} from '$lib/server/auth/session.js';
import { applyRateLimit } from '$lib/server/rate-limiter.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request, getClientAddress }) => {
	// Apply rate limiting
	const rateLimitResponse = applyRateLimit(getClientAddress(), '/auth/logout');
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const sessionId = getSessionCookie(cookies);

	if (sessionId) {
		await destroySession(sessionId, {
			ipAddress: getClientAddress(),
			userAgent: request.headers.get('user-agent') || undefined
		});
	}

	clearSessionCookie(cookies);
	throw redirect(302, '/');
};
