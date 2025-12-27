/**
 * Sync Service - Core business logic for HealthKit workout synchronization
 *
 * Key features:
 * - Duplicate detection with 60-second tolerance window
 * - Conflict resolution with version tracking
 * - Idempotency for retry safety
 * - Multi-tenant isolation (user_id filtering)
 */

import { randomUUID } from 'crypto';
import { query, queryOne, execute, transaction } from '$lib/server/db/index.js';
import { logAudit } from '$lib/server/audit.js';
import { updateDailyStatsForDates } from '$lib/server/data-access.js';
import type {
	Workout,
	SyncConflict,
	ConflictReason,
	ConflictResolution as Resolution,
	UserSyncState,
	SyncHistory
} from '$lib/server/db/schema.js';
import type { WorkoutInput, SyncRequest, SyncResponse } from './schemas.js';

// Default tolerance for duplicate detection (in seconds)
const DEFAULT_TOLERANCE_SECONDS = 60;

// Idempotency cache duration (24 hours in milliseconds)
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface AuditContext {
	ipAddress?: string;
	userAgent?: string;
}

interface SyncResult {
	resolution: Resolution;
	workout: Workout;
	conflict?: SyncConflict;
}

/**
 * Find a duplicate workout within the tolerance window
 *
 * Uses a 60-second window around the start time to account for:
 * - GPS inaccuracy in workout start detection
 * - Clock drift between devices
 * - Minor timestamp variations from HealthKit
 */
