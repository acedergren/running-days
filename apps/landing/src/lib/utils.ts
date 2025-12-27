import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Type helper for element refs in Svelte 5
 */
export type WithElementRef<T> = T & {
	ref?: HTMLElement | null;
};
