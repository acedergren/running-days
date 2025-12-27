/**
 * GET /api/v1/goals - List all user goals
 * POST /api/v1/goals - Create or update a goal for a year
 */

import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { query, queryOne, execute } from '$lib/server/db/index.js';
import { logAudit } from '$lib/server/audit.js';
import { randomUUID } from 'crypto';
import type { Goal } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types';

// Validation schema for creating/updating goals
const CreateGoalSchema = z.object({
	year: z.number().int().min(2000).max(2100),
	targetDays: z.number().int().min(1).max(366)
});

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

	const goals = await query<Goal>(
		`SELECT
			id, user_id as "userId", year_num as "yearNum",
			target_days as "targetDays",
			created_at as "createdAt", updated_at as "updatedAt"
		FROM goals
		WHERE user_id = :userId
		ORDER BY year_num DESC`,
		{ userId }
	);

	return json({
		goals: goals.map(formatGoalResponse)
	});
};

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
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

	const parseResult = CreateGoalSchema.safeParse(rawPayload);
	if (!parseResult.success) {
		const firstError = parseResult.error.issues[0];
		throw error(400, {
			message: `Validation error: ${firstError?.path.join('.')} - ${firstError?.message}`,
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const { year, targetDays } = parseResult.data;
	const id = randomUUID();

	// Upsert goal using Oracle MERGE
	await execute(
		`MERGE INTO goals g
		 USING (SELECT :userId as user_id, :year as year_num FROM DUAL) src
		 ON (g.user_id = src.user_id AND g.year_num = src.year_num)
		 WHEN MATCHED THEN UPDATE SET
			target_days = :targetDays,
			updated_at = SYSTIMESTAMP
		 WHEN NOT MATCHED THEN INSERT (id, user_id, year_num, target_days)
			VALUES (:id, :userId, :year, :targetDays)`,
		{ id, userId, year, targetDays }
	);

	// Fetch the updated/created goal
	const goal = await queryOne<Goal>(
		`SELECT
			id, user_id as "userId", year_num as "yearNum",
			target_days as "targetDays",
			created_at as "createdAt", updated_at as "updatedAt"
		FROM goals
		WHERE user_id = :userId AND year_num = :year`,
		{ userId, year }
	);

	await logAudit(userId, 'goal_update', 'goals', goal?.id, {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined,
		metadata: { year, targetDays }
	});

	return json({
		goal: goal ? formatGoalResponse(goal) : null
	}, { status: 201 });
};

function formatGoalResponse(goal: Goal) {
	return {
		id: goal.id,
		year: goal.yearNum,
		targetDays: goal.targetDays,
		createdAt: goal.createdAt?.toISOString(),
		updatedAt: goal.updatedAt?.toISOString()
	};
}
