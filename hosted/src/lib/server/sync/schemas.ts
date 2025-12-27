/**
 * Zod Schemas for Sync API Validation
 */

import { z } from 'zod';

// Workout input schema (from iOS client)
export const WorkoutInputSchema = z.object({
	clientId: z.string().max(100).optional(),
	startTime: z.string().datetime({ offset: true }),
	endTime: z.string().datetime({ offset: true }),
	durationSeconds: z.number().int().min(0).max(86400 * 7), // Max 7 days
	distanceMeters: z.number().min(0).max(1000000), // Max 1000km
	energyBurnedKcal: z.number().min(0).max(10000).nullable().optional(),
	avgHeartRate: z.number().int().min(30).max(250).nullable().optional(),
	maxHeartRate: z.number().int().min(30).max(250).nullable().optional(),
	avgPaceSecondsPerKm: z.number().min(60).max(3600).nullable().optional(), // 1-60 min/km
	source: z.enum(['healthkit', 'apple_watch', 'manual'])
});

export type WorkoutInput = z.infer<typeof WorkoutInputSchema>;

// Sync request schema
export const SyncRequestSchema = z.object({
	workouts: z.array(WorkoutInputSchema).min(1).max(100),
	mode: z.enum(['full', 'incremental']).default('incremental'),
	idempotencyKey: z.string().max(64).optional(),
	clientSyncTimestamp: z.string().datetime({ offset: true }).optional()
});

export type SyncRequest = z.infer<typeof SyncRequestSchema>;

// Sync response schema (for documentation/validation of our own output)
export const SyncConflictSchema = z.object({
	clientId: z.string().nullable(),
	serverId: z.string(),
	reason: z.enum(['duplicate_start_time', 'data_mismatch', 'server_newer']),
	resolution: z.enum(['kept_server', 'kept_client', 'merged', 'created'])
});

export type SyncConflictOutput = z.infer<typeof SyncConflictSchema>;

export const SyncResponseSchema = z.object({
	success: z.boolean(),
	syncId: z.string().uuid(),
	serverTimestamp: z.string().datetime(),
	nextCursor: z.string().nullable(),
	created: z.number().int().min(0),
	updated: z.number().int().min(0),
	unchanged: z.number().int().min(0),
	conflicts: z.array(SyncConflictSchema)
});

export type SyncResponse = z.infer<typeof SyncResponseSchema>;

// Query params for GET /workouts
export const WorkoutsQuerySchema = z.object({
	cursor: z.string().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	since: z.string().datetime({ offset: true }).optional(),
	year: z.coerce.number().int().min(2000).max(2100).optional()
});

export type WorkoutsQuery = z.infer<typeof WorkoutsQuerySchema>;

// Sync status response
export const SyncStatusResponseSchema = z.object({
	lastSyncAt: z.string().datetime().nullable(),
	serverCursor: z.string(),
	totalWorkouts: z.number().int().min(0),
	pendingSync: z.number().int().min(0),
	oldestWorkout: z.string().datetime().nullable(),
	newestWorkout: z.string().datetime().nullable()
});

export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;
