/**
 * Format distance in kilometers
 * @param meters - Distance in meters
 * @returns Formatted string like "5.23" or "12.3"
 */
export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km < 10 ? km.toFixed(2) : km.toFixed(1);
}

/**
 * Format duration from seconds to HH:MM:SS or MM:SS
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1:23:45" or "23:45"
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace (min/km) from speed (m/s)
 * @param metersPerSecond - Speed in meters per second
 * @returns Formatted string like "5:30" (minutes:seconds per km)
 */
export function formatPace(metersPerSecond: number): string {
  if (metersPerSecond <= 0) return '--:--';
  const secondsPerKm = 1000 / metersPerSecond;
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format pace from seconds per kilometer
 * @param secondsPerKm - Pace in seconds per kilometer
 * @returns Formatted string like "5:30" (minutes:seconds per km)
 */
export function formatPaceFromSeconds(secondsPerKm: number | null): string {
  if (!secondsPerKm || secondsPerKm <= 0) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate pace from distance and duration
 * @param distanceMeters - Distance in meters
 * @param durationSeconds - Duration in seconds
 * @returns Speed in meters per second
 */
export function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  return distanceMeters / durationSeconds;
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 * @param n - The number
 * @returns Number with ordinal suffix
 */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Format a percentage with specified decimal places
 * @param value - Decimal value (0-1) or percentage (0-100)
 * @param decimals - Number of decimal places
 * @param isDecimal - Whether the input is a decimal (true) or percentage (false)
 */
export function formatPercent(value: number, decimals = 0, isDecimal = true): string {
  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}
