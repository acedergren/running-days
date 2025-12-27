import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { ApiError } from '$lib/api-client';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const insightsData = await locals.api.getInsightsData();
		return {
			...insightsData
		};
	} catch (err) {
		if (err instanceof ApiError) {
			throw error(err.status, err.statusText);
		}
		throw err;
	}
};
