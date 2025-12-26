import { json, error } from '@sveltejs/kit';
import { db, workouts, dailyStats, webhookTokens } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * Health Auto Export Webhook Endpoint
 *
 * Receives workout data from the Health Auto Export iOS app
 * Docs: https://www.healthexportapp.com/
 */

interface HealthExportWorkout {
	id?: string;
	name: string;
	start: string; // ISO datetime
	end: string;
	duration: number; // seconds
	distance?: number; // meters
	activeEnergy?: number; // kcal
	avgHeartRate?: number;
	maxHeartRate?: number;
}

interface HealthExportPayload {
	data: {
		workouts?: HealthExportWorkout[];
	};
}

export const POST: RequestHandler = async ({ request, url }) => {
	// Validate webhook token from query param or header
	const token = url.searchParams.get('token') ?? request.headers.get('x-webhook-token');

	if (!token) {
		throw error(401, 'Missing webhook token');
	}

	// Verify token exists and is active
	const validToken = await db.query.webhookTokens.findFirst({
		where: and(
			eq(webhookTokens.token, token),
			eq(webhookTokens.isActive, true)
		)
	});

	if (!validToken) {
		throw error(401, 'Invalid or inactive webhook token');
	}

	// Update last used timestamp
	await db
		.update(webhookTokens)
		.set({ lastUsedAt: new Date().toISOString() })
		.where(eq(webhookTokens.id, validToken.id));

	// Parse payload
	let payload: HealthExportPayload;
	try {
		payload = await request.json();
	} catch {
		throw error(400, 'Invalid JSON payload');
	}

	const incomingWorkouts = payload.data?.workouts ?? [];

	// Filter to only running workouts
	const runningWorkouts = incomingWorkouts.filter(
		(w) => w.name.toLowerCase().includes('running') ||
		       w.name.toLowerCase().includes('run')
	);

	if (runningWorkouts.length === 0) {
		return json({
			success: true,
			message: 'No running workouts in payload',
			processed: 0
		});
	}

	let processed = 0;
	let skipped = 0;

	for (const workout of runningWorkouts) {
		const workoutId = workout.id ?? `${workout.start}-${workout.duration}`;
		const startDate = new Date(workout.start);
		const dateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
		const year = startDate.getFullYear();

		// Check if workout already exists
		const existing = await db.query.workouts.findFirst({
			where: eq(workouts.id, workoutId)
		});

		if (existing) {
			skipped++;
			continue;
		}

		// Calculate pace if we have distance
		const avgPaceSecondsPerKm = workout.distance && workout.distance > 0
			? (workout.duration / (workout.distance / 1000))
			: null;

		// Insert workout
		await db.insert(workouts).values({
			id: workoutId,
			date: dateStr,
			startTime: workout.start,
			endTime: workout.end,
			durationSeconds: Math.round(workout.duration),
			distanceMeters: workout.distance ?? 0,
			energyBurnedKcal: workout.activeEnergy,
			avgHeartRate: workout.avgHeartRate,
			maxHeartRate: workout.maxHeartRate,
			avgPaceSecondsPerKm,
			source: 'health_auto_export',
			rawPayload: JSON.stringify(workout)
		});

		// Update or create daily stats
		const existingDay = await db.query.dailyStats.findFirst({
			where: eq(dailyStats.date, dateStr)
		});

		if (existingDay) {
			// Update existing day's stats
			const newTotalDistance = existingDay.totalDistanceMeters + (workout.distance ?? 0);
			const newTotalDuration = existingDay.totalDurationSeconds + workout.duration;
			const newAvgPace = newTotalDistance > 0
				? newTotalDuration / (newTotalDistance / 1000)
				: null;

			await db
				.update(dailyStats)
				.set({
					runCount: existingDay.runCount + 1,
					totalDistanceMeters: newTotalDistance,
					totalDurationSeconds: newTotalDuration,
					avgPaceSecondsPerKm: newAvgPace,
					longestRunMeters: Math.max(
						existingDay.longestRunMeters ?? 0,
						workout.distance ?? 0
					),
					fastestPaceSecondsPerKm: avgPaceSecondsPerKm
						? Math.min(
								existingDay.fastestPaceSecondsPerKm ?? Infinity,
								avgPaceSecondsPerKm
							)
						: existingDay.fastestPaceSecondsPerKm,
					updatedAt: new Date().toISOString()
				})
				.where(eq(dailyStats.date, dateStr));
		} else {
			// Create new day entry
			await db.insert(dailyStats).values({
				date: dateStr,
				year,
				runCount: 1,
				totalDistanceMeters: workout.distance ?? 0,
				totalDurationSeconds: Math.round(workout.duration),
				avgPaceSecondsPerKm,
				longestRunMeters: workout.distance ?? 0,
				fastestPaceSecondsPerKm: avgPaceSecondsPerKm
			});
		}

		processed++;
	}

	return json({
		success: true,
		message: `Processed ${processed} running workouts`,
		processed,
		skipped
	});
};

// GET endpoint for testing webhook connectivity
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return json({ status: 'ok', message: 'Webhook endpoint active. Token required for POST.' });
	}

	const validToken = await db.query.webhookTokens.findFirst({
		where: and(
			eq(webhookTokens.token, token),
			eq(webhookTokens.isActive, true)
		)
	});

	if (!validToken) {
		throw error(401, 'Invalid token');
	}

	return json({
		status: 'ok',
		message: 'Token valid',
		tokenName: validToken.name
	});
};
