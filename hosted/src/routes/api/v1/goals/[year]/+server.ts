/**
 * GET /api/v1/goals/:year - Get goal for a specific year
 * PUT /api/v1/goals/:year - Update goal for a specific year
 */

import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { validateWebhookToken, getGoal, upsertGoal } from '$lib/server/data-access.js';
import type { RequestHandler } from './$types';

const UpdateGoalSchema = z.object({
	targetDays: z.number().int().min(1).max(366)
});

export const GET: RequestHandler = async ({ request, params }) => {
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

	const year = parseInt(params.year, 10);
	if (isNaN(year) || year < 2000 || year > 2100) {
		throw error(400, {
			message: 'Invalid year parameter',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const goal = await getGoal(userId, year);

	if (!goal) {
		// Return default goal if none exists
		return json({
			goal: {
				year,
				targetDays: 300,
				createdAt: null,
				updatedAt: null
			}
		});
	}

	return json({
		goal: {
			id: goal.id,
			year: goal.yearNum,
			targetDays: goal.targetDays,
			createdAt: goal.createdAt?.toISOString(),
			updatedAt: goal.updatedAt?.toISOString()
		}
	});
};

export const PUT: RequestHandler = async ({ request, params, getClientAddress }) => {
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

	const year = parseInt(params.year, 10);
	if (isNaN(year) || year < 2000 || year > 2100) {
		throw error(400, {
			message: 'Invalid year parameter',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	// Parse and validate payload
	let rawPayload: unknown;
	try {
		rawPayload = await request.json();
	} catch {
		throw error(400, {
			message: 'Invalid JSON payload',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const parseResult = UpdateGoalSchema.safeParse(rawPayload);
	if (!parseResult.success) {
		const firstError = parseResult.error.issues[0];
		throw error(400, {
			message: `Validation error: ${firstError?.path.join('.')} - ${firstError?.message}`,
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const { targetDays } = parseResult.data;

	await upsertGoal(userId, year, targetDays, {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	});

	const goal = await getGoal(userId, year);

	return json({
		goal: {
			id: goal?.id,
			year,
			targetDays,
			createdAt: goal?.createdAt?.toISOString(),
			updatedAt: goal?.updatedAt?.toISOString()
		}
	});
};
