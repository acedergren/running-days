/**
 * Apple Sign-In Callback
 * POST /auth/apple/callback - Handles Apple's authorization response
 *
 * Apple sends the authorization response as a form POST.
 * We forward the code and state to our API along with the security cookies.
 */

import { redirect } from '@sveltejs/kit';
import { createApiClient, ApiError } from '$lib/api-client';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const formData = await request.formData();
	const code = formData.get('code')?.toString();
	const state = formData.get('state')?.toString();

	if (!code || !state) {
		throw redirect(302, '/auth/login?error=missing_params');
	}

	// Build cookie header to forward to API
	const cookieHeader = cookies.getAll()
		.map(c => `${c.name}=${c.value}`)
		.join('; ');

	try {
		const api = createApiClient(cookieHeader);
		const { response } = await api.completeAppleSignIn(code, state);

		// Forward session cookies from the API
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

		// Clear the security cookies (they're no longer needed)
		cookies.delete('apple_auth_state', { path: '/' });
		cookies.delete('apple_auth_verifier', { path: '/' });
		cookies.delete('apple_auth_nonce', { path: '/' });

		// Redirect to dashboard
		throw redirect(302, '/');
	} catch (error) {
		if (error instanceof Response) {
			throw error; // Re-throw redirects
		}

		if (error instanceof ApiError) {
			console.error('Apple auth callback error:', error);
			throw redirect(302, '/auth/login?error=auth_failed');
		}

		throw error;
	}
};
