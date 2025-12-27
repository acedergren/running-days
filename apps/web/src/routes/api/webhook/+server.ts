import { json, error } from '@sveltejs/kit';

// Exclude from static prerendering (dynamic API endpoint)
export const prerender = false;
import { db, workouts, dailyStats, webhookTokens } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	filterRunningWorkouts,
	processWorkout,
	mergeDailyStats,
	type HealthExportWorkout,
	type DailyStatsUpdate
} from '$lib/workout-processor';
import type { RequestHandler } from './$types';

/**
 * Health Auto Export Webhook Endpoint
 *
 * Receives workout data from the Health Auto Export iOS app
 * Docs: https://www.healthexportapp.com/
 */

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

	// Use shared filter function from workout-processor
	const runningWorkouts = filterRunningWorkouts(incomingWorkouts);

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
		// Validate date before processing
		const startDate = new Date(workout.start);
		if (isNaN(startDate.getTime())) {
			skipped++;
			continue;
		}

		// Use shared processor to transform workout
		const processedWorkout = processWorkout(workout);

		// Check if workout already exists
		const existing = await db.query.workouts.findFirst({
			where: eq(workouts.id, processedWorkout.id)
		});

		if (existing) {
			skipped++;
			continue;
		}

		// Insert workout
		await db.insert(workouts).values({
			id: processedWorkout.id,
			date: processedWorkout.date,
			startTime: processedWorkout.startTime,
			endTime: processedWorkout.endTime,
			durationSeconds: processedWorkout.durationSeconds,
			distanceMeters: processedWorkout.distanceMeters,
			energyBurnedKcal: processedWorkout.energyBurnedKcal,
			avgHeartRate: processedWorkout.avgHeartRate,
			maxHeartRate: processedWorkout.maxHeartRate,
			avgPaceSecondsPerKm: processedWorkout.avgPaceSecondsPerKm,
			source: 'health_auto_export',
			rawPayload: processedWorkout.rawPayload
		});

		// Update or create daily stats
		const existingDay = await db.query.dailyStats.findFirst({
			where: eq(dailyStats.date, processedWorkout.date)
		});

		if (existingDay) {
			// Use shared merge function
			const existingStats: DailyStatsUpdate = {
				date: existingDay.date,
				year: existingDay.year,
				runCount: existingDay.runCount,
				totalDistanceMeters: existingDay.totalDistanceMeters,
				totalDurationSeconds: existingDay.totalDurationSeconds,
				avgPaceSecondsPerKm: existingDay.avgPaceSecondsPerKm,
				longestRunMeters: existingDay.longestRunMeters ?? 0,
				fastestPaceSecondsPerKm: existingDay.fastestPaceSecondsPerKm
			};

			const mergedStats = mergeDailyStats(existingStats, processedWorkout);

			await db
				.update(dailyStats)
				.set({
					runCount: mergedStats.runCount,
					totalDistanceMeters: mergedStats.totalDistanceMeters,
					totalDurationSeconds: mergedStats.totalDurationSeconds,
					avgPaceSecondsPerKm: mergedStats.avgPaceSecondsPerKm,
					longestRunMeters: mergedStats.longestRunMeters,
					fastestPaceSecondsPerKm: mergedStats.fastestPaceSecondsPerKm,
					updatedAt: new Date().toISOString()
				})
				.where(eq(dailyStats.date, processedWorkout.date));
		} else {
			// Create new day entry
			await db.insert(dailyStats).values({
				date: processedWorkout.date,
				year: processedWorkout.year,
				runCount: 1,
				totalDistanceMeters: processedWorkout.distanceMeters,
				totalDurationSeconds: processedWorkout.durationSeconds,
				avgPaceSecondsPerKm: processedWorkout.avgPaceSecondsPerKm,
				longestRunMeters: processedWorkout.distanceMeters,
				fastestPaceSecondsPerKm: processedWorkout.avgPaceSecondsPerKm
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
