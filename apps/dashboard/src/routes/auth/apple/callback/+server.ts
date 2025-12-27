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
import type { Cookies } from '@sveltejs/kit';

/**
 * Cookies we accept from API responses during auth.
 * Prevents the API from setting arbitrary cookies on the user's browser.
 */
const ALLOWED_AUTH_COOKIES = ['rd_access_token', 'rd_refresh_token'];

/**
 * Safely forward cookies from API response, validating cookie names.
 */
function forwardApiCookies(response: Response, cookies: Cookies): void {
	const setCookieHeaders = response.headers.getSetCookie();

	for (const setCookie of setCookieHeaders) {
		const parts = setCookie.split(';');
		const [nameValue] = parts;
		if (!nameValue) continue;

		const equalsIndex = nameValue.indexOf('=');
		if (equalsIndex === -1) continue;

		const name = nameValue.slice(0, equalsIndex).trim();
		const value = nameValue.slice(equalsIndex + 1);

		// Security: Only accept expected cookies from the API
		if (!ALLOWED_AUTH_COOKIES.includes(name)) {
			console.warn(`Ignoring unexpected cookie from API: ${name}`);
			continue;
		}

		// Set with secure defaults, ignoring API's suggested attributes
		// (we enforce our own security policy)
		cookies.set(name, value, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax'
		});
	}
}

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

		// Forward validated session cookies from the API
		forwardApiCookies(response, cookies);

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
