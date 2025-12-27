/**
 * Streak calculation logic
 */

import type { StreakInfo } from '@running-days/types';
import { isConsecutiveDay, getTodayString, getYesterdayString } from '@running-days/utils';

/**
 * Calculate current and longest streaks from sorted running dates
 * @param dates - Array of YYYY-MM-DD date strings, sorted ascending
 * @param referenceDate - The date to calculate "current" streak from (defaults to today)
 */
export function calculateStreaks(
  dates: string[],
  referenceDate: Date = new Date()
): StreakInfo {
  if (dates.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastRunDate: null
    };
  }

  // Ensure dates are sorted ascending
  const sortedDates = [...dates].sort();
  const today = referenceDate.toISOString().split('T')[0];
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const lastRunDate = sortedDates[sortedDates.length - 1];

  // Calculate all streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    if (isConsecutiveDay(sortedDates[i - 1], sortedDates[i])) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (must include today or yesterday)
  if (lastRunDate === today || lastRunDate === yesterdayStr) {
    currentStreak = 1;
    // Count backwards from the last run
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      if (isConsecutiveDay(sortedDates[i], sortedDates[i + 1])) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    lastRunDate
  };
}

/**
 * Check if a streak would be broken if user doesn't run today
 */
export function wouldStreakBreak(lastRunDate: string | null): boolean {
  if (!lastRunDate) return false;

  const today = getTodayString();
  const yesterday = getYesterdayString();

  // Streak is active if last run was today or yesterday
  // It would break if they don't run today and last run was yesterday
  return lastRunDate === yesterday;
}

/**
 * Calculate days since last run
 */
export function daysSinceLastRun(lastRunDate: string | null): number | null {
  if (!lastRunDate) return null;

  const last = new Date(lastRunDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
