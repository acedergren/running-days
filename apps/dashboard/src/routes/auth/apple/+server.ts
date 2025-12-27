/**
 * Apple Sign-In Initiation
 * GET /auth/apple - Initiates Apple Sign-In by proxying to the API
 */

import { redirect } from '@sveltejs/kit';
import { createApiClient } from '$lib/api-client';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const api = createApiClient();

	// Get auth URL from API
	const { authUrl, response } = await api.initiateAppleSignIn();

	// Forward cookies from the API response (state, verifier, nonce)
	const setCookieHeaders = response.headers.getSetCookie();
	for (const setCookie of setCookieHeaders) {
		const parts = setCookie.split(';');
		const [nameValue] = parts;
		const [name, ...valueParts] = nameValue.split('=');
		const value = valueParts.join('=');

		const options: {
			path?: string;
			httpOnly?: boolean;
			secure?: boolean;
			sameSite?: 'lax' | 'strict' | 'none';
			maxAge?: number;
		} = { path: '/' };

		for (const part of parts.slice(1)) {
			const [key, val] = part.trim().split('=');
			const lowerKey = key.toLowerCase();

			if (lowerKey === 'httponly') options.httpOnly = true;
			if (lowerKey === 'secure') options.secure = true;
			if (lowerKey === 'path') options.path = val;
			if (lowerKey === 'samesite') options.sameSite = val.toLowerCase() as 'lax' | 'strict' | 'none';
			if (lowerKey === 'max-age') options.maxAge = parseInt(val, 10);
		}

		cookies.set(name, value, options);
	}

	// Redirect to Apple
	throw redirect(302, authUrl);
};
