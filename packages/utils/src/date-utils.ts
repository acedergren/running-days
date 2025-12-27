/**
 * Date utility functions
 */

/**
 * Check if a year is a leap year
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Get the number of days in a year
 */
export function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Get the day of year (1-366) for a given date
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Extract date string (YYYY-MM-DD) from ISO datetime
 */
export function extractDateFromISO(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Get year from ISO datetime or date string
 */
export function extractYearFromDate(dateString: string): number {
  return new Date(dateString).getFullYear();
}

/**
 * Check if two date strings are consecutive days
 */
export function isConsecutiveDay(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 */
export function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the start of year date string
 */
export function getYearStart(year: number): string {
  return `${year}-01-01`;
}

/**
 * Get the end of year date string
 */
export function getYearEnd(year: number): string {
  return `${year}-12-31`;
}
