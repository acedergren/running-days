/**
 * Health Auto Export webhook payload types
 * Matches the format sent by the iOS app
 */

export interface HealthExportWorkout {
  id?: string;
  name: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  duration: number; // seconds
  distance?: number; // meters
  activeEnergy?: number; // kcal
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationAscended?: number; // meters
  temperature?: number; // Celsius
  humidity?: number;
  weather?: string;
}

export interface HealthExportPayload {
  data: {
    workouts?: HealthExportWorkout[];
  };
}

export interface ProcessedWorkout {
  id: string;
  date: string; // YYYY-MM-DD
  year: number;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  distanceMeters: number;
  energyBurnedKcal: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPaceSecondsPerKm: number | null;
  elevationGainMeters: number | null;
  weatherTemp: number | null;
  weatherCondition: string | null;
  source: string;
  rawPayload: string;
}
