/**
 * Goal domain types
 */

export interface Goal {
  id: number;
  year: number;
  targetDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewGoal {
  year: number;
  targetDays?: number;
}

export interface GoalProgress {
  daysCompleted: number;
  daysRemaining: number;
  percentComplete: number;
  onTrack: boolean;
  expectedDays: number;
  daysAhead: number;
}

export interface PaceMetrics {
  dailyRequired: number;
  weeklyRequired: number;
  projectedTotal: number;
  daysRemainingInYear: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastRunDate: string | null;
}

export interface Achievement {
  milestone: number;
  name: string;
  unlockedAt: string | null;
}

export interface AchievementStatus {
  unlocked: Achievement[];
  next: {
    milestone: number;
    name: string;
    daysRemaining: number;
  } | null;
}

export const MILESTONES = [50, 100, 150, 200, 250, 300] as const;
export type Milestone = typeof MILESTONES[number];

export const MILESTONE_NAMES: Record<Milestone, string> = {
  50: 'Half Century',
  100: 'Century',
  150: 'Triple Crown',
  200: 'Double Century',
  250: 'Platinum',
  300: 'Complete'
};
