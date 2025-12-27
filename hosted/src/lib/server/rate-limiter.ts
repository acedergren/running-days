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
 */

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
 * Check if a request is rate limited
 *
 * @param identifier - Usually IP address
 * @param endpoint - The endpoint being accessed
 * @param config - Rate limit configuration (uses defaults if not provided)
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
	identifier: string,
	endpoint: string,
	config?: RateLimitConfig
): { isLimited: boolean; remaining: number; resetIn: number } {
	const limitConfig = config || AUTH_RATE_LIMITS[endpoint];

	if (!limitConfig) {
		// No rate limit configured for this endpoint
		return { isLimited: false, remaining: Infinity, resetIn: 0 };
	}

	const key = `${identifier}:${endpoint}`;
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
		console.log(`[Rate Limiter] Cleaned up ${cleaned} expired entries`);
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
