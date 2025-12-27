/**
 * GET /api/v1/stats/dashboard
 * Main dashboard data for the current year including:
 * - Goal and progress
 * - Recent runs
 * - Key stats
 * - Chart data for visualizations
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken, getGoal, getYearSummary } from '$lib/server/data-access.js';
import { query, queryOne } from '$lib/server/db/index.js';
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

	// Get year from query params or default to current year
	const yearParam = url.searchParams.get('year');
	const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

	// Fetch data in parallel
	const [goal, summary, recentRuns, chartData, runningDaysCount] = await Promise.all([
		getGoal(userId, year),
		getYearSummary(userId, year),
		getRecentRuns(userId, year, 5),
		getChartData(userId, year),
		getRunningDaysCount(userId, year)
	]);

	const targetDays = goal?.targetDays ?? 300;
	const daysCompleted = runningDaysCount;

	// Calculate days left in year
	const now = new Date();
	const endOfYear = new Date(year, 11, 31);
	const daysLeft = year === now.getFullYear()
		? Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
		: (now.getFullYear() < year ? 365 : 0);

	return json({
		goal: {
			year,
			targetDays,
			createdAt: goal?.createdAt?.toISOString() ?? null,
			updatedAt: goal?.updatedAt?.toISOString() ?? null
		},
		progress: {
			daysCompleted,
			daysRemaining: Math.max(0, targetDays - daysCompleted),
			percentComplete: Math.min(100, Math.round((daysCompleted / targetDays) * 100 * 10) / 10),
			daysAhead: calculateDaysAhead(year, daysCompleted, targetDays)
		},
		stats: {
			totalDistanceKm: Math.round(summary.totalDistance / 1000 * 10) / 10,
			totalDurationHours: Math.round(summary.totalDuration / 3600 * 10) / 10,
			avgPaceMinPerKm: summary.avgPace ? Math.round(summary.avgPace / 60 * 100) / 100 : null,
			daysLeft
		},
		recentRuns,
		chartData
	});
};

async function getRecentRuns(userId: string, year: number, limit: number): Promise<Array<{
	id: string;
	date: string;
	startTime: string;
	endTime: string;
	durationSeconds: number;
	distanceMeters: number;
	avgPaceSecondsPerKm: number | null;
	avgHeartRate: number | null;
	maxHeartRate: number | null;
	energyBurnedKcal: number | null;
	source: string;
}>> {
	const workouts = await query<Workout>(
		`SELECT
			id, date_local as "dateLocal",
			start_time as "startTime", end_time as "endTime",
			duration_seconds as "durationSeconds", distance_meters as "distanceMeters",
			avg_pace_seconds_per_km as "avgPaceSecondsPerKm",
			avg_heart_rate as "avgHeartRate", max_heart_rate as "maxHeartRate",
			energy_burned_kcal as "energyBurnedKcal", source
		FROM workouts
		WHERE user_id = :userId AND EXTRACT(YEAR FROM date_local) = :year
		ORDER BY start_time DESC
		FETCH FIRST :limit ROWS ONLY`,
		{ userId, year, limit }
	);

	return workouts.map((w) => ({
		id: w.id,
		date: w.dateLocal,
		startTime: w.startTime.toISOString(),
		endTime: w.endTime.toISOString(),
		durationSeconds: w.durationSeconds,
		distanceMeters: w.distanceMeters,
		avgPaceSecondsPerKm: w.avgPaceSecondsPerKm,
		avgHeartRate: w.avgHeartRate,
		maxHeartRate: w.maxHeartRate,
		energyBurnedKcal: w.energyBurnedKcal,
		source: w.source
	}));
}

async function getChartData(userId: string, year: number): Promise<Array<{
	date: string;
	distance: number;
	duration: number;
	pace: number | null;
}>> {
	// Get last 30 days of data for chart
	const data = await query<{
		DATE_LOCAL: string;
		TOTAL_DISTANCE: number;
		TOTAL_DURATION: number;
		AVG_PACE: number | null;
	}>(
		`SELECT
			TO_CHAR(date_local, 'YYYY-MM-DD') as "DATE_LOCAL",
			total_distance_meters as "TOTAL_DISTANCE",
			total_duration_seconds as "TOTAL_DURATION",
			avg_pace_seconds_per_km as "AVG_PACE"
		FROM daily_stats
		WHERE user_id = :userId AND year_num = :year
		ORDER BY date_local DESC
		FETCH FIRST 30 ROWS ONLY`,
		{ userId, year }
	);

	return data.map((d) => ({
		date: d.DATE_LOCAL,
		distance: d.TOTAL_DISTANCE,
		duration: d.TOTAL_DURATION,
		pace: d.AVG_PACE
	})).reverse(); // Oldest to newest for charts
}

async function getRunningDaysCount(userId: string, year: number): Promise<number> {
	const result = await queryOne<{ COUNT: number }>(
		`SELECT COUNT(*) as "COUNT"
		 FROM daily_stats
		 WHERE user_id = :userId AND year_num = :year`,
		{ userId, year }
	);
	return result?.COUNT ?? 0;
}

function calculateDaysAhead(year: number, daysCompleted: number, targetDays: number): number {
	const now = new Date();
	const startOfYear = new Date(year, 0, 1);

	if (now.getFullYear() !== year) {
		return year < now.getFullYear()
			? daysCompleted - targetDays
			: 0;
	}

	const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	const expectedDays = Math.round(targetDays * (dayOfYear / 365));
	return daysCompleted - expectedDays;
}
