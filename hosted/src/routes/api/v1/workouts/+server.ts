/**
 * GET /api/v1/workouts
 * List user's workouts with pagination
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { query, queryOne } from '$lib/server/db/index.js';
import { WorkoutsQuerySchema } from '$lib/server/sync/schemas.js';
import type { Workout } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
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

	// Parse query parameters
	const queryParams = {
		cursor: url.searchParams.get('cursor') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		since: url.searchParams.get('since') ?? undefined,
		year: url.searchParams.get('year') ?? undefined
	};

	const parseResult = WorkoutsQuerySchema.safeParse(queryParams);
	if (!parseResult.success) {
		throw error(400, {
			message: 'Invalid query parameters',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	const { cursor, limit, since, year } = parseResult.data;

	// Build query with optional filters
	let sql = `
		SELECT
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
		WHERE user_id = :userId
	`;

	const binds: Record<string, unknown> = { userId, limit: limit + 1 }; // +1 to check hasMore

	// Cursor-based pagination (decode base64 timestamp)
	if (cursor) {
		try {
			const cursorTime = Buffer.from(cursor, 'base64').toString('utf-8');
			sql += ` AND start_time < :cursorTime`;
			binds.cursorTime = new Date(cursorTime);
		} catch {
			throw error(400, { message: 'Invalid cursor', code: 'VALIDATION_ERROR' } as Error);
		}
	}

	// Filter by since timestamp
	if (since) {
		sql += ` AND start_time >= :since`;
		binds.since = new Date(since);
	}

	// Filter by year
	if (year) {
		sql += ` AND EXTRACT(YEAR FROM start_time) = :year`;
		binds.year = year;
	}

	sql += ` ORDER BY start_time DESC FETCH FIRST :limit ROWS ONLY`;

	const workouts = await query<Workout>(sql, binds);

	// Check if there are more results
	const hasMore = workouts.length > limit;
	if (hasMore) {
		workouts.pop(); // Remove the extra item
	}

	// Generate next cursor from last workout's start_time
	const lastWorkout = workouts[workouts.length - 1];
	const nextCursor = hasMore && lastWorkout
		? Buffer.from(lastWorkout.startTime.toISOString()).toString('base64')
		: null;

	return json({
		workouts: workouts.map(formatWorkoutResponse),
		nextCursor,
		hasMore
	});
};

// Format workout for API response
function formatWorkoutResponse(workout: Workout) {
	return {
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
	};
}
