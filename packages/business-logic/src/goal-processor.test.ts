import { describe, it, expect } from 'vitest';
import {
  calculateProgress,
  calculateExpectedDays,
  calculatePaceMetrics,
  validateGoalYear,
  validateTargetDays
} from './goal-processor';

describe('calculateProgress', () => {
  it('should calculate correct progress when ahead of pace', () => {
    // Mid-year (July 1 = day 182 of 365), target 300 days
    // Expected by July 1: (182/365) * 300 = ~149.6 days
    // If completed 160 days, should be ~10 days ahead
    const july1 = new Date('2024-07-01');
    const result = calculateProgress(300, 160, july1);

    expect(result.daysCompleted).toBe(160);
    expect(result.onTrack).toBe(true);
    expect(result.daysAhead).toBeGreaterThan(0);
    expect(result.percentComplete).toBe(53); // 160/300 = 53%
  });

  it('should calculate correct progress when behind pace', () => {
    // Mid-year, target 300, only completed 100
    const july1 = new Date('2024-07-01');
    const result = calculateProgress(300, 100, july1);

    expect(result.daysCompleted).toBe(100);
    expect(result.onTrack).toBe(false);
    expect(result.daysAhead).toBeLessThan(0);
  });

  it('should cap percentComplete at 100', () => {
    const result = calculateProgress(300, 350, new Date('2024-12-31'));
    expect(result.percentComplete).toBe(100);
  });

  it('should calculate daysRemaining correctly', () => {
    const result = calculateProgress(300, 250, new Date('2024-10-01'));
    expect(result.daysRemaining).toBe(50);
  });

  it('should set daysRemaining to 0 when goal exceeded', () => {
    const result = calculateProgress(300, 310, new Date('2024-12-31'));
    expect(result.daysRemaining).toBe(0);
  });
});

describe('calculateExpectedDays', () => {
  it('should return 0 at start of year', () => {
    const jan1 = new Date('2024-01-01');
    // Day 1 of 366 (leap year), target 300
    // Expected: (1/366) * 300 ≈ 0.82
    const result = calculateExpectedDays(300, 2024, jan1);
    expect(result).toBeLessThan(1);
  });

  it('should return target at end of year', () => {
    const dec31 = new Date('2024-12-31');
    // Day 366 of 366 (leap year), target 300
    // Expected: (366/366) * 300 = 300
    const result = calculateExpectedDays(300, 2024, dec31);
    expect(result).toBeCloseTo(300, 0);
  });

  it('should return half target at mid-year', () => {
    // July 1 is approximately day 183 of 366
    const july1 = new Date('2024-07-01');
    const result = calculateExpectedDays(300, 2024, july1);
    expect(result).toBeCloseTo(150, -1); // Within 10 days
  });
});

describe('calculatePaceMetrics', () => {
  it('should calculate daily and weekly required pace', () => {
    // 100 days into year, completed 50, need 250 more in remaining 265 days
    const april10 = new Date('2024-04-10'); // Approximately day 101
    const result = calculatePaceMetrics(300, 50, april10);

    expect(result.dailyRequired).toBeGreaterThan(0.9);
    expect(result.dailyRequired).toBeLessThan(1.1);
    expect(result.weeklyRequired).toBeCloseTo(result.dailyRequired * 7, 1);
    expect(result.daysRemainingInYear).toBeGreaterThan(260);
  });

  it('should project total based on current pace', () => {
    // 100 days into year, completed 100 days = 1.0 per day pace
    const april10 = new Date('2024-04-10');
    const result = calculatePaceMetrics(300, 100, april10);

    // At 1.0/day pace, projected total ≈ 366 for leap year
    expect(result.projectedTotal).toBeGreaterThan(350);
  });

  it('should handle edge case at end of year', () => {
    // Dec 30 is day 365 of 366 in leap year, so 1 day remaining
    const dec30 = new Date('2024-12-30');
    const result = calculatePaceMetrics(300, 298, dec30);

    expect(result.daysRemainingInYear).toBe(1);
    expect(result.dailyRequired).toBe(2); // Need 2 days in 1 remaining
  });

  it('should return 0 for dailyRequired when goal achieved', () => {
    const result = calculatePaceMetrics(300, 300, new Date('2024-10-15'));
    expect(result.dailyRequired).toBe(0);
  });
});

describe('validateGoalYear', () => {
  it('should accept valid years', () => {
    expect(validateGoalYear(2024)).toBe(true);
    expect(validateGoalYear(2025)).toBe(true);
    expect(validateGoalYear(2000)).toBe(true);
    expect(validateGoalYear(2100)).toBe(true);
  });

  it('should reject invalid years', () => {
    expect(validateGoalYear(1999)).toBe(false);
    expect(validateGoalYear(2101)).toBe(false);
    expect(validateGoalYear(0)).toBe(false);
    expect(validateGoalYear(-2024)).toBe(false);
  });

  it('should reject non-integers', () => {
    expect(validateGoalYear(2024.5)).toBe(false);
    expect(validateGoalYear(NaN)).toBe(false);
  });
});

describe('validateTargetDays', () => {
  it('should accept valid target days', () => {
    expect(validateTargetDays(1, 2024)).toBe(true);
    expect(validateTargetDays(300, 2024)).toBe(true);
    expect(validateTargetDays(365, 2023)).toBe(true);
    expect(validateTargetDays(366, 2024)).toBe(true); // Leap year
  });

  it('should reject invalid target days', () => {
    expect(validateTargetDays(0, 2024)).toBe(false);
    expect(validateTargetDays(-1, 2024)).toBe(false);
    expect(validateTargetDays(367, 2024)).toBe(false); // Exceeds leap year
    expect(validateTargetDays(366, 2023)).toBe(false); // Non-leap year
  });

  it('should reject non-integers', () => {
    expect(validateTargetDays(300.5, 2024)).toBe(false);
    expect(validateTargetDays(NaN, 2024)).toBe(false);
  });
});
