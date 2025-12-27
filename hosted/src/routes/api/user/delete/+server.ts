/**
 * Data Deletion API - GDPR Article 17 (Right to Erasure)
 * DELETE /api/user/delete - Permanently delete all user data
 */

import { json, error } from '@sveltejs/kit';
import { deleteAllUserData } from '$lib/server/data-access.js';
import { clearSessionCookie } from '$lib/server/auth/session.js';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, cookies, request, getClientAddress }) => {
	if (!locals.userId) {
		throw error(401, 'Authentication required');
	}

	const auditContext = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	// Perform complete data deletion
	await deleteAllUserData(locals.userId, auditContext);

	// Clear session
	clearSessionCookie(cookies);

	return json({
		success: true,
		message: 'All your data has been permanently deleted.',
		deletedAt: new Date().toISOString()
	});
};

/**
 * Confirmation endpoint - requires explicit confirmation
 * POST /api/user/delete - Request deletion with confirmation
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.userId) {
		throw error(401, 'Authentication required');
	}

	const body = await request.json();

	// Require explicit confirmation
	if (body.confirm !== 'DELETE_ALL_MY_DATA') {
		throw error(400, {
			message: 'Confirmation required. Send { "confirm": "DELETE_ALL_MY_DATA" }'
		});
	}

	// Return instructions for actual deletion
	return json({
		message: 'To permanently delete all data, send a DELETE request to this endpoint.',
		warning: 'This action is irreversible. All workouts, goals, and account data will be permanently deleted.',
		instruction: 'curl -X DELETE -H "Cookie: rd_session=..." /api/user/delete'
	});
};
