import { describe, it, expect } from 'vitest';
import {
	isRunningWorkout,
	filterRunningWorkouts,
	generateWorkoutId,
	calculatePaceSecondsPerKm,
	extractDateFromISO,
	extractYearFromISO,
	processWorkout,
	aggregateDailyStats,
	mergeDailyStats,
	type HealthExportWorkout,
	type ProcessedWorkout,
	type DailyStatsUpdate
} from './workout-processor';

describe('isRunningWorkout', () => {
	it('should identify running workouts', () => {
		expect(isRunningWorkout('Running')).toBe(true);
		expect(isRunningWorkout('Outdoor Running')).toBe(true);
		expect(isRunningWorkout('Indoor Run')).toBe(true);
		expect(isRunningWorkout('RUNNING')).toBe(true);
	});

	it('should reject non-running workouts', () => {
		expect(isRunningWorkout('Walking')).toBe(false);
		expect(isRunningWorkout('Cycling')).toBe(false);
		expect(isRunningWorkout('Swimming')).toBe(false);
		expect(isRunningWorkout('Yoga')).toBe(false);
	});
});

describe('filterRunningWorkouts', () => {
	const mixedWorkouts: HealthExportWorkout[] = [
		{ name: 'Running', start: '2024-01-01T08:00:00Z', end: '2024-01-01T08:30:00Z', duration: 1800 },
		{ name: 'Walking', start: '2024-01-01T09:00:00Z', end: '2024-01-01T09:30:00Z', duration: 1800 },
		{
			name: 'Outdoor Run',
			start: '2024-01-02T08:00:00Z',
			end: '2024-01-02T08:45:00Z',
			duration: 2700
		}
	];

	it('should filter to only running workouts', () => {
		const result = filterRunningWorkouts(mixedWorkouts);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('Running');
		expect(result[1].name).toBe('Outdoor Run');
	});

	it('should return empty array if no running workouts', () => {
		const noRuns: HealthExportWorkout[] = [
			{
				name: 'Cycling',
				start: '2024-01-01T08:00:00Z',
				end: '2024-01-01T09:00:00Z',
				duration: 3600
			}
		];
		expect(filterRunningWorkouts(noRuns)).toHaveLength(0);
	});
});

describe('generateWorkoutId', () => {
	it('should use existing ID if provided', () => {
		const workout: HealthExportWorkout = {
			id: 'existing-id-123',
			name: 'Running',
			start: '2024-01-01T08:00:00Z',
			end: '2024-01-01T08:30:00Z',
			duration: 1800
		};
		expect(generateWorkoutId(workout)).toBe('existing-id-123');
	});

	it('should generate ID from start time and duration if not provided', () => {
		const workout: HealthExportWorkout = {
			name: 'Running',
			start: '2024-01-01T08:00:00Z',
			end: '2024-01-01T08:30:00Z',
			duration: 1800
		};
		expect(generateWorkoutId(workout)).toBe('2024-01-01T08:00:00Z-1800');
	});
});

describe('calculatePaceSecondsPerKm', () => {
	it('should return null for zero distance', () => {
		expect(calculatePaceSecondsPerKm(1800, 0)).toBeNull();
	});

	it('should return null for negative distance', () => {
		expect(calculatePaceSecondsPerKm(1800, -5000)).toBeNull();
	});

	it('should calculate pace correctly', () => {
		// 30 minutes for 5km = 360 seconds/km = 6:00/km
		expect(calculatePaceSecondsPerKm(1800, 5000)).toBe(360);

		// 45 minutes for 10km = 270 seconds/km = 4:30/km
		expect(calculatePaceSecondsPerKm(2700, 10000)).toBe(270);
	});
});