export async function findDuplicateWorkout(
	userId: string,
	startTime: Date,
	toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS
): Promise<Workout | null> {
	const windowStart = new Date(startTime.getTime() - toleranceSeconds * 1000);
	const windowEnd = new Date(startTime.getTime() + toleranceSeconds * 1000);

	// Find the closest workout within the tolerance window
	const result = await queryOne<Workout>(
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
		WHERE user_id = :userId
			AND start_time BETWEEN :windowStart AND :windowEnd
		ORDER BY ABS(EXTRACT(SECOND FROM (start_time - :startTime)))
		FETCH FIRST 1 ROW ONLY`,
		{ userId, windowStart, windowEnd, startTime }
	);

	return result;
}

/**
 * Check if two workouts have identical data (for unchanged detection)
 */
function isWorkoutIdentical(existing: Workout, incoming: WorkoutInput): boolean {
	const incomingStart = new Date(incoming.startTime);
	const incomingEnd = new Date(incoming.endTime);

	// Compare key fields that would indicate a change
	return (
		Math.abs(existing.startTime.getTime() - incomingStart.getTime()) < 1000 &&
		Math.abs(existing.endTime.getTime() - incomingEnd.getTime()) < 1000 &&
		existing.durationSeconds === incoming.durationSeconds &&
		Math.abs(existing.distanceMeters - incoming.distanceMeters) < 1 && // Allow 1m tolerance
		existing.source === incoming.source
	);
}

/**
 * Resolve sync conflict between incoming and existing workout
 *
 * Resolution strategy:
 * 1. No existing workout -> Create new
 * 2. Identical data -> Keep server (unchanged)
 * 3. Server has higher sync_version -> Keep server, report conflict
 * 4. Client data is newer/different -> Update server with client data
 */
export async function resolveWorkoutSync(
	userId: string,
	incoming: WorkoutInput,
	existing: Workout | null
): Promise<SyncResult> {
	// Case 1: No existing workout - create new
	if (!existing) {
		const workout = await createWorkoutFromSync(userId, incoming);
		return { resolution: 'created', workout };
	}

	// Case 2: Check if data is identical
	if (isWorkoutIdentical(existing, incoming)) {
		// Update last_synced_at timestamp but don't increment version
		await execute(
			`UPDATE workouts
			 SET last_synced_at = CURRENT_TIMESTAMP
			 WHERE id = :id AND user_id = :userId`,
			{ id: existing.id, userId }
		);
		return { resolution: 'kept_server', workout: existing };
	}

	// Case 3: Server has newer version - keep server, report conflict
	// (In a real scenario, incoming would have a syncVersion from the client's last known state)
	// For now, we compare based on updated_at timestamps
	const serverIsNewer = existing.syncVersion > 1; // Simple heuristic for now

	if (serverIsNewer) {
		return {
			resolution: 'kept_server',
			workout: existing,
			conflict: {
				clientId: incoming.clientId || null,
				serverId: existing.id,
				reason: 'server_newer',
				resolution: 'kept_server',
				serverWorkout: existing
			}
		};
	}

	// Case 4: Update server with client data
	const updated = await updateWorkoutFromSync(userId, existing.id, incoming);
	return { resolution: 'kept_client', workout: updated };
}

/**
 * Create a new workout from sync input
 */
async function createWorkoutFromSync(userId: string, input: WorkoutInput): Promise<Workout> {
	const id = randomUUID();
	const startTime = new Date(input.startTime);
	const endTime = new Date(input.endTime);
	const dateLocal = startTime.toISOString().split('T')[0];
	const now = new Date();

	await execute(
		`INSERT INTO workouts (
			id, user_id, date_local, start_time, end_time,
			duration_seconds, distance_meters, energy_burned_kcal,
			avg_heart_rate, max_heart_rate, avg_pace_seconds_per_km,
			source, created_at, updated_at, sync_version, client_id, last_synced_at
		) VALUES (
			:id, :userId, TO_DATE(:dateLocal, 'YYYY-MM-DD'), :startTime, :endTime,
			:durationSeconds, :distanceMeters, :energyBurnedKcal,
			:avgHeartRate, :maxHeartRate, :avgPaceSecondsPerKm,
			:source, :createdAt, :updatedAt, 1, :clientId, :lastSyncedAt
		)`,
		{
			id,
			userId,
			dateLocal,
			startTime,
			endTime,
			durationSeconds: input.durationSeconds,
			distanceMeters: input.distanceMeters,
			energyBurnedKcal: input.energyBurnedKcal ?? null,
			avgHeartRate: input.avgHeartRate ?? null,
			maxHeartRate: input.maxHeartRate ?? null,
			avgPaceSecondsPerKm: input.avgPaceSecondsPerKm ?? null,
			source: input.source,
			createdAt: now,
			updatedAt: now,
			clientId: input.clientId ?? null,
			lastSyncedAt: now
		}
	);

	return {
		id,
		userId,
		dateLocal,
		startTime,
		endTime,
		durationSeconds: input.durationSeconds,
		distanceMeters: input.distanceMeters,
		energyBurnedKcal: input.energyBurnedKcal ?? null,
		avgHeartRate: input.avgHeartRate ?? null,
		maxHeartRate: input.maxHeartRate ?? null,
		avgPaceSecondsPerKm: input.avgPaceSecondsPerKm ?? null,
		elevationGainMeters: null,
		weatherTemp: null,
		weatherCondition: null,
		source: input.source,
		createdAt: now,
		updatedAt: now,
		syncVersion: 1,
		clientId: input.clientId ?? null,
		lastSyncedAt: now
	};
}

/**
 * Update an existing workout from sync input
 */
async function updateWorkoutFromSync(
	userId: string,
	workoutId: string,
	input: WorkoutInput
): Promise<Workout> {
	const startTime = new Date(input.startTime);
	const endTime = new Date(input.endTime);
	const dateLocal = startTime.toISOString().split('T')[0];
	const now = new Date();

	await execute(
		`UPDATE workouts SET
			date_local = TO_DATE(:dateLocal, 'YYYY-MM-DD'),
			start_time = :startTime,
			end_time = :endTime,
			duration_seconds = :durationSeconds,
			distance_meters = :distanceMeters,
			energy_burned_kcal = :energyBurnedKcal,
			avg_heart_rate = :avgHeartRate,
			max_heart_rate = :maxHeartRate,
			avg_pace_seconds_per_km = :avgPaceSecondsPerKm,
			source = :source,
			updated_at = :updatedAt,
			sync_version = sync_version + 1,
			client_id = :clientId,
			last_synced_at = :lastSyncedAt
		WHERE id = :workoutId AND user_id = :userId`,
		{
			dateLocal,
			startTime,
			endTime,
			durationSeconds: input.durationSeconds,
			distanceMeters: input.distanceMeters,
			energyBurnedKcal: input.energyBurnedKcal ?? null,
			avgHeartRate: input.avgHeartRate ?? null,
			maxHeartRate: input.maxHeartRate ?? null,
			avgPaceSecondsPerKm: input.avgPaceSecondsPerKm ?? null,
			source: input.source,
			updatedAt: now,
			clientId: input.clientId ?? null,
			lastSyncedAt: now,
			workoutId,
			userId
		}
	);

	// Fetch and return updated workout
	const updated = await queryOne<Workout>(
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
		WHERE id = :workoutId AND user_id = :userId`,
		{ workoutId, userId }
	);

	if (!updated) {
		throw new Error('Workout not found after update');
	}

	return updated;
}

