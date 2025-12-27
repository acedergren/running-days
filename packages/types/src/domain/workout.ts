/**
 * Core workout domain types
 * These are pure TypeScript types independent of the database layer
 */

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime: string; // ISO datetime
  durationSeconds: number;
  distanceMeters: number;
  energyBurnedKcal: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPaceSecondsPerKm: number | null;
  elevationGainMeters: number | null;
  weatherTemp: number | null;
  weatherCondition: string | null;
  source: string | null;
  rawPayload: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewWorkout {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  energyBurnedKcal?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  avgPaceSecondsPerKm?: number | null;
  elevationGainMeters?: number | null;
  weatherTemp?: number | null;
  weatherCondition?: string | null;
  source?: string | null;
  rawPayload?: string | null;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD (primary key)
  year: number;
  runCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  avgPaceSecondsPerKm: number | null;
  longestRunMeters: number | null;
  fastestPaceSecondsPerKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyStatUpdate {
  date: string;
  year: number;
  runCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  avgPaceSecondsPerKm: number | null;
  longestRunMeters: number | null;
  fastestPaceSecondsPerKm: number | null;
}
