import { describe, it, expect } from 'vitest';
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatPaceFromSeconds,
  calculatePace,
  ordinal,
  formatPercent,
} from './formatters';

describe('formatDistance', () => {
  it('formats distances under 10km with 2 decimals', () => {
    expect(formatDistance(5230)).toBe('5.23');
    expect(formatDistance(1000)).toBe('1.00');
    expect(formatDistance(9990)).toBe('9.99');
  });

  it('formats distances 10km+ with 1 decimal', () => {
    expect(formatDistance(10000)).toBe('10.0');
    expect(formatDistance(12345)).toBe('12.3');
    expect(formatDistance(42195)).toBe('42.2');
  });
});

describe('formatDuration', () => {
  it('formats durations under 1 hour as MM:SS', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('formats durations 1+ hours as H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7325)).toBe('2:02:05');
  });
});

describe('formatPace', () => {
  it('formats pace from m/s to min:sec per km', () => {
    // 1000m in 300s = 5:00/km
    expect(formatPace(1000 / 300)).toBe('5:00');
    // 1000m in 330s = 5:30/km
    expect(formatPace(1000 / 330)).toBe('5:30');
  });

  it('handles zero or negative speed', () => {
    expect(formatPace(0)).toBe('--:--');
    expect(formatPace(-1)).toBe('--:--');
  });
});

describe('formatPaceFromSeconds', () => {
  it('formats pace from seconds per km', () => {
    expect(formatPaceFromSeconds(300)).toBe('5:00');
    expect(formatPaceFromSeconds(330)).toBe('5:30');
    expect(formatPaceFromSeconds(359)).toBe('5:59');
  });

  it('handles null or invalid values', () => {
    expect(formatPaceFromSeconds(null)).toBe('--:--');
    expect(formatPaceFromSeconds(0)).toBe('--:--');
    expect(formatPaceFromSeconds(-100)).toBe('--:--');
  });
});

describe('calculatePace', () => {
  it('calculates pace correctly', () => {
    expect(calculatePace(5000, 1500)).toBeCloseTo(3.333, 2);
    expect(calculatePace(10000, 3000)).toBeCloseTo(3.333, 2);
  });

  it('returns 0 for invalid inputs', () => {
    expect(calculatePace(0, 1000)).toBe(0);
    expect(calculatePace(1000, 0)).toBe(0);
    expect(calculatePace(-100, 1000)).toBe(0);
  });
});

describe('ordinal', () => {
  it('returns correct ordinal suffixes', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(23)).toBe('23rd');
    expect(ordinal(100)).toBe('100th');
  });
});

describe('formatPercent', () => {
  it('formats decimal values as percentages', () => {
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0.823, 1)).toBe('82.3%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('formats percentage values when isDecimal is false', () => {
    expect(formatPercent(50, 0, false)).toBe('50%');
    expect(formatPercent(82.3, 1, false)).toBe('82.3%');
  });
});
