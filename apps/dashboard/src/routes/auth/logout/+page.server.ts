import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		try {
			await locals.api.logout();
		} catch {
			// Ignore logout errors
		}

		// Clear all auth cookies
		cookies.delete('access_token', { path: '/' });
		cookies.delete('refresh_token', { path: '/' });

		throw redirect(303, '/auth/login');
	}
};
