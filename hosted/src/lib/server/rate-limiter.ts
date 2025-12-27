/**
 * In-Memory Rate Limiter
 *
 * Simple sliding window rate limiter for authentication endpoints.
 * Uses in-memory storage - suitable for single-instance deployments.
 * For multi-instance deployments, use Redis or database-backed rate limiting.
 *
 * Security features:
 * - IP-based rate limiting for auth endpoints
 * - Configurable limits per endpoint
 * - Automatic cleanup of expired entries
 * - IP address validation to prevent bypass attacks
 */

import { logger } from './logger.js';

// IPv4 and IPv6 validation patterns
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IPV6_REGEX = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::(?:[a-fA-F0-9]{1,4}:){0,6}[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,7}:$|^(?:[a-fA-F0-9]{1,4}:){1,6}:[a-fA-F0-9]{1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,5}(?::[a-fA-F0-9]{1,4}){1,2}$|^(?:[a-fA-F0-9]{1,4}:){1,4}(?::[a-fA-F0-9]{1,4}){1,3}$|^(?:[a-fA-F0-9]{1,4}:){1,3}(?::[a-fA-F0-9]{1,4}){1,4}$|^(?:[a-fA-F0-9]{1,4}:){1,2}(?::[a-fA-F0-9]{1,4}){1,5}$|^[a-fA-F0-9]{1,4}:(?::[a-fA-F0-9]{1,4}){1,6}$/;

/**
 * Validate and normalize an IP address
 * Returns the IP if valid, or a safe fallback for invalid IPs
 */
export function validateIpAddress(ip: string | undefined | null): string {
	if (!ip || typeof ip !== 'string') {
		return 'unknown';
	}

	// Trim and limit length to prevent DoS via huge strings
	const trimmed = ip.trim().slice(0, 45); // Max IPv6 length

	// Check for valid IPv4 or IPv6
	if (IPV4_REGEX.test(trimmed) || IPV6_REGEX.test(trimmed)) {
		return trimmed;
	}

	// Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
	if (trimmed.startsWith('::ffff:')) {
		const ipv4Part = trimmed.slice(7);
		if (IPV4_REGEX.test(ipv4Part)) {
			return trimmed;
		}
	}

	// Invalid IP - return sanitized version for logging/storage
	// Only keep alphanumeric, dots, colons (prevents injection)
	const sanitized = trimmed.replace(/[^a-fA-F0-9.:]/g, '').slice(0, 45);
	logger.warn({ originalIp: trimmed.slice(0, 50) }, 'Invalid IP address received');
	return sanitized || 'invalid';
}

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

// In-memory store for rate limit entries
// Key format: `${identifier}:${endpoint}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Maximum store size to prevent memory exhaustion attacks
const MAX_STORE_SIZE = 100000;

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Default rate limits for authentication endpoints
 */
export const AUTH_RATE_LIMITS: Record<string, RateLimitConfig> = {
	// Apple Sign-In initiation - generous limit
	'/auth/apple': {
		maxRequests: 10,
		windowMs: 60 * 1000 // 10 requests per minute
	},
	// Apple callback - stricter limit (code exchange is sensitive)
	'/auth/apple/callback': {
		maxRequests: 5,
		windowMs: 60 * 1000 // 5 requests per minute
	},
	// Logout - moderate limit
	'/auth/logout': {
		maxRequests: 10,
		windowMs: 60 * 1000 // 10 requests per minute
	}
};

/**
 * Rate limits for sync API endpoints
 */
export const SYNC_RATE_LIMITS: Record<string, RateLimitConfig> = {
	// Sync endpoint - moderate limit (batch operations)
	'/api/v1/workouts/sync': {
		maxRequests: 60,
		windowMs: 60 * 1000 // 60 requests per minute
	},
	// List workouts - generous limit (read-only)
	'/api/v1/workouts': {
		maxRequests: 100,
		windowMs: 60 * 1000 // 100 requests per minute
	},
	// Single workout operations - generous limit
	'/api/v1/workouts/:id': {
		maxRequests: 100,
		windowMs: 60 * 1000 // 100 requests per minute
	},
	// Sync status - very generous (lightweight)
	'/api/v1/sync/status': {
		maxRequests: 120,
		windowMs: 60 * 1000 // 120 requests per minute
	}
};

