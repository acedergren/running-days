import { describe, it, expect } from 'vitest';
import {
  calculateStreaks,
  wouldStreakBreak,
  daysSinceLastRun
} from './streak-calculator';

describe('calculateStreaks', () => {
  it('should return zeros for empty array', () => {
    const result = calculateStreaks([]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.lastRunDate).toBeNull();
  });

  it('should handle single day', () => {
    const today = new Date('2024-06-15');
    const result = calculateStreaks(['2024-06-15'], today);

    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.lastRunDate).toBe('2024-06-15');
  });

  it('should calculate current streak correctly', () => {
    const today = new Date('2024-06-15');
    const dates = [
      '2024-06-10',
      '2024-06-12', // Gap after 10, starts new streak
      '2024-06-13',
      '2024-06-14',
      '2024-06-15' // Today
    ];

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(4); // 12, 13, 14, 15 (consecutive)
    expect(result.longest).toBe(4);
  });

  it('should count streak from yesterday if not run today', () => {
    const today = new Date('2024-06-15');
    const dates = [
      '2024-06-12',
      '2024-06-13',
      '2024-06-14' // Yesterday
    ];

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(3);
  });

  it('should return 0 current streak if last run was 2+ days ago', () => {
    const today = new Date('2024-06-15');
    const dates = [
      '2024-06-10',
      '2024-06-11',
      '2024-06-12',
      '2024-06-13' // 2 days ago
    ];

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(0);
    expect(result.longest).toBe(4);
  });

  it('should find longest streak in the past', () => {
    const today = new Date('2024-06-15');
    const dates = [
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05', // 5-day streak
      '2024-06-14',
      '2024-06-15' // 2-day current streak
    ];

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(2);
    expect(result.longest).toBe(5);
  });

  it('should handle unsorted input by sorting', () => {
    const today = new Date('2024-06-15');
    const dates = [
      '2024-06-15',
      '2024-06-13',
      '2024-06-14'
    ];

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it('should handle long consecutive streaks', () => {
    const today = new Date('2024-06-15');
    const dates: string[] = [];

    // Generate 30 consecutive days ending today
    for (let i = 29; i >= 0; i--) {
      const date = new Date('2024-06-15');
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const result = calculateStreaks(dates, today);

    expect(result.current).toBe(30);
    expect(result.longest).toBe(30);
  });
});

describe('wouldStreakBreak', () => {
  it('should return false if no last run', () => {
    expect(wouldStreakBreak(null)).toBe(false);
  });

  it('should return true if last run was yesterday', () => {
    // This depends on actual today, so we test the logic
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    expect(wouldStreakBreak(yesterdayStr)).toBe(true);
  });

  it('should return false if ran today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(wouldStreakBreak(today)).toBe(false);
  });
});

describe('daysSinceLastRun', () => {
  it('should return null if no last run', () => {
    expect(daysSinceLastRun(null)).toBeNull();
  });

  it('should return 0 if ran today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(daysSinceLastRun(today)).toBe(0);
  });

  it('should return 1 if ran yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    expect(daysSinceLastRun(yesterdayStr)).toBe(1);
  });

  it('should calculate correct days for older runs', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const dateStr = tenDaysAgo.toISOString().split('T')[0];

    expect(daysSinceLastRun(dateStr)).toBe(10);
  });
});
