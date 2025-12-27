/**
 * Apple Sign-In Callback
 * POST /auth/apple/callback - Handles Apple's authorization response
 */

import { redirect, error } from '@sveltejs/kit';
import { authenticateWithApple } from '$lib/server/auth/apple.js';
import { createSession, setSessionCookie } from '$lib/server/auth/session.js';
import { query, execute } from '$lib/server/db/index.js';
import { logAudit } from '$lib/server/audit.js';
import { randomUUID } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url, getClientAddress }) => {
	const formData = await request.formData();
	const code = formData.get('code') as string;
	const state = formData.get('state') as string;
	const userJson = formData.get('user') as string | null; // First login only

	// Verify state for CSRF protection
	const savedState = cookies.get('apple_auth_state');
	cookies.delete('apple_auth_state', { path: '/' });

	if (!state || state !== savedState) {
		throw error(400, 'Invalid state parameter');
	}

	if (!code) {
		throw error(400, 'Missing authorization code');
	}

	const context = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	try {
		// Exchange code for user info
		const redirectUri = `${url.origin}/auth/apple/callback`;
		const appleUser = await authenticateWithApple(code, redirectUri);

		// Check if user exists
		const existingUser = await query<{ ID: string }>(
			`SELECT id FROM users WHERE id = :id AND deleted_at IS NULL`,
			{ id: appleUser.sub }
		);

		let userId = appleUser.sub;

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
		if (err instanceof Response) throw err; // Re-throw redirects

		console.error('Apple auth error:', err);
		throw error(500, 'Authentication failed');
	}
};
