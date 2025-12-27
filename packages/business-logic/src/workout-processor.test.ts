import { describe, it, expect } from 'vitest';
import type { HealthExportWorkout, ProcessedWorkout } from '@running-days/types';
import {
  isRunningWorkout,
  filterRunningWorkouts,
  generateWorkoutId,
  calculatePaceSecondsPerKm,
  extractDateFromISO,
  extractYearFromISO,
  processWorkout,
  aggregateDailyStats,
  mergeDailyStats
} from './workout-processor';

describe('isRunningWorkout', () => {
  it('should identify running workouts', () => {
    expect(isRunningWorkout('Running')).toBe(true);
    expect(isRunningWorkout('Outdoor Run')).toBe(true);
    expect(isRunningWorkout('Indoor Running')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isRunningWorkout('RUNNING')).toBe(true);
    expect(isRunningWorkout('running')).toBe(true);
    expect(isRunningWorkout('RuNnInG')).toBe(true);
  });

  it('should reject non-running workouts', () => {
    expect(isRunningWorkout('Walking')).toBe(false);
    expect(isRunningWorkout('Cycling')).toBe(false);
    expect(isRunningWorkout('Swimming')).toBe(false);
    expect(isRunningWorkout('Yoga')).toBe(false);
  });
});

describe('filterRunningWorkouts', () => {
  const workouts: HealthExportWorkout[] = [
    { name: 'Running', start: '2024-01-01T08:00:00Z', end: '2024-01-01T08:30:00Z', duration: 1800 },
    { name: 'Walking', start: '2024-01-01T12:00:00Z', end: '2024-01-01T12:30:00Z', duration: 1800 },
    { name: 'Outdoor Run', start: '2024-01-02T08:00:00Z', end: '2024-01-02T08:45:00Z', duration: 2700 },
    { name: 'Cycling', start: '2024-01-02T18:00:00Z', end: '2024-01-02T19:00:00Z', duration: 3600 }
  ];

  it('should filter to only running workouts', () => {
    const result = filterRunningWorkouts(workouts);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Running');
    expect(result[1].name).toBe('Outdoor Run');
  });

  it('should return empty array when no running workouts', () => {
    const nonRunning = workouts.filter(w => !isRunningWorkout(w.name));
    expect(filterRunningWorkouts(nonRunning)).toHaveLength(0);
  });
});

