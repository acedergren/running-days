/**
 * Goal Management Routes
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { goals, dailyStats, achievements } from '@running-days/database';
import {
  calculateProgress,
  calculatePaceMetrics,
  validateGoalYear,
  validateTargetDays
} from '@running-days/business-logic';
import { calculateStreaks } from '@running-days/business-logic';
import { getAchievementStatus, detectNewMilestones, MILESTONE_NAMES } from '@running-days/business-logic';

// Validation schemas
const createGoalSchema = z.object({
  year: z.number().int(),
  targetDays: z.number().int().min(1).max(366).optional().default(300)
});

const updateGoalSchema = z.object({
  targetDays: z.number().int().min(1).max(366)
});

export const goalsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/goals
   * List all goals with basic progress
   */
  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async () => {
    const allGoals = await fastify.db.query.goals.findMany({
      orderBy: (goals, { desc }) => [desc(goals.year)]
    });

    // Get running days count for each year
    const goalsWithProgress = await Promise.all(
      allGoals.map(async (goal) => {
        const [stats] = await fastify.db
          .select({ count: sql<number>`count(*)` })
          .from(dailyStats)
          .where(eq(dailyStats.year, goal.year));

        const daysCompleted = stats?.count ?? 0;
        const percentComplete = Math.round((daysCompleted / goal.targetDays) * 100);

        return {
          year: goal.year,
          targetDays: goal.targetDays,
          daysCompleted,
          percentComplete: Math.min(100, percentComplete),
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt
        };
      })
    );

    return {
      goals: goalsWithProgress,
      count: goalsWithProgress.length
    };
  });

  /**
   * POST /api/v1/goals
   * Create a new goal
   */
  fastify.post('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const parseResult = createGoalSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const { year, targetDays } = parseResult.data;

    // Validate year
    if (!validateGoalYear(year)) {
      return reply.badRequest('Year must be between 2000 and 2100');
    }

    // Validate target days for the year
    if (!validateTargetDays(targetDays, year)) {
      return reply.badRequest(`Target days must be between 1 and the number of days in ${year}`);
    }

    // Check if goal already exists
    const existing = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    if (existing) {
      return reply.conflict(`Goal already exists for year ${year}`);
    }

    // Create goal
    const [newGoal] = await fastify.db
      .insert(goals)
      .values({ year, targetDays })
      .returning();

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'GOAL_CREATED',
      resource: `/goals/${year}`,
      resource_type: 'goal',
      outcome: 'success',
      phi_accessed: true,
      metadata: { year, targetDays }
    });

    // TODO: Dispatch webhook event

    return reply.code(201).send({
      goal: {
        year: newGoal.year,
        targetDays: newGoal.targetDays,
        createdAt: newGoal.createdAt,
        updatedAt: newGoal.updatedAt
      }
    });
  });

  /**
   * GET /api/v1/goals/:year
   * Get goal with basic progress
   */
  fastify.get<{ Params: { year: string } }>('/:year', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    if (isNaN(year)) {
      return reply.badRequest('Invalid year');
    }

    const goal = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    if (!goal) {
      return reply.notFound(`Goal not found for year ${year}`);
    }

    // Get days completed
    const [stats] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(dailyStats)
      .where(eq(dailyStats.year, year));

    const daysCompleted = stats?.count ?? 0;
    const progress = calculateProgress(goal.targetDays, daysCompleted);

    return {
      goal: {
        year: goal.year,
        targetDays: goal.targetDays,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
      },
      progress
    };
  });

  /**
   * PUT /api/v1/goals/:year
   * Update goal target days
   */
  fastify.put<{ Params: { year: string } }>('/:year', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    if (isNaN(year)) {
      return reply.badRequest('Invalid year');
    }

    const parseResult = updateGoalSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.badRequest(parseResult.error.message);
    }

    const { targetDays } = parseResult.data;

    // Validate target days
    if (!validateTargetDays(targetDays, year)) {
      return reply.badRequest(`Target days must be between 1 and the number of days in ${year}`);
    }

    // Find existing goal
    const existing = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    if (!existing) {
      return reply.notFound(`Goal not found for year ${year}`);
    }

    const previousTarget = existing.targetDays;

    // Update goal
    await fastify.db
      .update(goals)
      .set({
        targetDays,
        updatedAt: new Date().toISOString()
      })
      .where(eq(goals.year, year));

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'GOAL_UPDATED',
      resource: `/goals/${year}`,
      resource_type: 'goal',
      outcome: 'success',
      phi_accessed: true,
      metadata: { year, previousTarget, newTarget: targetDays }
    });

    // TODO: Dispatch webhook event

    return {
      goal: {
        year,
        targetDays,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      },
      previousTarget
    };
  });

  /**
   * DELETE /api/v1/goals/:year
   * Delete a goal
   */
  fastify.delete<{ Params: { year: string } }>('/:year', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    if (isNaN(year)) {
      return reply.badRequest('Invalid year');
    }

    // Find existing goal
    const existing = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    if (!existing) {
      return reply.notFound(`Goal not found for year ${year}`);
    }

    // Check if there's data for this year
    const [stats] = await fastify.db
      .select({ count: sql<number>`count(*)` })
      .from(dailyStats)
      .where(eq(dailyStats.year, year));

    if (stats?.count > 0) {
      return reply.conflict(
        `Cannot delete goal for ${year} - ${stats.count} running days exist. ` +
        'Update the target instead or delete the workout data first.'
      );
    }

    // Delete goal
    await fastify.db.delete(goals).where(eq(goals.year, year));

    // Log audit event
    fastify.auditLogger.logAuditEvent({
      user_id: request.user!.id,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'] || 'unknown',
      action: 'GOAL_DELETED',
      resource: `/goals/${year}`,
      resource_type: 'goal',
      outcome: 'success',
      phi_accessed: true,
      metadata: { year, targetDays: existing.targetDays }
    });

    // TODO: Dispatch webhook event

    return {
      success: true,
      message: `Goal for ${year} deleted`
    };
  });

  /**
   * GET /api/v1/goals/:year/progress
   * Get detailed progress with streaks, achievements, and pace
   */
  fastify.get<{ Params: { year: string } }>('/:year/progress', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    if (isNaN(year)) {
      return reply.badRequest('Invalid year');
    }

    const goal = await fastify.db.query.goals.findFirst({
      where: eq(goals.year, year)
    });

    if (!goal) {
      return reply.notFound(`Goal not found for year ${year}`);
    }

    // Get all running days for this year
    const runningDays = await fastify.db
      .select({
        date: dailyStats.date,
        totalDistanceMeters: dailyStats.totalDistanceMeters,
        totalDurationSeconds: dailyStats.totalDurationSeconds,
        avgPaceSecondsPerKm: dailyStats.avgPaceSecondsPerKm
      })
      .from(dailyStats)
      .where(eq(dailyStats.year, year))
      .orderBy(dailyStats.date);

    const daysCompleted = runningDays.length;

    // Calculate progress
    const progress = calculateProgress(goal.targetDays, daysCompleted);
    const paceMetrics = calculatePaceMetrics(goal.targetDays, daysCompleted);

    // Calculate streaks
    const dates = runningDays.map(d => d.date);
    const streaks = calculateStreaks(dates);

    // Get stored achievements
    const storedAchievements = await fastify.db.query.achievements.findMany({
      where: eq(achievements.year, year)
    });

    const achievementStatus = getAchievementStatus(
      daysCompleted,
      storedAchievements.map(a => ({
        milestone: a.milestone,
        unlockedAt: a.unlockedAt
      }))
    );

    // Calculate stats
    const totalDistanceMeters = runningDays.reduce((sum, d) => sum + d.totalDistanceMeters, 0);
    const totalDurationSeconds = runningDays.reduce((sum, d) => sum + d.totalDurationSeconds, 0);

    const paces = runningDays
      .map(d => d.avgPaceSecondsPerKm)
      .filter((p): p is number => p !== null);
    const avgPaceSecondsPerKm = paces.length > 0
      ? paces.reduce((sum, p) => sum + p, 0) / paces.length
      : null;

    // Log PHI access
    fastify.auditLogger.logPhiView(
      request.raw as unknown as Request,
      request.user!.id,
      `/goals/${year}/progress`,
      'goal'
    );

    return {
      goal: {
        year: goal.year,
        targetDays: goal.targetDays,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
      },
      progress,
      streaks,
      achievements: achievementStatus,
      stats: {
        totalDistanceKm: Math.round(totalDistanceMeters / 100) / 10,
        totalDurationHours: Math.round(totalDurationSeconds / 36) / 100,
        avgPaceMinPerKm: avgPaceSecondsPerKm ? Math.round(avgPaceSecondsPerKm / 6) / 10 : null
      },
      pace: paceMetrics
    };
  });
};
