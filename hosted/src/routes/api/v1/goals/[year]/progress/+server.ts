/**
 * GET /api/v1/goals/:year/progress
 * Get goal progress for a specific year including:
 * - Goal details
 * - Days completed vs target
 * - Pace metrics (on track / ahead / behind)
 * - Streak information
 */

import { json, error } from '@sveltejs/kit';
import { validateWebhookToken, getGoal, getYearSummary } from '$lib/server/data-access.js';
import { queryOne, query } from '$lib/server/db/index.js';
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

	const year = parseInt(params.year, 10);
	if (isNaN(year) || year < 2000 || year > 2100) {
		throw error(400, {
			message: 'Invalid year parameter',
			// @ts-expect-error - Adding custom error code
			code: 'VALIDATION_ERROR'
		});
	}

	// Get goal (or create default)
	let goal = await getGoal(userId, year);
	const targetDays = goal?.targetDays ?? 300;

	// Get year summary from daily stats
	const summary = await getYearSummary(userId, year);

	// Calculate pace metrics
	const paceMetrics = calculatePaceMetrics(year, summary.totalDays, targetDays);

	// Get streak information
	const streaks = await calculateStreaks(userId, year);

	return json({
		goal: {
			year,
			targetDays,
			createdAt: goal?.createdAt?.toISOString() ?? null,
			updatedAt: goal?.updatedAt?.toISOString() ?? null
		},
		progress: {
			daysCompleted: summary.totalDays,
			daysRemaining: Math.max(0, targetDays - summary.totalDays),
			percentComplete: Math.min(100, Math.round((summary.totalDays / targetDays) * 100 * 10) / 10),
			daysAhead: paceMetrics.daysAhead
		},
		paceMetrics: {
			requiredDaysPerWeek: paceMetrics.requiredPerWeek,
			currentPacePerWeek: paceMetrics.currentPerWeek,
			projectedCompletion: paceMetrics.projectedCompletion,
			willMeetGoal: paceMetrics.willMeetGoal
		},
		streaks,
		stats: {
			totalDistanceKm: Math.round(summary.totalDistance / 1000 * 10) / 10,
			totalDurationHours: Math.round(summary.totalDuration / 3600 * 10) / 10,
			avgPaceMinPerKm: summary.avgPace ? Math.round(summary.avgPace / 60 * 100) / 100 : null
		}
	});
};

interface PaceMetrics {
	requiredPerWeek: number;
	currentPerWeek: number;
	daysAhead: number;
	projectedCompletion: string | null;
	willMeetGoal: boolean;
}

function calculatePaceMetrics(year: number, daysCompleted: number, targetDays: number): PaceMetrics {
	const now = new Date();
	const startOfYear = new Date(year, 0, 1);
	const endOfYear = new Date(year, 11, 31);

	// Days elapsed and remaining in the year
	const isCurrentYear = now.getFullYear() === year;
	const dayOfYear = isCurrentYear
		? Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
		: now.getFullYear() > year ? 365 : 0;

	const daysRemainingInYear = Math.max(0, 365 - dayOfYear);
	const weeksElapsed = dayOfYear / 7;
	const weeksRemaining = daysRemainingInYear / 7;

	// Current pace (days per week)
	const currentPerWeek = weeksElapsed > 0 ? daysCompleted / weeksElapsed : 0;

	// Required pace to meet goal
	const daysNeeded = targetDays - daysCompleted;
	const requiredPerWeek = weeksRemaining > 0 ? daysNeeded / weeksRemaining : 0;

	// Expected days at current pace (for this point in the year)
	const expectedDays = Math.round(targetDays * (dayOfYear / 365));
	const daysAhead = daysCompleted - expectedDays;

	// Project completion date
	let projectedCompletion: string | null = null;
	let willMeetGoal = false;

	if (currentPerWeek > 0) {
		const daysToComplete = Math.ceil(daysNeeded / (currentPerWeek / 7));
		const projectedDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);

		if (projectedDate <= endOfYear) {
			willMeetGoal = true;
			projectedCompletion = projectedDate.toISOString().split('T')[0];
		} else {
			projectedCompletion = projectedDate.toISOString().split('T')[0];
		}
	}

	if (daysCompleted >= targetDays) {
		willMeetGoal = true;
		projectedCompletion = null; // Already completed
	}

	return {
		requiredPerWeek: Math.round(requiredPerWeek * 10) / 10,
		currentPerWeek: Math.round(currentPerWeek * 10) / 10,
		daysAhead,
		projectedCompletion,
		willMeetGoal
	};
}

async function calculateStreaks(userId: string, year: number): Promise<{
	current: number;
	longest: number;
	thisWeek: number;
	lastWeek: number;
}> {
	// Get all running dates for the year (ordered)
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
	const today = new Date().toISOString().split('T')[0];

	// Calculate current streak (consecutive days ending today or yesterday)
	let currentStreak = 0;
	const checkDate = new Date();
	for (let i = 0; i < 365; i++) {
		const dateStr = checkDate.toISOString().split('T')[0];
		if (dateSet.has(dateStr)) {
			currentStreak++;
			checkDate.setDate(checkDate.getDate() - 1);
		} else if (i === 0) {
			// Allow today to be missing (haven't run yet today)
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
	startOfThisWeek.setDate(now.getDate() - now.getDay()); // Sunday
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
