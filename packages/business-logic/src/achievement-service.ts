/**
 * Achievement and milestone tracking
 */

import type { Achievement, AchievementStatus } from '@running-days/types';
import { MILESTONES, MILESTONE_NAMES } from '@running-days/types';

/**
 * Detect which milestones were crossed when days increased
 * @param previousDays - Days completed before the new run
 * @param currentDays - Days completed after the new run
 * @returns Array of milestone values that were just unlocked
 */
export function detectNewMilestones(
  previousDays: number,
  currentDays: number
): number[] {
  const newMilestones: number[] = [];

  for (const milestone of MILESTONES) {
    if (previousDays < milestone && currentDays >= milestone) {
      newMilestones.push(milestone);
    }
  }

  return newMilestones;
}

/**
 * Get the next milestone to achieve
 */
export function getNextMilestone(
  daysCompleted: number
): { milestone: number; name: string; daysRemaining: number } | null {
  for (const milestone of MILESTONES) {
    if (daysCompleted < milestone) {
      return {
        milestone,
        name: MILESTONE_NAMES[milestone],
        daysRemaining: milestone - daysCompleted
      };
    }
  }

  return null; // All milestones achieved
}

/**
 * Build achievement status from current progress and stored achievements
 */
export function getAchievementStatus(
  daysCompleted: number,
  storedAchievements: Array<{ milestone: number; unlockedAt: string }>
): AchievementStatus {
  const unlocked: Achievement[] = [];

  // Map stored achievements by milestone for quick lookup
  const achievementMap = new Map(
    storedAchievements.map(a => [a.milestone, a.unlockedAt])
  );

  // Build list of unlocked achievements
  for (const milestone of MILESTONES) {
    if (daysCompleted >= milestone) {
      unlocked.push({
        milestone,
        name: MILESTONE_NAMES[milestone],
        unlockedAt: achievementMap.get(milestone) ?? null
      });
    }
  }

  return {
    unlocked,
    next: getNextMilestone(daysCompleted)
  };
}

/**
 * Check if a specific milestone is achieved
 */
export function isMilestoneAchieved(
  daysCompleted: number,
  milestone: number
): boolean {
  return daysCompleted >= milestone;
}

/**
 * Get all milestones as an array with their names
 */
export function getAllMilestones(): Array<{ milestone: number; name: string }> {
  return MILESTONES.map(m => ({
    milestone: m,
    name: MILESTONE_NAMES[m]
  }));
}

// Re-export constants for convenience
export { MILESTONES, MILESTONE_NAMES };
