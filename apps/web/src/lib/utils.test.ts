import { describe, it, expect } from 'vitest';
import {
	cn,
	formatDistance,
	formatDuration,
	formatPace,
	calculatePace,
	ordinal
} from './utils';

describe('cn (class name merger)', () => {
	it('should merge class names', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	it('should handle conditional classes', () => {
		expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
	});

	it('should resolve Tailwind conflicts (last wins)', () => {
		expect(cn('p-4', 'p-2')).toBe('p-2');
		expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
	});
});

describe('formatDistance', () => {
	it('should format distances under 10km with 2 decimal places', () => {
		expect(formatDistance(5000)).toBe('5.00');
		expect(formatDistance(5123)).toBe('5.12');
		expect(formatDistance(9999)).toBe('10.00'); // still uses 2 decimals because input < 10km
	});

	it('should format distances 10km+ with 1 decimal place', () => {
		expect(formatDistance(10000)).toBe('10.0');
		expect(formatDistance(21097)).toBe('21.1');
		expect(formatDistance(42195)).toBe('42.2');
	});

	it('should handle zero distance', () => {
		expect(formatDistance(0)).toBe('0.00');
	});
});

describe('formatDuration', () => {
	it('should format seconds-only durations', () => {
		expect(formatDuration(45)).toBe('0:45');
	});

	it('should format minute:second durations', () => {
		expect(formatDuration(125)).toBe('2:05');
		expect(formatDuration(3599)).toBe('59:59');
	});

	it('should format hour:minute:second durations', () => {
		expect(formatDuration(3600)).toBe('1:00:00');
		expect(formatDuration(3661)).toBe('1:01:01');
		expect(formatDuration(7325)).toBe('2:02:05');
	});

	it('should pad minutes and seconds correctly', () => {
		expect(formatDuration(65)).toBe('1:05');
		expect(formatDuration(3665)).toBe('1:01:05');
	});
});

describe('formatPace', () => {
	it('should return --:-- for zero or negative speed', () => {
		expect(formatPace(0)).toBe('--:--');
		expect(formatPace(-1)).toBe('--:--');
	});

	it('should calculate min/km from m/s', () => {
		// 4 m/s = 250 seconds/km = 4:10
		expect(formatPace(4)).toBe('4:10');

		// 3 m/s = 333.33 seconds/km = 5:33
		expect(formatPace(3)).toBe('5:33');
	});

	it('should pad seconds', () => {
		// 2.78 m/s ≈ 360 seconds/km = 6:00
		expect(formatPace(1000 / 360)).toBe('6:00');
	});
});

describe('calculatePace', () => {
	it('should return 0 for zero or negative inputs', () => {
		expect(calculatePace(0, 100)).toBe(0);
		expect(calculatePace(100, 0)).toBe(0);
		expect(calculatePace(-100, 100)).toBe(0);
		expect(calculatePace(100, -100)).toBe(0);
	});

	it('should calculate m/s correctly', () => {
		// 5000m in 1500s = 3.33 m/s
		expect(calculatePace(5000, 1500)).toBeCloseTo(3.33, 2);

		// 10000m in 3000s = 3.33 m/s
		expect(calculatePace(10000, 3000)).toBeCloseTo(3.33, 2);
	});
});

describe('ordinal', () => {
	it('should handle 1st, 2nd, 3rd', () => {
		expect(ordinal(1)).toBe('1st');
		expect(ordinal(2)).toBe('2nd');
		expect(ordinal(3)).toBe('3rd');
	});

	it('should handle 4th-20th (all use th)', () => {
		expect(ordinal(4)).toBe('4th');
		expect(ordinal(11)).toBe('11th');
		expect(ordinal(12)).toBe('12th');
		expect(ordinal(13)).toBe('13th');
		expect(ordinal(20)).toBe('20th');
	});

	it('should handle 21st, 22nd, 23rd pattern', () => {
		expect(ordinal(21)).toBe('21st');
		expect(ordinal(22)).toBe('22nd');
		expect(ordinal(23)).toBe('23rd');
		expect(ordinal(24)).toBe('24th');
	});

	it('should handle 100+ with same pattern', () => {
		expect(ordinal(101)).toBe('101st');
		expect(ordinal(102)).toBe('102nd');
		expect(ordinal(111)).toBe('111th');
		expect(ordinal(112)).toBe('112th');
		expect(ordinal(121)).toBe('121st');
		expect(ordinal(300)).toBe('300th');
	});
});
