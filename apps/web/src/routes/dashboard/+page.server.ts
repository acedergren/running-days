import { db, dailyStats, goals, workouts } from '$lib/server/db';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { demoData } from '$lib/demo-data';
import { building } from '$app/environment';

export const load: PageServerLoad = async () => {
	// Use demo data during static prerendering (Cloudflare deployment)
	if (building) {
		return demoData;
	}
	const currentYear = new Date().getFullYear();
	const yearStart = `${currentYear}-01-01`;
	const yearEnd = `${currentYear}-12-31`;

	// Get or create goal for current year
	let goal = await db.query.goals.findFirst({
		where: eq(goals.year, currentYear)
	});

	if (!goal) {
		const [newGoal] = await db.insert(goals).values({
			year: currentYear,
			targetDays: 300
		}).returning();
		goal = newGoal;
	}

	// Count unique running days this year
	const runningDays = await db
		.select({ count: sql<number>`count(*)` })
		.from(dailyStats)
		.where(eq(dailyStats.year, currentYear));

	const daysCompleted = runningDays[0]?.count ?? 0;

	// Get total stats for the year
	const yearStats = await db
		.select({
			totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
			totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
			avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`
		})
		.from(dailyStats)
		.where(eq(dailyStats.year, currentYear));

	// Get recent runs for the activity feed
	const recentRuns = await db
		.select()
		.from(workouts)
		.where(and(
			gte(workouts.date, yearStart),
			lte(workouts.date, yearEnd)
		))
		.orderBy(desc(workouts.startTime))
		.limit(10);

	// Get daily stats for chart (last 30 days with data)
	const chartData = await db
		.select({
			date: dailyStats.date,
			distance: dailyStats.totalDistanceMeters,
			duration: dailyStats.totalDurationSeconds,
			pace: dailyStats.avgPaceSecondsPerKm
		})
		.from(dailyStats)
		.where(eq(dailyStats.year, currentYear))
		.orderBy(desc(dailyStats.date))
		.limit(30);

	return {
		goal: {
			targetDays: goal.targetDays,
			year: currentYear
		},
		progress: {
			daysCompleted,
			daysRemaining: Math.max(0, goal.targetDays - daysCompleted),
			percentComplete: Math.round((daysCompleted / goal.targetDays) * 100)
		},
		stats: {
			totalDistanceKm: (yearStats[0]?.totalDistance ?? 0) / 1000,
			totalDurationHours: (yearStats[0]?.totalDuration ?? 0) / 3600,
			avgPaceMinPerKm: (yearStats[0]?.avgPace ?? 0) / 60
		},
		recentRuns,
		chartData: chartData.reverse() // Chronological order for chart
	};
};
