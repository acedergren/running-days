/**
 * Inbound Webhook Routes - Health Auto Export
 *
 * Receives workout data from the Health Auto Export iOS app
 * Docs: https://www.healthexportapp.com/
 */

import { FastifyPluginAsync } from 'fastify';
import { eq, and, sql } from 'drizzle-orm';
import { workouts, dailyStats, webhookTokens, goals, achievements } from '@running-days/database';
import {
  filterRunningWorkouts,
  processWorkout,
  mergeDailyStats,
  MILESTONES
} from '@running-days/business-logic';
import type { HealthExportPayload, DailyStatUpdate } from '@running-days/types';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/webhook
   * Receive workouts from Health Auto Export
   */
  fastify.post('/', async (request, reply) => {
    // Get token from query param or header
    const token = (request.query as { token?: string }).token
      ?? request.headers['x-webhook-token'] as string | undefined;

    if (!token) {
      return reply.unauthorized('Missing webhook token');
    }

    // Verify token exists and is active
    const validToken = await fastify.db.query.webhookTokens.findFirst({
      where: and(
        eq(webhookTokens.token, token),
        eq(webhookTokens.isActive, true)
      )
    });

    if (!validToken) {
      return reply.unauthorized('Invalid or inactive webhook token');
    }

    // Update last used timestamp
    await fastify.db
      .update(webhookTokens)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(eq(webhookTokens.id, validToken.id));

    // Parse and validate payload
    const payload = request.body as HealthExportPayload;
    if (!payload?.data) {
      return reply.badRequest('Invalid payload structure');
    }

    const incomingWorkouts = payload.data.workouts ?? [];
    const runningWorkouts = filterRunningWorkouts(incomingWorkouts);

    if (runningWorkouts.length === 0) {
      return {
        success: true,
        message: 'No running workouts in payload',
        processed: 0,
        skipped: 0
      };
    }

    let processed = 0;
    let skipped = 0;
    const affectedYears = new Set<number>();

    for (const workout of runningWorkouts) {
      // Validate date
      const startDate = new Date(workout.start);
      if (isNaN(startDate.getTime())) {
        skipped++;
        continue;
      }

      // Process workout
      const processedWorkout = processWorkout(workout);

      // Check for duplicate
      const existing = await fastify.db.query.workouts.findFirst({
        where: eq(workouts.id, processedWorkout.id)
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Insert workout
      await fastify.db.insert(workouts).values({
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
      const existingDay = await fastify.db.query.dailyStats.findFirst({
        where: eq(dailyStats.date, processedWorkout.date)
      });

      if (existingDay) {
        const existingStats: DailyStatUpdate = {
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

        await fastify.db
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
        await fastify.db.insert(dailyStats).values({
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

      affectedYears.add(processedWorkout.year);
      processed++;
    }

    // Check for new milestones in affected years
    const newMilestones: Array<{ year: number; milestone: number }> = [];

    for (const year of affectedYears) {
      // Get current count
      const [countResult] = await fastify.db
        .select({ count: sql<number>`count(*)` })
        .from(dailyStats)
        .where(eq(dailyStats.year, year));

      const currentCount = countResult?.count ?? 0;

      // Get already achieved milestones
      const existingAchievements = await fastify.db.query.achievements.findMany({
        where: eq(achievements.year, year)
      });

      const unlockedMilestones = new Set(existingAchievements.map(a => a.milestone));

      // Check which milestones should be unlocked based on current count
      // and aren't already in the database
      const milestonesToUnlock = MILESTONES.filter(
        m => currentCount >= m && !unlockedMilestones.has(m)
      );

      for (const milestone of milestonesToUnlock) {
        // Record achievement
        await fastify.db.insert(achievements).values({
          year,
          milestone,
          unlockedAt: new Date().toISOString()
        });

        newMilestones.push({ year, milestone });

        // TODO: Dispatch outbound webhook for milestone.reached event
        fastify.log.info({ year, milestone }, 'New milestone reached');
      }

      // Check if goal was achieved
      const goal = await fastify.db.query.goals.findFirst({
        where: eq(goals.year, year)
      });

      if (goal && currentCount >= goal.targetDays) {
        // Check if we haven't already recorded goal achievement
        const goalAchievement = existingAchievements.find(
          a => a.milestone === goal.targetDays
        );

        if (!goalAchievement) {
          // TODO: Dispatch outbound webhook for goal.achieved event
          fastify.log.info({ year, targetDays: goal.targetDays }, 'Goal achieved');
        }
      }
    }

    // Log webhook event
    fastify.auditLogger.logAuditEvent({
      user_id: null, // Webhook is not user-authenticated
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'WEBHOOK_RECEIVED',
      resource: '/api/webhook',
      resource_type: 'webhook',
      outcome: 'success',
      phi_accessed: true,
      metadata: {
        tokenId: validToken.id,
        tokenName: validToken.name,
        processed,
        skipped,
        newMilestones
      }
    });

    return {
      success: true,
      message: `Processed ${processed} running workouts`,
      processed,
      skipped,
      newMilestones: newMilestones.length > 0 ? newMilestones : undefined
    };
  });

  /**
   * GET /api/webhook
   * Test webhook connectivity
   */
  fastify.get('/', async (request, reply) => {
    const token = (request.query as { token?: string }).token;

    if (!token) {
      return {
        status: 'ok',
        message: 'Webhook endpoint active. Token required for POST.'
      };
    }

    const validToken = await fastify.db.query.webhookTokens.findFirst({
      where: and(
        eq(webhookTokens.token, token),
        eq(webhookTokens.isActive, true)
      )
    });

    if (!validToken) {
      return reply.unauthorized('Invalid token');
    }

    return {
      status: 'ok',
      message: 'Token valid',
      tokenName: validToken.name
    };
  });
};
