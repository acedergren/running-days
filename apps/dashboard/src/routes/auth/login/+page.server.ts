import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		const returnTo = url.searchParams.get('returnTo') || '/';
		throw redirect(303, returnTo);
	}

	return {};
};

// No form actions - Apple Sign-In is handled client-side via API redirect
