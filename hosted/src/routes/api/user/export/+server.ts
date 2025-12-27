/**
 * Data Export API - GDPR Article 20
 * GET /api/user/export - Export all user data as JSON
 */

import { json, error } from '@sveltejs/kit';
import { exportAllUserData } from '$lib/server/data-access.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, request, getClientAddress }) => {
	if (!locals.userId) {
		throw error(401, 'Authentication required');
	}

	const auditContext = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	const data = await exportAllUserData(locals.userId, auditContext);

	// Return as downloadable JSON file
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="running-days-export-${new Date().toISOString().split('T')[0]}.json"`
		}
	});
};
