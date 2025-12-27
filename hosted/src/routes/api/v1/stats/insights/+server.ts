/**
 * GET /api/v1/stats/insights
 * Insights and analytics including:
 * - Streak information
 * - Monthly/weekly breakdowns
 * - Pace trends
 * - Personal bests
 * - Achievements
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken } from '$lib/server/data-access.js';
import { query, queryOne } from '$lib/server/db/index.js';
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

	// Fetch all insights data in parallel
	const [streaks, monthlyData, weeklyData, paceData, personalBests, achievements] = await Promise.all([
		calculateStreaks(userId, year),
		getMonthlyData(userId, year),
		getWeeklyData(userId, year),
		getPaceData(userId, year),
		getPersonalBests(userId, year),
		calculateAchievements(userId, year)
	]);

	return json({
		streaks,
		monthlyData,
		weeklyData,
		paceData,
		personalBests,
		achievements
	});
};

async function calculateStreaks(userId: string, year: number): Promise<{
	current: number;
	longest: number;
	thisWeek: number;
	lastWeek: number;
}> {
	// Get all running dates (ordered)
	const dates = await query<{ DATE_LOCAL: Date }>(
		`SELECT DISTINCT date_local as "DATE_LOCAL"
		 FROM daily_stats
		 WHERE user_id = :userId AND year_num = :year
		 ORDER BY date_local DESC`,
		{ userId, year }
	);

	if (dates.length === 0) {
		return { current: 0, longest: 0, thisWeek: 0, lastWeek: 0 };
	}

	const dateSet = new Set(dates.map((d) => d.DATE_LOCAL.toISOString().split('T')[0]));

	// Calculate current streak
	let currentStreak = 0;
	const checkDate = new Date();
	for (let i = 0; i < 365; i++) {
		const dateStr = checkDate.toISOString().split('T')[0];
		if (dateSet.has(dateStr)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (i === 0) {
			checkDate.setDate(checkDate.getDate() - 1);
		} else {
			break;
		}
	}

	// Calculate longest streak
	let longestStreak = 0;
	let tempStreak = 0;
	const sortedDates = [...dateSet].sort();

	for (let i = 0; i < sortedDates.length; i++) {
		if (i === 0) {
			tempStreak = 1;
		} else {
			const prev = new Date(sortedDates[i - 1]);
			const curr = new Date(sortedDates[i]);
			const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

			if (diffDays === 1) {
				tempStreak++;
			} else {
				longestStreak = Math.max(longestStreak, tempStreak);
				tempStreak = 1;
			}
		}
	}
	longestStreak = Math.max(longestStreak, tempStreak);

	// Calculate this week and last week
	const now = new Date();
	const startOfThisWeek = new Date(now);
	startOfThisWeek.setDate(now.getDate() - now.getDay());
	startOfThisWeek.setHours(0, 0, 0, 0);

	const startOfLastWeek = new Date(startOfThisWeek);
	startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

	let thisWeek = 0;
	let lastWeek = 0;

	for (const dateStr of dateSet) {
		const d = new Date(dateStr);
		if (d >= startOfThisWeek) {
			thisWeek++;
		} else if (d >= startOfLastWeek && d < startOfThisWeek) {
			lastWeek++;
		}
	}

	return { current: currentStreak, longest: longestStreak, thisWeek, lastWeek };
}

async function getMonthlyData(userId: string, year: number): Promise<Array<{
	month: string;
	runningDays: number;
	totalDistanceKm: number;
}>> {
	const data = await query<{
		MONTH: string;
		RUNNING_DAYS: number;
		TOTAL_DISTANCE: number;
	}>(
		`SELECT
			TO_CHAR(date_local, 'YYYY-MM') as "MONTH",
			COUNT(*) as "RUNNING_DAYS",
			SUM(total_distance_meters) as "TOTAL_DISTANCE"
		FROM daily_stats
		WHERE user_id = :userId AND year_num = :year
		GROUP BY TO_CHAR(date_local, 'YYYY-MM')
		ORDER BY "MONTH"`,
		{ userId, year }
	);

	return data.map((d) => ({
		month: d.MONTH,
		runningDays: d.RUNNING_DAYS,
		totalDistanceKm: Math.round(d.TOTAL_DISTANCE / 1000 * 10) / 10
	}));
}

async function getWeeklyData(userId: string, year: number): Promise<Array<{
	weekLabel: string;
	distanceKm: number;
	runningDays: number;
}>> {
	// Get last 12 weeks of data
	const data = await query<{
		WEEK_START: Date;
		RUNNING_DAYS: number;
		TOTAL_DISTANCE: number;
	}>(
		`SELECT
			TRUNC(date_local, 'IW') as "WEEK_START",
			COUNT(*) as "RUNNING_DAYS",
			SUM(total_distance_meters) as "TOTAL_DISTANCE"
		FROM daily_stats
		WHERE user_id = :userId AND year_num = :year
		GROUP BY TRUNC(date_local, 'IW')
		ORDER BY "WEEK_START" DESC
		FETCH FIRST 12 ROWS ONLY`,
		{ userId, year }
	);

	return data.map((d) => ({
		weekLabel: d.WEEK_START.toISOString().split('T')[0],
		distanceKm: Math.round(d.TOTAL_DISTANCE / 1000 * 10) / 10,
		runningDays: d.RUNNING_DAYS
	})).reverse();
}

async function getPaceData(userId: string, year: number): Promise<Array<{
	id: string;
	date: string;
	paceMinPerKm: number;
}>> {
	const data = await query<{
		ID: string;
		DATE_LOCAL: string;
		AVG_PACE: number;
	}>(
		`SELECT
			id as "ID",
			TO_CHAR(date_local, 'YYYY-MM-DD') as "DATE_LOCAL",
			avg_pace_seconds_per_km as "AVG_PACE"
		FROM workouts
		WHERE user_id = :userId
			AND EXTRACT(YEAR FROM date_local) = :year
			AND avg_pace_seconds_per_km IS NOT NULL
		ORDER BY date_local DESC
		FETCH FIRST 50 ROWS ONLY`,
		{ userId, year }
	);

	return data.map((d) => ({
		id: d.ID,
		date: d.DATE_LOCAL,
		paceMinPerKm: Math.round(d.AVG_PACE / 60 * 100) / 100
	})).reverse();
}

async function getPersonalBests(userId: string, year: number): Promise<{
	longestRunKm: number | null;
	longestRunDate: string | null;
	fastestPaceMinPerKm: number | null;
	fastestPaceDate: string | null;
}> {
	// Longest run
	const longestRun = await queryOne<{ DISTANCE: number; DATE_LOCAL: string }>(
		`SELECT
			distance_meters as "DISTANCE",
			TO_CHAR(date_local, 'YYYY-MM-DD') as "DATE_LOCAL"
		FROM workouts
		WHERE user_id = :userId AND EXTRACT(YEAR FROM date_local) = :year
		ORDER BY distance_meters DESC NULLS LAST
		FETCH FIRST 1 ROW ONLY`,
		{ userId, year }
	);

	// Fastest pace (lowest seconds per km)
	const fastestPace = await queryOne<{ PACE: number; DATE_LOCAL: string }>(
		`SELECT
			avg_pace_seconds_per_km as "PACE",
			TO_CHAR(date_local, 'YYYY-MM-DD') as "DATE_LOCAL"
		FROM workouts
		WHERE user_id = :userId
			AND EXTRACT(YEAR FROM date_local) = :year
			AND avg_pace_seconds_per_km IS NOT NULL
			AND distance_meters >= 1000
		ORDER BY avg_pace_seconds_per_km ASC
		FETCH FIRST 1 ROW ONLY`,
		{ userId, year }
	);

	return {
		longestRunKm: longestRun ? Math.round(longestRun.DISTANCE / 1000 * 100) / 100 : null,
		longestRunDate: longestRun?.DATE_LOCAL ?? null,
		fastestPaceMinPerKm: fastestPace ? Math.round(fastestPace.PACE / 60 * 100) / 100 : null,
		fastestPaceDate: fastestPace?.DATE_LOCAL ?? null
	};
}

async function calculateAchievements(userId: string, year: number): Promise<Array<{
	id: string;
	name: string;
	description: string;
	milestone: number;
	unlockedAt: string | null;
	isUnlocked: boolean;
}>> {
	// Get stats for achievement calculation
	const stats = await queryOne<{
		TOTAL_DAYS: number;
		TOTAL_DISTANCE: number;
		MAX_STREAK: number;
	}>(
		`SELECT
			COUNT(*) as "TOTAL_DAYS",
			NVL(SUM(total_distance_meters), 0) as "TOTAL_DISTANCE",
			MAX(run_count) as "MAX_STREAK"
		FROM daily_stats
		WHERE user_id = :userId AND year_num = :year`,
		{ userId, year }
	);

	const totalDays = stats?.TOTAL_DAYS ?? 0;
	const totalDistanceKm = (stats?.TOTAL_DISTANCE ?? 0) / 1000;

	const milestones = [
		{ id: 'first_run', name: 'First Steps', description: 'Complete your first run', milestone: 1, check: () => totalDays >= 1 },
		{ id: 'week_warrior', name: 'Week Warrior', description: 'Run 7 days', milestone: 7, check: () => totalDays >= 7 },
		{ id: 'month_master', name: 'Month Master', description: 'Run 30 days', milestone: 30, check: () => totalDays >= 30 },
		{ id: 'century', name: 'Century Club', description: 'Run 100 days', milestone: 100, check: () => totalDays >= 100 },
		{ id: 'half_way', name: 'Half Way There', description: 'Reach 150 running days', milestone: 150, check: () => totalDays >= 150 },
		{ id: 'double_century', name: 'Double Century', description: 'Run 200 days', milestone: 200, check: () => totalDays >= 200 },
		{ id: 'goal_crusher', name: 'Goal Crusher', description: 'Reach 300 running days', milestone: 300, check: () => totalDays >= 300 },
		{ id: 'distance_50', name: 'Distance Runner', description: 'Run 50km total', milestone: 50, check: () => totalDistanceKm >= 50 },
		{ id: 'distance_100', name: 'Centurion', description: 'Run 100km total', milestone: 100, check: () => totalDistanceKm >= 100 },
		{ id: 'distance_500', name: 'Road Warrior', description: 'Run 500km total', milestone: 500, check: () => totalDistanceKm >= 500 },
		{ id: 'distance_1000', name: 'Marathoner', description: 'Run 1000km total', milestone: 1000, check: () => totalDistanceKm >= 1000 }
	];

	return milestones.map((m) => ({
		id: m.id,
		name: m.name,
		description: m.description,
		milestone: m.milestone,
		unlockedAt: m.check() ? new Date().toISOString() : null, // Simplified - in prod, would track actual unlock date
		isUnlocked: m.check()
	}));
}