describe('extractDateFromISO', () => {
	it('should extract date in YYYY-MM-DD format', () => {
		expect(extractDateFromISO('2024-01-15T08:30:00Z')).toBe('2024-01-15');
		expect(extractDateFromISO('2024-12-31T23:59:59Z')).toBe('2024-12-31');
	});

	it('should handle timezone-naive dates', () => {
		const result = extractDateFromISO('2024-06-15T12:00:00');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe('extractYearFromISO', () => {
	it('should extract year correctly', () => {
		expect(extractYearFromISO('2024-01-15T08:30:00Z')).toBe(2024);
		expect(extractYearFromISO('2025-12-31T23:59:59Z')).toBe(2025);
	});
});

describe('processWorkout', () => {
	const sampleWorkout: HealthExportWorkout = {
		id: 'workout-123',
		name: 'Running',
		start: '2024-01-15T08:00:00Z',
		end: '2024-01-15T08:30:00Z',
		duration: 1800,
		distance: 5000,
		activeEnergy: 350,
		avgHeartRate: 155,
		maxHeartRate: 175
	};

	it('should transform workout data correctly', () => {
		const result = processWorkout(sampleWorkout);

		expect(result.id).toBe('workout-123');
		expect(result.date).toBe('2024-01-15');
		expect(result.year).toBe(2024);
		expect(result.startTime).toBe('2024-01-15T08:00:00Z');
		expect(result.endTime).toBe('2024-01-15T08:30:00Z');
		expect(result.durationSeconds).toBe(1800);
		expect(result.distanceMeters).toBe(5000);
		expect(result.energyBurnedKcal).toBe(350);
		expect(result.avgHeartRate).toBe(155);
		expect(result.maxHeartRate).toBe(175);
		expect(result.avgPaceSecondsPerKm).toBe(360); // 6:00/km
	});

	it('should handle missing optional fields', () => {
		const minimalWorkout: HealthExportWorkout = {
			name: 'Running',
			start: '2024-01-15T08:00:00Z',
			end: '2024-01-15T08:30:00Z',
			duration: 1800
		};

		const result = processWorkout(minimalWorkout);

		expect(result.distanceMeters).toBe(0);
		expect(result.energyBurnedKcal).toBeNull();
		expect(result.avgHeartRate).toBeNull();
		expect(result.maxHeartRate).toBeNull();
		expect(result.avgPaceSecondsPerKm).toBeNull();
	});

	it('should round duration to whole seconds', () => {
		const workout: HealthExportWorkout = {
			name: 'Running',
			start: '2024-01-15T08:00:00Z',
			end: '2024-01-15T08:30:00Z',
			duration: 1800.7
		};

		const result = processWorkout(workout);
		expect(result.durationSeconds).toBe(1801);
	});

	it('should store raw payload as JSON', () => {
		const result = processWorkout(sampleWorkout);
		const parsed = JSON.parse(result.rawPayload);
		expect(parsed.id).toBe('workout-123');
		expect(parsed.distance).toBe(5000);
	});
});

describe('aggregateDailyStats', () => {
	it('should return null for empty array', () => {
		expect(aggregateDailyStats([])).toBeNull();
	});

	it('should aggregate single workout correctly', () => {
		const workouts: ProcessedWorkout[] = [
			{
				id: 'w1',
				date: '2024-01-15',
				year: 2024,
				startTime: '2024-01-15T08:00:00Z',
				endTime: '2024-01-15T08:30:00Z',
				durationSeconds: 1800,
				distanceMeters: 5000,
				energyBurnedKcal: 350,
				avgHeartRate: 155,
				maxHeartRate: 175,
				avgPaceSecondsPerKm: 360,
				rawPayload: '{}'
			}
		];

		const result = aggregateDailyStats(workouts);

		expect(result).not.toBeNull();
		expect(result!.date).toBe('2024-01-15');
		expect(result!.year).toBe(2024);
		expect(result!.runCount).toBe(1);
		expect(result!.totalDistanceMeters).toBe(5000);
		expect(result!.totalDurationSeconds).toBe(1800);
		expect(result!.avgPaceSecondsPerKm).toBe(360);
		expect(result!.longestRunMeters).toBe(5000);
		expect(result!.fastestPaceSecondsPerKm).toBe(360);
	});

	it('should aggregate multiple workouts correctly', () => {
		const workouts: ProcessedWorkout[] = [
			{
				id: 'w1',
				date: '2024-01-15',
				year: 2024,
				startTime: '2024-01-15T08:00:00Z',
				endTime: '2024-01-15T08:30:00Z',
				durationSeconds: 1800,
				distanceMeters: 5000,
				energyBurnedKcal: null,
				avgHeartRate: null,
				maxHeartRate: null,
				avgPaceSecondsPerKm: 360, // 6:00/km
				rawPayload: '{}'
			},
			{
				id: 'w2',
				date: '2024-01-15',
				year: 2024,
				startTime: '2024-01-15T18:00:00Z',
				endTime: '2024-01-15T18:45:00Z',
				durationSeconds: 2700,
				distanceMeters: 8000,
				energyBurnedKcal: null,
				avgHeartRate: null,
				maxHeartRate: null,
				avgPaceSecondsPerKm: 337.5, // 5:37.5/km (faster)
				rawPayload: '{}'
			}
		];

		const result = aggregateDailyStats(workouts);

		expect(result!.runCount).toBe(2);
		expect(result!.totalDistanceMeters).toBe(13000);
		expect(result!.totalDurationSeconds).toBe(4500);
		expect(result!.longestRunMeters).toBe(8000);
		expect(result!.fastestPaceSecondsPerKm).toBe(337.5);
		// Overall pace: 4500s / 13km = ~346 sec/km
		expect(result!.avgPaceSecondsPerKm).toBeCloseTo(346.15, 1);
	});
});

describe('mergeDailyStats', () => {
	const existingStats: DailyStatsUpdate = {
		date: '2024-01-15',
		year: 2024,
		runCount: 1,
		totalDistanceMeters: 5000,
		totalDurationSeconds: 1800,
		avgPaceSecondsPerKm: 360,
		longestRunMeters: 5000,
		fastestPaceSecondsPerKm: 360
	};

	it('should merge new workout into existing stats', () => {
		const newWorkout: ProcessedWorkout = {
			id: 'w2',
			date: '2024-01-15',
			year: 2024,
			startTime: '2024-01-15T18:00:00Z',
			endTime: '2024-01-15T18:45:00Z',
			durationSeconds: 2700,
			distanceMeters: 8000,
			energyBurnedKcal: null,
			avgHeartRate: null,
			maxHeartRate: null,
			avgPaceSecondsPerKm: 337.5,
			rawPayload: '{}'
		};

		const result = mergeDailyStats(existingStats, newWorkout);

		expect(result.runCount).toBe(2);
		expect(result.totalDistanceMeters).toBe(13000);
		expect(result.totalDurationSeconds).toBe(4500);
		expect(result.longestRunMeters).toBe(8000);
		expect(result.fastestPaceSecondsPerKm).toBe(337.5);
	});

	it('should keep existing fastest pace if new pace is slower', () => {
		const slowerWorkout: ProcessedWorkout = {
			id: 'w3',
			date: '2024-01-15',
			year: 2024,
			startTime: '2024-01-15T20:00:00Z',
			endTime: '2024-01-15T20:35:00Z',
			durationSeconds: 2100,
			distanceMeters: 3000,
			energyBurnedKcal: null,
			avgHeartRate: null,
			maxHeartRate: null,
			avgPaceSecondsPerKm: 420, // 7:00/km (slower than existing 6:00)
			rawPayload: '{}'
		};

		const result = mergeDailyStats(existingStats, slowerWorkout);

		expect(result.fastestPaceSecondsPerKm).toBe(360); // keeps original
	});

	it('should handle workout with no pace', () => {
		const noPaceWorkout: ProcessedWorkout = {
			id: 'w4',
			date: '2024-01-15',
			year: 2024,
			startTime: '2024-01-15T20:00:00Z',
			endTime: '2024-01-15T20:35:00Z',
			durationSeconds: 2100,
			distanceMeters: 0,
			energyBurnedKcal: null,
			avgHeartRate: null,
			maxHeartRate: null,
			avgPaceSecondsPerKm: null,
			rawPayload: '{}'
		};

		const result = mergeDailyStats(existingStats, noPaceWorkout);

		expect(result.fastestPaceSecondsPerKm).toBe(360);
		expect(result.totalDurationSeconds).toBe(3900);
	});

	it('should update fastest pace if existing was null', () => {
		const statsWithoutPace: DailyStatsUpdate = {
			...existingStats,
			fastestPaceSecondsPerKm: null
		};

		const newWorkout: ProcessedWorkout = {
			id: 'w2',
			date: '2024-01-15',
			year: 2024,
			startTime: '2024-01-15T18:00:00Z',
			endTime: '2024-01-15T18:45:00Z',
			durationSeconds: 2700,
			distanceMeters: 8000,
			energyBurnedKcal: null,
			avgHeartRate: null,
			maxHeartRate: null,
			avgPaceSecondsPerKm: 337.5,
			rawPayload: '{}'
		};

		const result = mergeDailyStats(statsWithoutPace, newWorkout);

		expect(result.fastestPaceSecondsPerKm).toBe(337.5);
	});
});
