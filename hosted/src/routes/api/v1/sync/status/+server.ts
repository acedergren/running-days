/**
 * GET /api/v1/sync/status
 * Get user's sync status including last sync time and cursor
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { getSyncStatus } from '$lib/server/sync/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	// Extract token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, {
			message: 'Missing or invalid Authorization header',
			// @ts-expect-error - Adding custom error code
			code: 'UNAUTHORIZED'
		});
	}

	const token = authHeader.slice(7);
	const userId = await validateWebhookToken(token);

	if (!userId) {
		throw error(401, {
			message: 'Invalid or expired token',
			// @ts-expect-error - Adding custom error code
			code: 'TOKEN_INVALID'
		});
	}

	const status = await getSyncStatus(userId);

	return json(status);
};
