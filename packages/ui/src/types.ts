/**
 * Type helper for element refs in Svelte 5
 */
export type WithElementRef<T> = T & {
  ref?: HTMLElement | null;
};
