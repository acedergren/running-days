/**
 * Stats Routes - Dashboard and Insights Data
 */

import { FastifyPluginAsync } from 'fastify';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import { goals, dailyStats, workouts } from '@running-days/database';
import { calculateProgress, calculatePaceMetrics } from '@running-days/business-logic';
import { calculateStreaks } from '@running-days/business-logic';

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/stats/dashboard
   * Main dashboard data: goal, progress, stats, recent runs, chart data
   */
  fastify.get('/dashboard', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Get or create goal for current year
    let goal = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, currentYear)
    });

    if (!goal) {
      const [newGoal] = await fastify.db
        .insert(goals)
        .values({ year: currentYear, targetDays: 300 })
        .returning();
      goal = newGoal;
    }

    // Count unique running days this year
    const [runningDaysResult] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(dailyStats)
      .where(eq(dailyStats.year, currentYear));

    const daysCompleted = runningDaysResult?.count ?? 0;

    // Get total stats for the year
    const [yearStats] = await fastify.db
      .select({
        totalDistance: sql<number>`sum(${dailyStats.totalDistanceMeters})`,
        totalDuration: sql<number>`sum(${dailyStats.totalDurationSeconds})`,
        avgPace: sql<number>`avg(${dailyStats.avgPaceSecondsPerKm})`
      })
      .from(dailyStats)
      .where(eq(dailyStats.year, currentYear));

    // Get recent runs for activity feed
    const recentRuns = await fastify.db
      .select()
      .from(workouts)
      .where(and(
        gte(workouts.date, yearStart),
        lte(workouts.date, yearEnd)
      ))
      .orderBy(desc(workouts.startTime))
      .limit(10);

    // Get daily stats for chart (last 30 days with data)
    const chartData = await fastify.db
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

    // Calculate progress using business logic
    const progress = calculateProgress(goal.targetDays, daysCompleted);
    const pace = calculatePaceMetrics(goal.targetDays, daysCompleted);

    // Log PHI access
    fastify.auditLogger.logPhiView(
      request.raw as unknown as Request,
      request.user!.id,
      '/stats/dashboard',
      'dashboard'
    );

    return {
      goal: {
        targetDays: goal.targetDays,
        year: currentYear
      },
      progress,
      stats: {
        totalDistanceKm: Math.round((yearStats?.totalDistance ?? 0) / 100) / 10,
        totalDurationHours: Math.round((yearStats?.totalDuration ?? 0) / 36) / 100,
        avgPaceMinPerKm: yearStats?.avgPace
          ? Math.round(yearStats.avgPace / 6) / 10
          : null
      },
      recentRuns: recentRuns.map(run => ({
        id: run.id,
        date: run.date,
        startTime: run.startTime,
        endTime: run.endTime,
        durationSeconds: run.durationSeconds,
        distanceMeters: run.distanceMeters,
        avgPaceSecondsPerKm: run.avgPaceSecondsPerKm
      })),
      chartData: chartData.reverse(), // Chronological order
      pace
    };
  });

  /**
   * GET /api/v1/stats/insights
   * Detailed analytics: yearly/monthly/weekly data, streaks, records
   */
  fastify.get('/insights', {
    preHandler: [fastify.authenticate]
  }, async (request) => {
    const currentYear = new Date().getFullYear();

    // Get all daily stats for the year
    const yearlyData = await fastify.db
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

    // Monthly aggregates
    const monthlyData = await fastify.db
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

    // Weekly aggregates (last 12 weeks)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const weeklyData = await fastify.db
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

    // Calculate streaks using business logic
    const dates = yearlyData.map(d => d.date);
    const streaks = calculateStreaks(dates);

    // Best performances
    const bestDistance = yearlyData.reduce(
      (max, d) => (d.distance > max ? d.distance : max),
      0
    );

    const paceDays = yearlyData.filter(d => d.pace && d.pace > 0);
    const bestPace = paceDays.length > 0
      ? paceDays.reduce((min, d) => (d.pace! < min ? d.pace! : min), Infinity)
      : null;

    // Log PHI access
    fastify.auditLogger.logPhiView(
      request.raw as unknown as Request,
      request.user!.id,
      '/stats/insights',
      'insights'
    );

    return {
      yearlyData: yearlyData.map(d => ({
        date: d.date,
        distanceKm: Math.round(d.distance / 100) / 10,
        durationMinutes: Math.round(d.duration / 6) / 10,
        paceMinPerKm: d.pace ? Math.round(d.pace / 6) / 10 : null,
        runCount: d.runCount
      })),
      monthlyData: monthlyData.map(m => ({
        month: m.month,
        totalDistanceKm: Math.round((m.totalDistance ?? 0) / 100) / 10,
        totalDurationHours: Math.round((m.totalDuration ?? 0) / 36) / 100,
        runningDays: m.runningDays ?? 0,
        avgPaceMinPerKm: m.avgPace ? Math.round(m.avgPace / 6) / 10 : null
      })),
      weeklyData: weeklyData.map(w => ({
        week: w.week,
        totalDistanceKm: Math.round((w.totalDistance ?? 0) / 100) / 10,
        totalDurationHours: Math.round((w.totalDuration ?? 0) / 36) / 100,
        runningDays: w.runningDays ?? 0,
        avgPaceMinPerKm: w.avgPace ? Math.round(w.avgPace / 6) / 10 : null
      })),
      streaks,
      stats: {
        totalDays: yearlyData.length,
        totalDistanceKm: Math.round(yearlyData.reduce((sum, d) => sum + d.distance, 0) / 100) / 10,
        totalDurationHours: Math.round(yearlyData.reduce((sum, d) => sum + d.duration, 0) / 36) / 100,
        bestDistanceKm: Math.round(bestDistance / 100) / 10,
        bestPaceMinPerKm: bestPace ? Math.round(bestPace / 6) / 10 : null
      }
    };
  });

  /**
   * GET /api/v1/stats/year/:year
   * Historical stats for a specific year
   */
  fastify.get<{ Params: { year: string } }>('/year/:year', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    if (isNaN(year) || year < 2000 || year > 2100) {
      return reply.badRequest('Invalid year');
    }

    // Get goal
    const goal = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    // Get all daily stats for the year
    const yearlyData = await fastify.db
      .select({
        date: dailyStats.date,
        distance: dailyStats.totalDistanceMeters,
        duration: dailyStats.totalDurationSeconds,
        pace: dailyStats.avgPaceSecondsPerKm,
        runCount: dailyStats.runCount
      })
      .from(dailyStats)
      .where(eq(dailyStats.year, year))
      .orderBy(dailyStats.date);

    const daysCompleted = yearlyData.length;
    const dates = yearlyData.map(d => d.date);
    const streaks = calculateStreaks(dates);

    const totalDistance = yearlyData.reduce((sum, d) => sum + d.distance, 0);
    const totalDuration = yearlyData.reduce((sum, d) => sum + d.duration, 0);

    // Log PHI access
    fastify.auditLogger.logPhiView(
      request.raw as unknown as Request,
      request.user!.id,
      `/stats/year/${year}`,
      'historical'
    );

    return {
      year,
      goal: goal ? {
        targetDays: goal.targetDays,
        createdAt: goal.createdAt
      } : null,
      stats: {
        totalDays: daysCompleted,
        totalDistanceKm: Math.round(totalDistance / 100) / 10,
        totalDurationHours: Math.round(totalDuration / 36) / 100,
        goalAchieved: goal ? daysCompleted >= goal.targetDays : false
      },
      streaks
    };
  });
};
