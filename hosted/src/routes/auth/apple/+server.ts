/**
 * Apple Sign-In Initiation
 * GET /auth/apple - Redirects to Apple's authorization page
 *
 * Security: Implements PKCE (RFC 7636) and nonce for maximum protection
 */

import { redirect } from '@sveltejs/kit';
import {
	getAppleAuthUrl,
	generateCodeVerifier,
	generateCodeChallenge,
	generateNonce
} from '$lib/server/auth/apple.js';
import { applyRateLimit } from '$lib/server/rate-limiter.js';
import { randomBytes } from 'crypto';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url, getClientAddress }) => {
	// Apply rate limiting
	const rateLimitResponse = applyRateLimit(getClientAddress(), '/auth/apple');
	if (rateLimitResponse) {
		return rateLimitResponse;
	}
	// Generate state for CSRF protection
	const state = randomBytes(16).toString('hex');

	// Generate PKCE code verifier and challenge
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);

	// Generate nonce for ID token binding
	const nonce = generateNonce();

	// Store all security tokens in a single encrypted cookie
	// Using separate cookies for clarity and to avoid size limits
	const cookieOptions = {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax' as const,
		maxAge: 600 // 10 minutes
	};

	cookies.set('apple_auth_state', state, cookieOptions);
	cookies.set('apple_auth_verifier', codeVerifier, cookieOptions);
	cookies.set('apple_auth_nonce', nonce, cookieOptions);

	const redirectUri = `${url.origin}/auth/apple/callback`;
	const authUrl = getAppleAuthUrl(redirectUri, state, codeChallenge, nonce);

	throw redirect(302, authUrl);
};
