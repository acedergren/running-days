/**
 * Goal progress calculation logic
 */

import type { GoalProgress, PaceMetrics } from '@running-days/types';
import { isLeapYear, getDayOfYear, getDaysInYear } from '@running-days/utils';

/**
 * Calculate goal progress metrics
 */
export function calculateProgress(
  targetDays: number,
  daysCompleted: number,
  currentDate: Date = new Date()
): GoalProgress {
  const year = currentDate.getFullYear();
  const expectedDays = calculateExpectedDays(targetDays, year, currentDate);
  const daysAhead = daysCompleted - expectedDays;
  const daysRemaining = Math.max(0, targetDays - daysCompleted);
  const percentComplete = Math.round((daysCompleted / targetDays) * 100);

  return {
    daysCompleted,
    daysRemaining,
    percentComplete: Math.min(100, percentComplete),
    onTrack: daysAhead >= 0,
    expectedDays: Math.round(expectedDays),
    daysAhead: Math.round(daysAhead)
  };
}

/**
 * Calculate how many days should be completed by now to be on track
 */
export function calculateExpectedDays(
  targetDays: number,
  year: number,
  currentDate: Date = new Date()
): number {
  const totalDaysInYear = getDaysInYear(year);
  const dayOfYear = getDayOfYear(currentDate);

  // Linear interpolation: expected = (dayOfYear / totalDaysInYear) * targetDays
  return (dayOfYear / totalDaysInYear) * targetDays;
}

/**
 * Calculate pace metrics - what's needed to hit the goal
 */
export function calculatePaceMetrics(
  targetDays: number,
  daysCompleted: number,
  currentDate: Date = new Date()
): PaceMetrics {
  const year = currentDate.getFullYear();
  const totalDaysInYear = getDaysInYear(year);
  const dayOfYear = getDayOfYear(currentDate);
  const daysRemainingInYear = totalDaysInYear - dayOfYear;
  const daysNeeded = targetDays - daysCompleted;

  // Avoid division by zero
  const dailyRequired = daysRemainingInYear > 0
    ? Math.max(0, daysNeeded / daysRemainingInYear)
    : 0;

  const weeklyRequired = dailyRequired * 7;

  // Project where they'll end up at current pace
  const currentPace = dayOfYear > 0 ? daysCompleted / dayOfYear : 0;
  const projectedTotal = Math.round(currentPace * totalDaysInYear);

  return {
    dailyRequired: Math.round(dailyRequired * 100) / 100,
    weeklyRequired: Math.round(weeklyRequired * 100) / 100,
    projectedTotal,
    daysRemainingInYear
  };
}

/**
 * Validate a goal year is reasonable
 */
export function validateGoalYear(year: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/**
 * Validate target days is within acceptable range
 */
export function validateTargetDays(days: number, year: number): boolean {
  const maxDays = getDaysInYear(year);
  return Number.isInteger(days) && days >= 1 && days <= maxDays;
}

// Re-export utility functions that are commonly used with goals
export { isLeapYear, getDaysInYear, getDayOfYear };
