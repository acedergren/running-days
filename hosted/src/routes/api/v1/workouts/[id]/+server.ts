/**
 * GET /api/v1/workouts/:id - Get single workout
 * DELETE /api/v1/workouts/:id - Delete a workout
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { queryOne, execute } from '$lib/server/db/index.js';
import { logAudit } from '$lib/server/audit.js';
import type { Workout } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types';

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

	const { id } = params;

	// Validate UUID format
	if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
		throw error(400, {
			message: 'Invalid workout ID format',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const workout = await queryOne<Workout>(
		`SELECT
			id, user_id as "userId", date_local as "dateLocal",
			start_time as "startTime", end_time as "endTime",
			duration_seconds as "durationSeconds", distance_meters as "distanceMeters",
			energy_burned_kcal as "energyBurnedKcal", avg_heart_rate as "avgHeartRate",
			max_heart_rate as "maxHeartRate", avg_pace_seconds_per_km as "avgPaceSecondsPerKm",
			elevation_gain_meters as "elevationGainMeters", weather_temp as "weatherTemp",
			weather_condition as "weatherCondition", source,
			created_at as "createdAt", updated_at as "updatedAt",
			sync_version as "syncVersion", client_id as "clientId",
			last_synced_at as "lastSyncedAt"
		FROM workouts
		WHERE id = :id AND user_id = :userId`,
		{ id, userId }
	);

	if (!workout) {
		throw error(404, {
			message: 'Workout not found',
			// @ts-expect-error - Adding custom error code
			code: 'NOT_FOUND'
		});
	}

	return json({
		workout: {
			id: workout.id,
			dateLocal: workout.dateLocal,
			startTime: workout.startTime.toISOString(),
			endTime: workout.endTime.toISOString(),
			durationSeconds: workout.durationSeconds,
			distanceMeters: workout.distanceMeters,
			energyBurnedKcal: workout.energyBurnedKcal,
			avgHeartRate: workout.avgHeartRate,
			maxHeartRate: workout.maxHeartRate,
			avgPaceSecondsPerKm: workout.avgPaceSecondsPerKm,
			elevationGainMeters: workout.elevationGainMeters,
			weatherTemp: workout.weatherTemp,
			weatherCondition: workout.weatherCondition,
			source: workout.source,
			createdAt: workout.createdAt.toISOString(),
			updatedAt: workout.updatedAt.toISOString(),
			syncVersion: workout.syncVersion
		}
	});
};

export const DELETE: RequestHandler = async ({ request, params, getClientAddress }) => {
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

	const { id } = params;

	// Validate UUID format
	if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
		throw error(400, {
			message: 'Invalid workout ID format',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	// Check if workout exists and belongs to user
	const existing = await queryOne<{ id: string }>(
		`SELECT id FROM workouts WHERE id = :id AND user_id = :userId`,
		{ id, userId }
	);

	if (!existing) {
		throw error(404, {
			message: 'Workout not found',
			// @ts-expect-error - Adding custom error code
			code: 'NOT_FOUND'
		});
	}

	// Delete the workout
	await execute(
		`DELETE FROM workouts WHERE id = :id AND user_id = :userId`,
		{ id, userId }
	);

	// Log deletion to audit
	await logAudit(userId, 'data_delete', 'workouts', id, {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	});

	return new Response(null, { status: 204 });
};
