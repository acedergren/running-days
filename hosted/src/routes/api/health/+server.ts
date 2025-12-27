/**
 * Health Check API
 * GET /api/health - Check application and database health
 */

import { json } from '@sveltejs/kit';
import { healthCheck } from '$lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const db = await healthCheck();

	const status = db.ok ? 'healthy' : 'degraded';

	return json({
		status,
		timestamp: new Date().toISOString(),
		checks: {
			database: {
				ok: db.ok,
				latencyMs: db.latencyMs
			}
		}
	}, {
		status: db.ok ? 200 : 503
	});
};