describe('generateWorkoutId', () => {
  it('should use provided id if available', () => {
    const workout: HealthExportWorkout = {
      id: 'existing-id-123',
      name: 'Running',
      start: '2024-01-01T08:00:00Z',
      end: '2024-01-01T08:30:00Z',
      duration: 1800
    };
    expect(generateWorkoutId(workout)).toBe('existing-id-123');
  });

  it('should generate id from start and duration if no id', () => {
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
  it('should calculate pace correctly', () => {
    // 30 minutes (1800s) for 5km = 360 seconds per km
    expect(calculatePaceSecondsPerKm(1800, 5000)).toBe(360);

    // 60 minutes (3600s) for 10km = 360 seconds per km
    expect(calculatePaceSecondsPerKm(3600, 10000)).toBe(360);

    // 25 minutes (1500s) for 5km = 300 seconds per km (5:00/km)
    expect(calculatePaceSecondsPerKm(1500, 5000)).toBe(300);
  });

  it('should return null for zero distance', () => {
    expect(calculatePaceSecondsPerKm(1800, 0)).toBeNull();
  });

  it('should return null for negative distance', () => {
    expect(calculatePaceSecondsPerKm(1800, -100)).toBeNull();
  });
});

describe('extractDateFromISO', () => {
  it('should extract date string from ISO datetime', () => {
    expect(extractDateFromISO('2024-01-15T08:30:00Z')).toBe('2024-01-15');
    expect(extractDateFromISO('2024-12-31T23:59:59Z')).toBe('2024-12-31');
  });
});

describe('extractYearFromISO', () => {
  it('should extract year from ISO datetime', () => {
    expect(extractYearFromISO('2024-01-15T08:30:00Z')).toBe(2024);
    expect(extractYearFromISO('2025-06-15T12:00:00Z')).toBe(2025);
  });
});

describe('processWorkout', () => {
  it('should transform Health Export workout to processed format', () => {
    const input: HealthExportWorkout = {
      id: 'workout-123',
      name: 'Running',
      start: '2024-06-15T08:00:00Z',
      end: '2024-06-15T08:30:00Z',
      duration: 1800,
      distance: 5000,
      activeEnergy: 350,
      avgHeartRate: 155,
      maxHeartRate: 175,
      elevationAscended: 50,
      temperature: 22,
      weather: 'Sunny'
    };

    const result = processWorkout(input);

    expect(result.id).toBe('workout-123');
    expect(result.date).toBe('2024-06-15');
    expect(result.year).toBe(2024);
    expect(result.durationSeconds).toBe(1800);
    expect(result.distanceMeters).toBe(5000);
    expect(result.energyBurnedKcal).toBe(350);
    expect(result.avgHeartRate).toBe(155);
    expect(result.maxHeartRate).toBe(175);
    expect(result.avgPaceSecondsPerKm).toBe(360);
    expect(result.elevationGainMeters).toBe(50);
    expect(result.weatherTemp).toBe(22);
    expect(result.weatherCondition).toBe('Sunny');
    expect(result.source).toBe('health_auto_export');
  });

  it('should handle missing optional fields', () => {
    const input: HealthExportWorkout = {
      name: 'Running',
      start: '2024-06-15T08:00:00Z',
      end: '2024-06-15T08:30:00Z',
      duration: 1800
    };

    const result = processWorkout(input);

    expect(result.distanceMeters).toBe(0);
    expect(result.energyBurnedKcal).toBeNull();
    expect(result.avgHeartRate).toBeNull();
    expect(result.avgPaceSecondsPerKm).toBeNull();
  });
});

describe('aggregateDailyStats', () => {
  it('should return null for empty array', () => {
    expect(aggregateDailyStats([])).toBeNull();
  });

  it('should aggregate single workout correctly', () => {
    const workouts: ProcessedWorkout[] = [
      {
        id: '1',
        date: '2024-06-15',
        year: 2024,
        startTime: '2024-06-15T08:00:00Z',
        endTime: '2024-06-15T08:30:00Z',
        durationSeconds: 1800,
        distanceMeters: 5000,
        avgPaceSecondsPerKm: 360,
        energyBurnedKcal: 350,
        avgHeartRate: 155,
        maxHeartRate: 175,
        elevationGainMeters: 50,
        weatherTemp: 22,
        weatherCondition: 'Sunny',
        source: 'health_auto_export',
        rawPayload: '{}'
      }
    ];

    const result = aggregateDailyStats(workouts)!;

    expect(result.date).toBe('2024-06-15');
    expect(result.year).toBe(2024);
    expect(result.runCount).toBe(1);
    expect(result.totalDistanceMeters).toBe(5000);
    expect(result.totalDurationSeconds).toBe(1800);
    expect(result.longestRunMeters).toBe(5000);
  });

  it('should aggregate multiple workouts correctly', () => {
    const workouts: ProcessedWorkout[] = [
      {
        id: '1', date: '2024-06-15', year: 2024,
        startTime: '2024-06-15T06:00:00Z', endTime: '2024-06-15T06:30:00Z',
        durationSeconds: 1800, distanceMeters: 5000, avgPaceSecondsPerKm: 360,
        energyBurnedKcal: null, avgHeartRate: null, maxHeartRate: null,
        elevationGainMeters: null, weatherTemp: null, weatherCondition: null,
        source: 'health_auto_export', rawPayload: '{}'
      },
      {
        id: '2', date: '2024-06-15', year: 2024,
        startTime: '2024-06-15T18:00:00Z', endTime: '2024-06-15T18:40:00Z',
        durationSeconds: 2400, distanceMeters: 8000, avgPaceSecondsPerKm: 300,
        energyBurnedKcal: null, avgHeartRate: null, maxHeartRate: null,
        elevationGainMeters: null, weatherTemp: null, weatherCondition: null,
        source: 'health_auto_export', rawPayload: '{}'
      }
    ];

    const result = aggregateDailyStats(workouts)!;

    expect(result.runCount).toBe(2);
    expect(result.totalDistanceMeters).toBe(13000);
    expect(result.totalDurationSeconds).toBe(4200);
    expect(result.longestRunMeters).toBe(8000);
    expect(result.fastestPaceSecondsPerKm).toBe(300);
  });
});

describe('mergeDailyStats', () => {
  it('should merge new workout into existing stats', () => {
    const existing = {
      date: '2024-06-15',
      year: 2024,
      runCount: 1,
      totalDistanceMeters: 5000,
      totalDurationSeconds: 1800,
      avgPaceSecondsPerKm: 360,
      longestRunMeters: 5000,
      fastestPaceSecondsPerKm: 360
    };

    const newWorkout: ProcessedWorkout = {
      id: '2', date: '2024-06-15', year: 2024,
      startTime: '2024-06-15T18:00:00Z', endTime: '2024-06-15T18:25:00Z',
      durationSeconds: 1500, distanceMeters: 5000, avgPaceSecondsPerKm: 300,
      energyBurnedKcal: null, avgHeartRate: null, maxHeartRate: null,
      elevationGainMeters: null, weatherTemp: null, weatherCondition: null,
      source: 'health_auto_export', rawPayload: '{}'
    };

    const result = mergeDailyStats(existing, newWorkout);

    expect(result.runCount).toBe(2);
    expect(result.totalDistanceMeters).toBe(10000);
    expect(result.totalDurationSeconds).toBe(3300);
    expect(result.fastestPaceSecondsPerKm).toBe(300); // New workout is faster
  });

  it('should keep existing fastest pace if new workout is slower', () => {
    const existing = {
      date: '2024-06-15',
      year: 2024,
      runCount: 1,
      totalDistanceMeters: 5000,
      totalDurationSeconds: 1500,
      avgPaceSecondsPerKm: 300,
      longestRunMeters: 5000,
      fastestPaceSecondsPerKm: 300
    };

    const newWorkout: ProcessedWorkout = {
      id: '2', date: '2024-06-15', year: 2024,
      startTime: '2024-06-15T18:00:00Z', endTime: '2024-06-15T18:30:00Z',
      durationSeconds: 1800, distanceMeters: 5000, avgPaceSecondsPerKm: 360,
      energyBurnedKcal: null, avgHeartRate: null, maxHeartRate: null,
      elevationGainMeters: null, weatherTemp: null, weatherCondition: null,
      source: 'health_auto_export', rawPayload: '{}'
    };

    const result = mergeDailyStats(existing, newWorkout);

    expect(result.fastestPaceSecondsPerKm).toBe(300); // Original is still fastest
  });
});
