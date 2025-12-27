import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { ApiError } from '$lib/api-client';

export const load: PageServerLoad = async ({ locals }) => {
	const currentYear = new Date().getFullYear();
	const nextYear = currentYear + 1;

	try {
		// Get current year's goal
		const currentGoal = await locals.api.getGoal(currentYear).catch(() => null);

		// Get next year's goal (if it exists)
		const nextYearGoal = await locals.api.getGoal(nextYear).catch(() => null);

		return {
			currentYear,
			nextYear,
			currentGoal,
			nextYearGoal
		};
	} catch (err) {
		if (err instanceof ApiError) {
			return {
				currentYear,
				nextYear,
				currentGoal: null,
				nextYearGoal: null,
				error: err.statusText
			};
		}
		throw err;
	}
};

export const actions: Actions = {
	updateGoal: async ({ request, locals }) => {
		const formData = await request.formData();
		const year = parseInt(formData.get('year')?.toString() ?? '', 10);
		const targetDays = parseInt(formData.get('targetDays')?.toString() ?? '', 10);

		if (!year || isNaN(year)) {
			return fail(400, { error: 'Invalid year', field: 'year' });
		}

		if (!targetDays || isNaN(targetDays) || targetDays < 1 || targetDays > 366) {
			return fail(400, {
				error: 'Target days must be between 1 and 366',
				field: 'targetDays'
			});
		}

		try {
			await locals.api.updateGoal(year, targetDays);
			return { success: true, message: `Updated ${year} goal to ${targetDays} days` };
		} catch (err) {
			if (err instanceof ApiError) {
				const body = err.body as { message?: string } | undefined;
				return fail(err.status, {
					error: body?.message || 'Failed to update goal'
				});
			}
			throw err;
		}
	},

	createGoal: async ({ request, locals }) => {
		const formData = await request.formData();
		const year = parseInt(formData.get('year')?.toString() ?? '', 10);
		const targetDays = parseInt(formData.get('targetDays')?.toString() ?? '', 10);

		if (!year || isNaN(year)) {
			return fail(400, { error: 'Invalid year', field: 'year' });
		}

		if (!targetDays || isNaN(targetDays) || targetDays < 1 || targetDays > 366) {
			return fail(400, {
				error: 'Target days must be between 1 and 366',
				field: 'targetDays'
			});
		}

		try {
			await locals.api.createGoal(year, targetDays);
			return { success: true, message: `Created ${year} goal for ${targetDays} days` };
		} catch (err) {
			if (err instanceof ApiError) {
				const body = err.body as { message?: string } | undefined;
				return fail(err.status, {
					error: body?.message || 'Failed to create goal'
				});
			}
			throw err;
		}
	}
};
