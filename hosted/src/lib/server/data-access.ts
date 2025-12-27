/**
 * Secure Data Access Layer
 *
 * CRITICAL: Every query MUST include user_id in WHERE clause.
 * This enforces row-level security at the application layer.
 *
 * All functions require userId as first parameter to prevent
 * accidental cross-user data access.
 */

import { query, queryOne, execute, transaction } from './db/index.js';
import { logAudit, type AuditContext } from './audit.js';
import { randomUUID } from 'crypto';
import type { Workout, DailyStat, Goal, WebhookToken } from './db/schema.js';

// ============================================================================
// WORKOUTS
// ============================================================================

export async function getWorkouts(
	userId: string,
	options: { year?: number; limit?: number; offset?: number } = {},
	auditContext?: AuditContext
): Promise<Workout[]> {
	const { year, limit = 100, offset = 0 } = options;

	let sql = `
		SELECT * FROM workouts
		WHERE user_id = :userId
		${year ? 'AND EXTRACT(YEAR FROM date_local) = :year' : ''}
		ORDER BY date_local DESC
		OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
	`;

	const workouts = await query<Workout>(sql, { userId, year, limit, offset });

	await logAudit(userId, 'data_access', 'workouts', undefined, {
		...auditContext,
		metadata: { count: workouts.length, year }
	});

	return workouts;
}

export async function getWorkoutById(
	userId: string,
	workoutId: string,
	auditContext?: AuditContext
): Promise<Workout | null> {
	const workout = await queryOne<Workout>(
		`SELECT * FROM workouts WHERE id = :workoutId AND user_id = :userId`,
		{ workoutId, userId }
	);

	if (workout) {
		await logAudit(userId, 'data_access', 'workouts', workoutId, auditContext);
	}

	return workout;
}

export async function createWorkout(
	userId: string,
	data: Omit<Workout, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
	auditContext?: AuditContext
): Promise<string> {
	const id = randomUUID();

	await execute(
		`INSERT INTO workouts (
			id, user_id, date_local, start_time, end_time, duration_seconds,
			distance_meters, energy_burned_kcal, avg_heart_rate, max_heart_rate,
			avg_pace_seconds_per_km, elevation_gain_meters, weather_temp,
			weather_condition, source, raw_payload
		) VALUES (
			:id, :userId, :dateLocal, :startTime, :endTime, :durationSeconds,
			:distanceMeters, :energyBurnedKcal, :avgHeartRate, :maxHeartRate,
			:avgPaceSecondsPerKm, :elevationGainMeters, :weatherTemp,
			:weatherCondition, :source, :rawPayload
		)`,
		{
			id,
			userId,
			dateLocal: data.dateLocal,
			startTime: data.startTime,
			endTime: data.endTime,
			durationSeconds: data.durationSeconds,
			distanceMeters: data.distanceMeters,
			energyBurnedKcal: data.energyBurnedKcal,
			avgHeartRate: data.avgHeartRate,
			maxHeartRate: data.maxHeartRate,
			avgPaceSecondsPerKm: data.avgPaceSecondsPerKm,
			elevationGainMeters: data.elevationGainMeters,
			weatherTemp: data.weatherTemp,
			weatherCondition: data.weatherCondition,
			source: data.source,
			rawPayload: null
		}
	);

	await logAudit(userId, 'data_create', 'workouts', id, auditContext);

	return id;
}

// ============================================================================
// DAILY STATS
// ============================================================================

export async function getDailyStats(
	userId: string,
	year: number,
	auditContext?: AuditContext
): Promise<DailyStat[]> {
	const stats = await query<DailyStat>(
		`SELECT * FROM daily_stats
		 WHERE user_id = :userId AND year_num = :year
		 ORDER BY date_local`,
		{ userId, year }
	);

	await logAudit(userId, 'data_access', 'daily_stats', undefined, {
		...auditContext,
		metadata: { year, count: stats.length }
	});

	return stats;
}

export async function getYearSummary(
	userId: string,
	year: number,
	auditContext?: AuditContext
): Promise<{
	totalDays: number;
	totalDistance: number;
	totalDuration: number;
	avgPace: number | null;
}> {
	const result = await queryOne<{
		TOTAL_DAYS: number;
		TOTAL_DISTANCE: number;
		TOTAL_DURATION: number;
		AVG_PACE: number | null;
	}>(
		`SELECT
			COUNT(*) as TOTAL_DAYS,
			NVL(SUM(total_distance_meters), 0) as TOTAL_DISTANCE,
			NVL(SUM(total_duration_seconds), 0) as TOTAL_DURATION,
			AVG(avg_pace_seconds_per_km) as AVG_PACE
		 FROM daily_stats
		 WHERE user_id = :userId AND year_num = :year`,
		{ userId, year }
	);

	await logAudit(userId, 'data_access', 'daily_stats', undefined, {
		...auditContext,
		metadata: { year, type: 'summary' }
	});

	return {
		totalDays: result?.TOTAL_DAYS || 0,
		totalDistance: result?.TOTAL_DISTANCE || 0,
		totalDuration: result?.TOTAL_DURATION || 0,
		avgPace: result?.AVG_PACE || null
	};
}

