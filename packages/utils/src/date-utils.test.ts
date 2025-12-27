import { describe, it, expect } from 'vitest';
import {
  isLeapYear,
  getDaysInYear,
  getDayOfYear,
  extractDateFromISO,
  extractYearFromDate,
  isConsecutiveDay,
  parseDate,
  getYearStart,
  getYearEnd,
} from './date-utils';

describe('isLeapYear', () => {
  it('identifies leap years correctly', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2020)).toBe(true);
  });

  it('identifies non-leap years correctly', () => {
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(2025)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // Divisible by 100 but not 400
    expect(isLeapYear(2100)).toBe(false);
  });
});

describe('getDaysInYear', () => {
  it('returns 366 for leap years', () => {
    expect(getDaysInYear(2024)).toBe(366);
    expect(getDaysInYear(2000)).toBe(366);
  });

  it('returns 365 for non-leap years', () => {
    expect(getDaysInYear(2023)).toBe(365);
    expect(getDaysInYear(2025)).toBe(365);
  });
});

describe('getDayOfYear', () => {
  it('returns correct day of year', () => {
    expect(getDayOfYear(new Date(2025, 0, 1))).toBe(1); // Jan 1
    expect(getDayOfYear(new Date(2025, 0, 31))).toBe(31); // Jan 31
    expect(getDayOfYear(new Date(2025, 11, 31))).toBe(365); // Dec 31
  });

  it('handles leap years', () => {
    expect(getDayOfYear(new Date(2024, 11, 31))).toBe(366); // Dec 31 in leap year
  });
});

describe('extractDateFromISO', () => {
  it('extracts date from ISO datetime', () => {
    expect(extractDateFromISO('2025-01-15T08:30:00Z')).toBe('2025-01-15');
    expect(extractDateFromISO('2024-12-31T23:59:59.999Z')).toBe('2024-12-31');
  });

  it('handles date-only strings', () => {
    expect(extractDateFromISO('2025-06-15')).toBe('2025-06-15');
  });
});

describe('extractYearFromDate', () => {
  it('extracts year from date string', () => {
    expect(extractYearFromDate('2025-01-15')).toBe(2025);
    expect(extractYearFromDate('2024-12-31T23:59:59Z')).toBe(2024);
  });
});

describe('isConsecutiveDay', () => {
  it('returns true for consecutive days', () => {
    expect(isConsecutiveDay('2025-01-15', '2025-01-16')).toBe(true);
    expect(isConsecutiveDay('2025-01-16', '2025-01-15')).toBe(true); // Order doesn't matter
    expect(isConsecutiveDay('2025-01-31', '2025-02-01')).toBe(true); // Month boundary
    expect(isConsecutiveDay('2024-12-31', '2025-01-01')).toBe(true); // Year boundary
  });

  it('returns false for non-consecutive days', () => {
    expect(isConsecutiveDay('2025-01-15', '2025-01-17')).toBe(false);
    expect(isConsecutiveDay('2025-01-15', '2025-01-15')).toBe(false); // Same day
    expect(isConsecutiveDay('2025-01-15', '2025-01-20')).toBe(false);
  });
});

describe('parseDate', () => {
  it('parses YYYY-MM-DD strings correctly', () => {
    const date = parseDate('2025-01-15');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // January = 0
    expect(date.getDate()).toBe(15);
  });
});

describe('getYearStart', () => {
  it('returns January 1st of the year', () => {
    expect(getYearStart(2025)).toBe('2025-01-01');
    expect(getYearStart(2024)).toBe('2024-01-01');
  });
});

describe('getYearEnd', () => {
  it('returns December 31st of the year', () => {
    expect(getYearEnd(2025)).toBe('2025-12-31');
    expect(getYearEnd(2024)).toBe('2024-12-31');
  });
});
