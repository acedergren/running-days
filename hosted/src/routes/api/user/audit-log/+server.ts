/**
 * Audit Log API - Transparency
 * GET /api/user/audit-log - View your data access history
 */

import { json, error } from '@sveltejs/kit';
import { getUserAuditLog } from '$lib/server/audit.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.userId) {
		throw error(401, 'Authentication required');
	}

	const limit = Math.min(
		parseInt(url.searchParams.get('limit') || '50'),
		200 // Max 200 entries per request
	);

	const auditLog = await getUserAuditLog(locals.userId, limit);

	return json({
		entries: auditLog,
		count: auditLog.length,
		message: 'Your data access history. All access to your data is logged for transparency.'
	});
};