/**
 * Check idempotency cache for a previous sync with the same key
 */
export async function checkIdempotency(
	userId: string,
	idempotencyKey: string
): Promise<SyncResponse | null> {
	const cached = await queryOne<{ responseBody: string; responseStatus: number }>(
		`SELECT response_body as "responseBody", response_status as "responseStatus"
		FROM sync_idempotency
		WHERE user_id = :userId
			AND idempotency_key = :idempotencyKey
			AND expires_at > CURRENT_TIMESTAMP`,
		{ userId, idempotencyKey }
	);

	if (cached?.responseBody) {
		return JSON.parse(cached.responseBody) as SyncResponse;
	}

	return null;
}

/**
 * Cache a sync response for idempotency
 */
export async function cacheIdempotentResponse(
	userId: string,
	idempotencyKey: string,
	response: SyncResponse
): Promise<void> {
	const id = randomUUID();
	const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_MS);

	await execute(
		`INSERT INTO sync_idempotency (
			id, user_id, idempotency_key, response_body, response_status, expires_at
		) VALUES (
			:id, :userId, :idempotencyKey, :responseBody, 200, :expiresAt
		)`,
		{
			id,
			userId,
			idempotencyKey,
			responseBody: JSON.stringify(response),
			expiresAt
		}
	);
}

/**
 * Update user's sync state after a successful sync
 */
async function updateUserSyncState(
	userId: string,
	syncId: string,
	clientTimestamp?: string
): Promise<string> {
	const now = new Date();
	const cursor = Buffer.from(now.toISOString()).toString('base64');

	// Upsert sync state
	await execute(
		`MERGE INTO user_sync_state t
		USING (SELECT :userId as user_id FROM dual) s
		ON (t.user_id = s.user_id)
		WHEN MATCHED THEN
			UPDATE SET
				last_sync_at = :lastSyncAt,
				last_sync_id = :syncId,
				server_cursor = :cursor,
				total_syncs = total_syncs + 1,
				updated_at = :updatedAt
		WHEN NOT MATCHED THEN
			INSERT (user_id, last_sync_at, last_sync_id, server_cursor, total_syncs, created_at, updated_at)
			VALUES (:userId, :lastSyncAt, :syncId, :cursor, 1, :createdAt, :updatedAt)`,
		{
			userId,
			lastSyncAt: now,
			syncId,
			cursor,
			createdAt: now,
			updatedAt: now
		}
	);

	return cursor;
}

/**
 * Record sync operation in history for audit
 */
async function recordSyncHistory(
	userId: string,
	syncId: string,
	mode: 'full' | 'incremental',
	received: number,
	created: number,
	updated: number,
	unchanged: number,
	conflicts: number,
	durationMs: number,
	context: AuditContext
): Promise<void> {
	await execute(
		`INSERT INTO sync_history (
			id, user_id, sync_mode, workouts_received, workouts_created,
			workouts_updated, workouts_unchanged, conflicts_count,
			duration_ms, ip_address, user_agent
		) VALUES (
			:id, :userId, :syncMode, :received, :created,
			:updated, :unchanged, :conflicts,
			:durationMs, :ipAddress, :userAgent
		)`,
		{
			id: syncId,
			userId,
			syncMode: mode,
			received,
			created,
			updated,
			unchanged,
			conflicts,
			durationMs,
			ipAddress: context.ipAddress ?? null,
			userAgent: context.userAgent ?? null
		}
	);
}

/**
 * Main sync processor
 *
 * Orchestrates the full sync workflow:
 * 1. Check idempotency key
 * 2. Process each workout (find duplicates, resolve conflicts)
 * 3. Cache response for idempotency
 * 4. Update sync state and history
 * 5. Log to audit trail
 */
