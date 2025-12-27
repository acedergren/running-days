/**
 * Pure business logic for processing workout data from Health Auto Export
 * Extracted for testability and reuse across services
 */

import type {
  HealthExportWorkout,
  ProcessedWorkout,
  DailyStatUpdate
} from '@running-days/types';

/**
 * Check if a workout name indicates a running workout
 */
export function isRunningWorkout(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('running') || lower.includes('run');
}

/**
 * Filter array to only running workouts
 */
export function filterRunningWorkouts(workouts: HealthExportWorkout[]): HealthExportWorkout[] {
  return workouts.filter((w) => isRunningWorkout(w.name));
}

/**
 * Generate a deterministic ID for a workout if none provided
 */
export function generateWorkoutId(workout: HealthExportWorkout): string {
  return workout.id ?? `${workout.start}-${workout.duration}`;
}

/**
 * Calculate pace in seconds per kilometer
 * Returns null if distance is zero or invalid
 */
export function calculatePaceSecondsPerKm(
  durationSeconds: number,
  distanceMeters: number
): number | null {
  if (!distanceMeters || distanceMeters <= 0) return null;
  return durationSeconds / (distanceMeters / 1000);
}

/**
 * Extract date string (YYYY-MM-DD) from ISO datetime
 */
export function extractDateFromISO(isoDatetime: string): string {
  return new Date(isoDatetime).toISOString().split('T')[0];
}

/**
 * Extract year from ISO datetime
 */
export function extractYearFromISO(isoDatetime: string): number {
  return new Date(isoDatetime).getFullYear();
}

/**
 * Transform raw Health Export workout into processed format
 */
export function processWorkout(workout: HealthExportWorkout): ProcessedWorkout {
  const startDate = new Date(workout.start);
  const dateStr = startDate.toISOString().split('T')[0];
  const year = startDate.getFullYear();
  const avgPaceSecondsPerKm = calculatePaceSecondsPerKm(workout.duration, workout.distance ?? 0);

  return {
    id: generateWorkoutId(workout),
    date: dateStr,
    year,
    startTime: workout.start,
    endTime: workout.end,
    durationSeconds: Math.round(workout.duration),
    distanceMeters: workout.distance ?? 0,
    energyBurnedKcal: workout.activeEnergy ?? null,
    avgHeartRate: workout.avgHeartRate ?? null,
    maxHeartRate: workout.maxHeartRate ?? null,
    avgPaceSecondsPerKm,
    elevationGainMeters: workout.elevationAscended ?? null,
    weatherTemp: workout.temperature ?? null,
    weatherCondition: workout.weather ?? null,
    source: 'health_auto_export',
    rawPayload: JSON.stringify(workout)
  };
}

/**
 * Calculate aggregated daily stats from a list of workouts for the same day
 */
export function aggregateDailyStats(workouts: ProcessedWorkout[]): DailyStatUpdate | null {
  if (workouts.length === 0) return null;

  const firstWorkout = workouts[0];
  const totalDistance = workouts.reduce((sum, w) => sum + w.distanceMeters, 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.durationSeconds, 0);
  const longestRun = Math.max(...workouts.map((w) => w.distanceMeters));

  // Calculate overall average pace
  const avgPace = totalDistance > 0 ? totalDuration / (totalDistance / 1000) : null;

  // Find fastest pace (lowest seconds per km)
  const paces = workouts.map((w) => w.avgPaceSecondsPerKm).filter((p): p is number => p !== null);
  const fastestPace = paces.length > 0 ? Math.min(...paces) : null;

  return {
    date: firstWorkout.date,
    year: firstWorkout.year,
    runCount: workouts.length,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
    avgPaceSecondsPerKm: avgPace,
    longestRunMeters: longestRun,
    fastestPaceSecondsPerKm: fastestPace
  };
}

/**
 * Merge new workout into existing daily stats
 */
export function mergeDailyStats(
  existing: DailyStatUpdate,
  newWorkout: ProcessedWorkout
): DailyStatUpdate {
  const newTotalDistance = existing.totalDistanceMeters + newWorkout.distanceMeters;
  const newTotalDuration = existing.totalDurationSeconds + newWorkout.durationSeconds;
  const newAvgPace = newTotalDistance > 0 ? newTotalDuration / (newTotalDistance / 1000) : null;

  // Find fastest pace
  let fastestPace = existing.fastestPaceSecondsPerKm;
  if (newWorkout.avgPaceSecondsPerKm !== null) {
    if (fastestPace === null || newWorkout.avgPaceSecondsPerKm < fastestPace) {
      fastestPace = newWorkout.avgPaceSecondsPerKm;
    }
  }

  return {
    date: existing.date,
    year: existing.year,
    runCount: existing.runCount + 1,
    totalDistanceMeters: newTotalDistance,
    totalDurationSeconds: newTotalDuration,
    avgPaceSecondsPerKm: newAvgPace,
    longestRunMeters: Math.max(existing.longestRunMeters ?? 0, newWorkout.distanceMeters),
    fastestPaceSecondsPerKm: fastestPace
  };
}
