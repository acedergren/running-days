import { db, dailyStats, workouts } from '$lib/server/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const currentYear = new Date().getFullYear();

	// Get all daily stats for the year (for charts)
	const yearlyData = await db
		.select({
			date: dailyStats.date,
			distance: dailyStats.totalDistanceMeters,
			duration: dailyStats.totalDurationSeconds,
			pace: dailyStats.avgPaceSecondsPerKm,
			runCount: dailyStats.runCount
		})
		.from(dailyStats)
		.where(eq(dailyStats.year, currentYear))
		.orderBy(dailyStats.date);

	// Get monthly aggregates
	const monthlyData = await db
		.select({
			month: sql<string>`strftime('%Y-%m', ${dailyStats.date})`,
			totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
			totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
			runningDays: sql<number>`count(*)`,
			avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`
		})
		.from(dailyStats)
		.where(eq(dailyStats.year, currentYear))
		.groupBy(sql`strftime('%Y-%m', ${dailyStats.date})`)
		.orderBy(sql`strftime('%Y-%m', ${dailyStats.date})`);

	// Get weekly aggregates (last 12 weeks)
	const twelveWeeksAgo = new Date();
	twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
	const weeklyData = await db
		.select({
			week: sql<string>`strftime('%Y-W%W', ${dailyStats.date})`,
			totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
			totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
			runningDays: sql<number>`count(*)`,
			avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`
		})
		.from(dailyStats)
		.where(and(
			eq(dailyStats.year, currentYear),
			gte(dailyStats.date, twelveWeeksAgo.toISOString().split('T')[0])
		))
		.groupBy(sql`strftime('%Y-W%W', ${dailyStats.date})`)
		.orderBy(sql`strftime('%Y-W%W', ${dailyStats.date})`);

	// Calculate streaks
	const sortedDates = yearlyData.map(d => d.date).sort();
	let currentStreak = 0;
	let longestStreak = 0;
	let tempStreak = 1;

	for (let i = 1; i < sortedDates.length; i++) {
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
	longestStreak = Math.max(longestStreak, tempStreak);

	// Check if today or yesterday was a running day for current streak
	const today = new Date().toISOString().split('T')[0];
	const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
	const recentRun = sortedDates.includes(today) || sortedDates.includes(yesterday);

	if (recentRun && sortedDates.length > 0) {
		currentStreak = 1;
		for (let i = sortedDates.length - 2; i >= 0; i--) {
			const curr = new Date(sortedDates[i + 1]);
			const prev = new Date(sortedDates[i]);
			const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
			if (diffDays === 1) {
				currentStreak++;
			} else {
				break;
			}
		}
	}

	// Best performances
	const bestDistance = yearlyData.reduce((max, d) => d.distance > max ? d.distance : max, 0);
	const bestPace = yearlyData
		.filter(d => d.pace && d.pace > 0)
		.reduce((min, d) => (d.pace && d.pace < min) ? d.pace : min, Infinity);

	return {
		yearlyData,
		monthlyData,
		weeklyData,
		stats: {
			totalDays: yearlyData.length,
			totalDistance: yearlyData.reduce((sum, d) => sum + d.distance, 0),
			totalDuration: yearlyData.reduce((sum, d) => sum + d.duration, 0),
			currentStreak,
			longestStreak,
			bestDistance,
			bestPace: bestPace === Infinity ? null : bestPace
		}
	};
};
