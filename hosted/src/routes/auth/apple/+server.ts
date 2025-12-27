/**
 * Apple Sign-In Initiation
 * GET /auth/apple - Redirects to Apple's authorization page
 */

import { redirect } from '@sveltejs/kit';
import { getAppleAuthUrl } from '$lib/server/auth/apple.js';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	// Generate state for CSRF protection
	const state = randomBytes(16).toString('hex');
	cookies.set('apple_auth_state', state, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	const redirectUri = `${url.origin}/auth/apple/callback`;
	const authUrl = getAppleAuthUrl(redirectUri, state);

	throw redirect(302, authUrl);
};
