import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createApiClient, ApiError } from '$lib/api-client';

export const load: PageServerLoad = async ({ locals, url }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		const returnTo = url.searchParams.get('returnTo') || '/';
		throw redirect(303, returnTo);
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		try {
			const api = createApiClient();
			const { response } = await api.login(email, password);

			// Forward cookies from the API response
			const setCookieHeaders = response.headers.getSetCookie();
			for (const setCookie of setCookieHeaders) {
				// Parse the Set-Cookie header
				const parts = setCookie.split(';');
				const [nameValue] = parts;
				const [name, ...valueParts] = nameValue.split('=');
				const value = valueParts.join('=');

				// Extract cookie options
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

			// Redirect to the return URL or dashboard
			const returnTo = url.searchParams.get('returnTo') || '/';
			throw redirect(303, returnTo);
		} catch (error) {
			if (error instanceof ApiError) {
				const body = error.body as { message?: string } | undefined;
				return fail(error.status, {
					error: body?.message || 'Invalid email or password',
					email
				});
			}
			throw error;
		}
	}
};
