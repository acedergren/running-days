import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format distance in kilometers
 */
export function formatDistance(meters: number): string {
	const km = meters / 1000;
	return km < 10 ? km.toFixed(2) : km.toFixed(1);
}

/**
 * Format duration from seconds to HH:MM:SS or MM:SS
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
 */
export function formatPace(metersPerSecond: number): string {
	if (metersPerSecond <= 0) return '--:--';
	const secondsPerKm = 1000 / metersPerSecond;
	const minutes = Math.floor(secondsPerKm / 60);
	const seconds = Math.floor(secondsPerKm % 60);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calculate pace from distance (meters) and duration (seconds)
 */
export function calculatePace(distanceMeters: number, durationSeconds: number): number {
	if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
	return distanceMeters / durationSeconds; // m/s
}

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Type helper for element refs in Svelte 5
 */
export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
};
