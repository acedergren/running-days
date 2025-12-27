import type { Handle } from '@sveltejs/kit';
import { recordHttpRequest } from '$lib/server/metrics';
import { appLogger } from '$lib/server/logger';
import { logApiAccess } from '$lib/server/audit-logger';
import { building } from '$app/environment';

// Generate unique request ID
function generateRequestId(): string {
	return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Routes that access PHI (Protected Health Information)
const PHI_ROUTES = [
	'/dashboard',
	'/insights',
	'/api/webhook',
	'/api/workouts',
	'/api/stats'
];

export const handle: Handle = async ({ event, resolve }) => {
	// Skip during static prerendering
	if (building) {
		return resolve(event);
	}

	const startTime = performance.now();
	const requestId = generateRequestId();

	// Add request ID to locals for logging
	event.locals.requestId = requestId;

	// Log incoming request
	appLogger.request({
		method: event.request.method,
		url: event.url.pathname,
		id: requestId
	});

	// Resolve the request
	const response = await resolve(event);

	// Calculate duration
	const duration = performance.now() - startTime;

	// Get route pattern (simplified)
	const route = getRoutePattern(event.url.pathname);

	// Record metrics
	recordHttpRequest(
		event.request.method,
		route,
		response.status,
		duration
	);

	// Log response
	appLogger.response(
		{
			method: event.request.method,
			url: event.url.pathname,
			id: requestId
		},
		{ statusCode: response.status },
		duration
	);

	// Log PHI access for HIPAA compliance
	if (isPHIRoute(event.url.pathname)) {
		logApiAccess(
			event.request,
			event.locals.userId || null,
			event.url.pathname,
			response.status < 400 ? 'success' : response.status < 500 ? 'denied' : 'error',
			true // PHI accessed
		);
	}

	// Add response headers
	const headers = new Headers(response.headers);
	headers.set('X-Request-Id', requestId);
	headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};

/**
 * Simplify URL path to route pattern for metrics
 */
function getRoutePattern(pathname: string): string {
	// Replace UUIDs and numeric IDs with placeholders
	return pathname
		.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
		.replace(/\/\d+/g, '/:id')
		.replace(/\/[0-9a-f]{24}/gi, '/:id'); // MongoDB-style IDs
}

/**
 * Check if route accesses PHI
 */
function isPHIRoute(pathname: string): boolean {
	return PHI_ROUTES.some(route => pathname.startsWith(route));
}

// Extend App.Locals type
declare global {
	namespace App {
		interface Locals {
			requestId: string;
			userId?: string;
		}
	}
}