/**
 * Combined rate limits for all endpoints
 */
export const ALL_RATE_LIMITS: Record<string, RateLimitConfig> = {
	...AUTH_RATE_LIMITS,
	...SYNC_RATE_LIMITS
};

/**
 * Check if a request is rate limited
 *
 * @param identifier - Usually IP address (will be validated)
 * @param endpoint - The endpoint being accessed
 * @param config - Rate limit configuration (uses defaults if not provided)
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
	identifier: string,
	endpoint: string,
	config?: RateLimitConfig
): { isLimited: boolean; remaining: number; resetIn: number } {
	const limitConfig = config || ALL_RATE_LIMITS[endpoint];

	if (!limitConfig) {
		// No rate limit configured for this endpoint
		return { isLimited: false, remaining: Infinity, resetIn: 0 };
	}

	// Validate IP to prevent bypass attacks with malformed identifiers
	const validatedId = validateIpAddress(identifier);
	const key = `${validatedId}:${endpoint}`;
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	// Check if we have an existing entry that's still valid
	if (entry && entry.resetAt > now) {
		if (entry.count >= limitConfig.maxRequests) {
			return {
				isLimited: true,
				remaining: 0,
				resetIn: Math.ceil((entry.resetAt - now) / 1000)
			};
		}

		// Increment count
		entry.count++;
		return {
			isLimited: false,
			remaining: limitConfig.maxRequests - entry.count,
			resetIn: Math.ceil((entry.resetAt - now) / 1000)
		};
	}

	// Check if store is at capacity (prevent memory exhaustion)
	if (rateLimitStore.size >= MAX_STORE_SIZE) {
		// Store is full - rate limit this request to protect the server
		// This is a defense against distributed attacks trying to exhaust memory
		return {
			isLimited: true,
			remaining: 0,
			resetIn: 60 // Default 1 minute wait
		};
	}

	// Create new entry
	rateLimitStore.set(key, {
		count: 1,
		resetAt: now + limitConfig.windowMs
	});

	return {
		isLimited: false,
		remaining: limitConfig.maxRequests - 1,
		resetIn: Math.ceil(limitConfig.windowMs / 1000)
	};
}

/**
 * Apply rate limiting to a request
 * Returns an error response if rate limited, null otherwise
 *
 * @param identifier - Usually IP address
 * @param endpoint - The endpoint being accessed
 * @returns Error response if rate limited, null otherwise
 */
export function applyRateLimit(
	identifier: string,
	endpoint: string
): Response | null {
	const result = checkRateLimit(identifier, endpoint);

	if (result.isLimited) {
		return new Response(
			JSON.stringify({
				error: 'Too many requests',
				retryAfter: result.resetIn
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': result.resetIn.toString(),
					'X-RateLimit-Remaining': '0',
					'X-RateLimit-Reset': result.resetIn.toString()
				}
			}
		);
	}

	return null;
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
	const now = Date.now();
	let cleaned = 0;

	rateLimitStore.forEach((entry, key) => {
		if (entry.resetAt <= now) {
			rateLimitStore.delete(key);
			cleaned++;
		}
	});

	if (cleaned > 0) {
		logger.debug({ cleaned }, 'Rate limiter cleanup completed');
	}
}

/**
 * Start periodic cleanup of expired entries
 */
export function startCleanupInterval(): void {
	if (cleanupInterval) return;
	cleanupInterval = setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
}

/**
 * Stop periodic cleanup (for testing or shutdown)
 */
export function stopCleanupInterval(): void {
	if (cleanupInterval) {
		clearInterval(cleanupInterval);
		cleanupInterval = null;
	}
}

/**
 * Clear all rate limit entries (for testing)
 */
export function clearRateLimitStore(): void {
	rateLimitStore.clear();
}

/**
 * Get current store size (for monitoring)
 */
export function getRateLimitStoreSize(): number {
	return rateLimitStore.size;
}

// Start cleanup on module load
startCleanupInterval();
