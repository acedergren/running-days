/**
 * Webhook API - Health Auto Export Integration
 * POST /api/webhook - Receive workout data from Health Auto Export app
 *
 * Security:
 * - Bearer token authentication
 * - Zod schema validation
 * - Payload size limits
 * - Rate limiting (handled at infrastructure level)
 */

import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { createWorkout } from '$lib/server/data-access.js';
import { logAudit } from '$lib/server/audit.js';
import { logger } from '$lib/server/logger.js';
import type { RequestHandler } from './$types';

// Maximum payload size: 1MB (prevents DoS via large payloads)
const MAX_PAYLOAD_SIZE = 1024 * 1024;

// Zod schema for Health Auto Export payload
const QuantitySchema = z.object({
	qty: z.number(),
	units: z.string()
});

const WorkoutSchema = z.object({
	name: z.string().min(1).max(200),
	start: z.string().datetime({ offset: true }).or(z.string().datetime()),
	end: z.string().datetime({ offset: true }).or(z.string().datetime()),
	duration: QuantitySchema,
	totalDistance: QuantitySchema.optional(),
	totalEnergyBurned: QuantitySchema.optional(),
	avgHeartRate: QuantitySchema.optional(),
	maxHeartRate: QuantitySchema.optional()
});

const HealthAutoExportPayloadSchema = z.object({
	data: z.object({
		workouts: z.array(WorkoutSchema).max(1000) // Limit to 1000 workouts per request
	})
});

type HealthAutoExportPayload = z.infer<typeof HealthAutoExportPayloadSchema>;

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
	// Check payload size before parsing
	const contentLength = request.headers.get('content-length');
	if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
		throw error(413, 'Payload too large');
	}

	// Extract token from Authorization header
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		throw error(401, 'Missing or invalid Authorization header');
	}

	const token = authHeader.slice(7);
	const userId = await validateWebhookToken(token);

	if (!userId) {
		throw error(401, 'Invalid webhook token');
	}

	const auditContext = {
		ipAddress: getClientAddress(),
		userAgent: request.headers.get('user-agent') || undefined
	};

	// Parse and validate payload
	let payload: HealthAutoExportPayload;
	try {
		const rawPayload = await request.json();
		const result = HealthAutoExportPayloadSchema.safeParse(rawPayload);

		if (!result.success) {
			logger.warn({ errors: result.error.flatten() }, 'Webhook validation failed');
			throw error(400, 'Invalid payload format: ' + result.error.issues[0]?.message);
		}

		payload = result.data;
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}
		logger.error({ err }, 'Webhook JSON parse error');
		throw error(400, 'Invalid JSON payload');
	}

	try {
		const workouts = payload.data.workouts;

		// Filter for running workouts only
		const runningWorkouts = workouts.filter(w =>
			w.name.toLowerCase().includes('running') ||
			w.name.toLowerCase().includes('run')
		);

		let imported = 0;

		for (const workout of runningWorkouts) {
			const startTime = new Date(workout.start);
			const endTime = new Date(workout.end);
			const dateLocal = startTime.toISOString().split('T')[0];

			// Convert units
			const durationSeconds = workout.duration.units === 'min'
				? workout.duration.qty * 60
				: workout.duration.qty;

			const distanceMeters = workout.totalDistance
				? (workout.totalDistance.units === 'km'
					? workout.totalDistance.qty * 1000
					: workout.totalDistance.units === 'mi'
						? workout.totalDistance.qty * 1609.34
						: workout.totalDistance.qty)
				: 0;

			// Calculate pace
			const avgPaceSecondsPerKm = distanceMeters > 0
				? (durationSeconds / (distanceMeters / 1000))
				: null;

			await createWorkout(userId, {
				dateLocal,
				startTime,
				endTime,
				durationSeconds,
				distanceMeters,
				energyBurnedKcal: workout.totalEnergyBurned?.qty || null,
				avgHeartRate: workout.avgHeartRate?.qty || null,
				maxHeartRate: workout.maxHeartRate?.qty || null,
				avgPaceSecondsPerKm,
				elevationGainMeters: null,
				weatherTemp: null,
				weatherCondition: null,
				source: 'health_auto_export'
			}, auditContext);

			imported++;
		}

		await logAudit(userId, 'api_call', 'webhook', undefined, {
			...auditContext,
			metadata: { imported, total: workouts.length }
		});

		return json({
			success: true,
			imported,
			message: `Imported ${imported} running workout(s)`
		});

	} catch (err) {
		logger.error({ err }, 'Webhook processing error');
		throw error(500, 'Failed to process workouts');
	}
};