// ============================================================================
// GOALS
// ============================================================================

export async function getGoal(
	userId: string,
	year: number
): Promise<Goal | null> {
	return queryOne<Goal>(
		`SELECT * FROM goals WHERE user_id = :userId AND year_num = :year`,
		{ userId, year }
	);
}

export async function upsertGoal(
	userId: string,
	year: number,
	targetDays: number,
	auditContext?: AuditContext
): Promise<void> {
	await execute(
		`MERGE INTO goals g
		 USING (SELECT :userId as user_id, :year as year_num FROM DUAL) src
		 ON (g.user_id = src.user_id AND g.year_num = src.year_num)
		 WHEN MATCHED THEN UPDATE SET target_days = :targetDays, updated_at = SYSTIMESTAMP
		 WHEN NOT MATCHED THEN INSERT (id, user_id, year_num, target_days)
			VALUES (:id, :userId, :year, :targetDays)`,
		{ id: randomUUID(), userId, year, targetDays }
	);

	await logAudit(userId, 'data_update', 'goals', undefined, {
		...auditContext,
		metadata: { year, targetDays }
	});
}

// ============================================================================
// WEBHOOK TOKENS
// ============================================================================

export async function getWebhookTokens(userId: string): Promise<WebhookToken[]> {
	return query<WebhookToken>(
		`SELECT id, user_id, token, name, is_active, last_used_at, created_at
		 FROM webhook_tokens
		 WHERE user_id = :userId
		 ORDER BY created_at DESC`,
		{ userId }
	);
}

export async function createWebhookToken(
	userId: string,
	name: string,
	auditContext?: AuditContext
): Promise<{ id: string; token: string }> {
	const id = randomUUID();
	const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');

	await execute(
		`INSERT INTO webhook_tokens (id, user_id, token, name)
		 VALUES (:id, :userId, :token, :name)`,
		{ id, userId, token, name }
	);

	await logAudit(userId, 'token_created', 'webhook_tokens', id, auditContext);

	return { id, token };
}

export async function validateWebhookToken(token: string): Promise<string | null> {
	const result = await queryOne<{ USER_ID: string; ID: string }>(
		`SELECT user_id, id FROM webhook_tokens
		 WHERE token = :token AND is_active = 1`,
		{ token }
	);

	if (result) {
		// Update last_used_at
		await execute(
			`UPDATE webhook_tokens SET last_used_at = SYSTIMESTAMP WHERE id = :id`,
			{ id: result.ID }
		);
	}

	return result?.USER_ID || null;
}

// ============================================================================
// DATA EXPORT (GDPR Article 20)
// ============================================================================

export async function exportAllUserData(
	userId: string,
	auditContext?: AuditContext
): Promise<UserDataExport> {
	const [workouts, dailyStats, goals, tokens] = await Promise.all([
		query<Workout>('SELECT * FROM workouts WHERE user_id = :userId ORDER BY date_local', { userId }),
		query<DailyStat>('SELECT * FROM daily_stats WHERE user_id = :userId ORDER BY date_local', { userId }),
		query<Goal>('SELECT * FROM goals WHERE user_id = :userId ORDER BY year_num', { userId }),
		query<WebhookToken>(
			'SELECT id, name, is_active, created_at FROM webhook_tokens WHERE user_id = :userId',
			{ userId }
		)
	]);

	await logAudit(userId, 'data_export', undefined, undefined, {
		...auditContext,
		metadata: {
			workouts: workouts.length,
			dailyStats: dailyStats.length,
			goals: goals.length
		}
	});

	return {
		exportedAt: new Date().toISOString(),
		user: { id: userId },
		workouts,
		dailyStats,
		goals,
		webhookTokens: tokens
	};
}

interface UserDataExport {
	exportedAt: string;
	user: { id: string };
	workouts: Workout[];
	dailyStats: DailyStat[];
	goals: Goal[];
	webhookTokens: Partial<WebhookToken>[];
}

// ============================================================================
// DATA DELETION (GDPR Article 17)
// ============================================================================

export async function deleteAllUserData(
	userId: string,
	auditContext?: AuditContext
): Promise<void> {
	const { anonymizeUserAuditLog } = await import('./audit.js');

	await transaction(async (conn) => {
		// Delete all user data (CASCADE handles related tables)
		await conn.execute(
			`DELETE FROM users WHERE id = :userId`,
			{ userId },
			{ autoCommit: false }
		);
	});

	// Anonymize audit log (outside transaction, always succeeds)
	await anonymizeUserAuditLog(userId);
}
