/**
 * Apple Sign-In Callback
 * POST /auth/apple/callback - Handles Apple's authorization response
 *
 * Security:
 * - Rate limited to prevent brute force
 * - Validates CSRF state parameter
 * - Verifies PKCE code_verifier
 * - Validates nonce in ID token
 * - Audits all failed authentication attempts
 */

import { redirect, error } from '@sveltejs/kit';
import { authenticateWithApple, safeCompare } from '$lib/server/auth/apple.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';
import { query, execute } from '$lib/server/db/index.js';
import { logAudit } from '$lib/server/audit.js';
import { applyRateLimit } from '$lib/server/rate-limiter.js';
import { logger } from '$lib/server/logger.js';
import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';
import type { AuditContext } from '$lib/server/audit.js';

/**
 * Log failed authentication attempt for security monitoring
 */
async function logAuthFailure(
	reason: string,
	context: AuditContext
): Promise<void> {
	await logAudit(null, 'login', 'auth_failure', reason, {
		...context,
		metadata: { reason, provider: 'apple', success: false }
	});
}

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	// Apply rate limiting first
	const rateLimitResponse = applyRateLimit(getClientAddress(), '/auth/apple/callback');
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const context: AuditContext = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	// Parse form data
	const formData = await request.formData();

	// Validate inputs exist and are strings (not null/undefined/other types)
	const code = formData.get('code');
	const state = formData.get('state');

	if (typeof code !== 'string' || !code) {
		await logAuthFailure('missing_authorization_code', context);
		throw error(400, 'Missing authorization code');
	}

	if (typeof state !== 'string' || !state) {
		await logAuthFailure('missing_state_parameter', context);
		throw error(400, 'Missing state parameter');
	}

	// Retrieve and clear all security cookies
	const savedState = cookies.get('apple_auth_state');
	const codeVerifier = cookies.get('apple_auth_verifier');
	const expectedNonce = cookies.get('apple_auth_nonce');

	// Clear cookies immediately to prevent replay
	cookies.delete('apple_auth_state', { path: '/' });
	cookies.delete('apple_auth_verifier', { path: '/' });
	cookies.delete('apple_auth_nonce', { path: '/' });

	// Verify CSRF state using timing-safe comparison
	if (!safeCompare(state, savedState)) {
		await logAuthFailure('invalid_state_parameter', context);
		throw error(400, 'Invalid state parameter');
	}

	// Verify PKCE code verifier exists
	if (!codeVerifier) {
		await logAuthFailure('missing_code_verifier', context);
		throw error(400, 'Missing PKCE verifier - please restart sign-in');
	}

	// Verify nonce exists
	if (!expectedNonce) {
		await logAuthFailure('missing_nonce', context);
		throw error(400, 'Missing nonce - please restart sign-in');
	}

	try {
		// Exchange code for user info with PKCE and nonce validation
		const redirectUri = `${url.origin}/auth/apple/callback`;
		const appleUser = await authenticateWithApple(
			code,
			redirectUri,
			codeVerifier,
			expectedNonce
		);

		// Check if user exists
		const existingUser = await query<{ ID: string }>(
			`SELECT id FROM users WHERE id = :id AND deleted_at IS NULL`,
			{ id: appleUser.sub }
		);

		const userId = appleUser.sub;

		if (existingUser.length === 0) {
			// Create new user
			await execute(
				`INSERT INTO users (id, email, email_verified)
				 VALUES (:id, :email, :emailVerified)`,
				{
					id: userId,
					email: appleUser.email || null,
					emailVerified: appleUser.email_verified ? 1 : 0
				}
			);

			// Record consent for data processing
			await execute(
				`INSERT INTO consent_records (id, user_id, consent_type, granted, ip_address)
				 VALUES (:id, :userId, 'data_processing', 1, :ipAddress)`,
				{
					id: randomUUID(),
					userId,
					ipAddress: context.ipAddress
				}
			);

			await logAudit(userId, 'data_create', 'users', userId, context);
		}

		// Create session
		const sessionId = await createSession(userId, context);
		setSessionCookie(cookies, sessionId);

		throw redirect(302, '/');
	} catch (err) {
		// Re-throw redirects and HTTP errors
		if (err instanceof Response) throw err;

		// Log the specific error for debugging (server-side only)
		const errorMessage = err instanceof Error ? err.message : 'Unknown error';
		logger.error({ err: errorMessage }, 'Apple auth error');

		// Audit the failure with error category (not sensitive details)
		let failureReason = 'unknown_error';
		if (errorMessage.includes('token exchange')) {
			failureReason = 'token_exchange_failed';
		} else if (errorMessage.includes('Nonce mismatch')) {
			failureReason = 'nonce_mismatch';
		} else if (errorMessage.includes('sub claim')) {
			failureReason = 'invalid_id_token';
		} else if (errorMessage.includes('too old')) {
			failureReason = 'token_too_old';
		}

		await logAuthFailure(failureReason, context);

		// Return generic error to client
		throw error(500, 'Authentication failed');
	}
};