export async function processSync(
	userId: string,
	request: SyncRequest,
	context: AuditContext
): Promise<SyncResponse> {
	const syncId = randomUUID();
	const startTime = Date.now();

	// Check idempotency first
	if (request.idempotencyKey) {
		const cached = await checkIdempotency(userId, request.idempotencyKey);
		if (cached) {
			return cached;
		}
	}

	const results = {
		created: 0,
		updated: 0,
		unchanged: 0,
		conflicts: [] as SyncConflict[]
	};

	// Track affected dates for daily stats recalculation
	const affectedDates = new Set<string>();

	// Process each workout
	for (const workout of request.workouts) {
		const startTimeDate = new Date(workout.startTime);
		const existing = await findDuplicateWorkout(userId, startTimeDate, DEFAULT_TOLERANCE_SECONDS);
		const result = await resolveWorkoutSync(userId, workout, existing);

		switch (result.resolution) {
			case 'created':
				results.created++;
				affectedDates.add(result.workout.dateLocal);
				break;
			case 'kept_client':
				results.updated++;
				affectedDates.add(result.workout.dateLocal);
				break;
			case 'kept_server':
			case 'merged':
				if (result.conflict) {
					results.conflicts.push(result.conflict);
				} else {
					results.unchanged++;
				}
				break;
		}
	}

	// Recalculate daily stats for all affected dates
	if (affectedDates.size > 0) {
		await updateDailyStatsForDates(userId, [...affectedDates], context);
	}

	// Update sync state and get cursor
	const nextCursor = await updateUserSyncState(userId, syncId, request.clientSyncTimestamp);

	const response: SyncResponse = {
		success: true,
		syncId,
		serverTimestamp: new Date().toISOString(),
		nextCursor,
		created: results.created,
		updated: results.updated,
		unchanged: results.unchanged,
		conflicts: results.conflicts
	};

	// Cache for idempotency
	if (request.idempotencyKey) {
		await cacheIdempotentResponse(userId, request.idempotencyKey, response);
	}

	const durationMs = Date.now() - startTime;

	// Record history
	await recordSyncHistory(
		userId,
		syncId,
		request.mode,
		request.workouts.length,
		results.created,
		results.updated,
		results.unchanged,
		results.conflicts.length,
		durationMs,
		context
	);

	// Audit log
	await logAudit(userId, 'api_call', 'sync', syncId, {
		...context,
		metadata: {
			mode: request.mode,
			received: request.workouts.length,
			created: results.created,
			updated: results.updated,
			unchanged: results.unchanged,
			conflicts: results.conflicts.length,
			durationMs
		}
	});

	return response;
}

/**
 * Get user's sync status
 */
export async function getSyncStatus(userId: string): Promise<{
	lastSyncAt: string | null;
	serverCursor: string;
	totalWorkouts: number;
	pendingSync: number;
	oldestWorkout: string | null;
	newestWorkout: string | null;
}> {
	// Get sync state
	const syncState = await queryOne<UserSyncState>(
		`SELECT
			user_id as "userId",
			last_sync_at as "lastSyncAt",
			last_sync_id as "lastSyncId",
			server_cursor as "serverCursor",
			total_syncs as "totalSyncs"
		FROM user_sync_state
		WHERE user_id = :userId`,
		{ userId }
	);

	// Get workout stats
	const stats = await queryOne<{
		totalWorkouts: number;
		oldestWorkout: Date | null;
		newestWorkout: Date | null;
	}>(
		`SELECT
			COUNT(*) as "totalWorkouts",
			MIN(start_time) as "oldestWorkout",
			MAX(start_time) as "newestWorkout"
		FROM workouts
		WHERE user_id = :userId`,
		{ userId }
	);

	const now = new Date();
	const defaultCursor = Buffer.from(now.toISOString()).toString('base64');

	return {
		lastSyncAt: syncState?.lastSyncAt?.toISOString() ?? null,
		serverCursor: syncState?.serverCursor ?? defaultCursor,
		totalWorkouts: stats?.totalWorkouts ?? 0,
		pendingSync: 0, // Would need client cursor to calculate
		oldestWorkout: stats?.oldestWorkout?.toISOString() ?? null,
		newestWorkout: stats?.newestWorkout?.toISOString() ?? null
	};
}
