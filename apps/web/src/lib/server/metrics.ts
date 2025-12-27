import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a custom registry
export const registry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry });

// HTTP request metrics
export const httpRequestsTotal = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status'] as const,
	registers: [registry]
});

export const httpRequestDuration = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration in seconds',
	labelNames: ['method', 'route', 'status'] as const,
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
	registers: [registry]
});

// Webhook metrics
export const webhookPayloadsTotal = new Counter({
	name: 'webhook_payloads_total',
	help: 'Total number of webhook payloads received',
	labelNames: ['status'] as const,
	registers: [registry]
});

export const workoutsProcessedTotal = new Counter({
	name: 'workouts_processed_total',
	help: 'Total number of workouts processed',
	labelNames: ['type'] as const,
	registers: [registry]
});

// Database metrics
export const dbQueryDuration = new Histogram({
	name: 'db_query_duration_seconds',
	help: 'Database query duration in seconds',
	labelNames: ['operation', 'table'] as const,
	buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
	registers: [registry]
});

// Business metrics
export const runningDaysCount = new Gauge({
	name: 'running_days_count',
	help: 'Current number of running days for the year',
	labelNames: ['year'] as const,
	registers: [registry]
});

export const goalTargetDays = new Gauge({
	name: 'goal_target_days',
	help: 'Target number of running days for the year',
	labelNames: ['year'] as const,
	registers: [registry]
});

// PHI access metrics (for HIPAA monitoring)
export const phiAccessTotal = new Counter({
	name: 'phi_access_total',
	help: 'Total number of PHI access events',
	labelNames: ['action', 'outcome'] as const,
	registers: [registry]
});

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
	method: string,
	route: string,
	status: number,
	durationMs: number
) {
	const labels = { method, route, status: String(status) };
	httpRequestsTotal.inc(labels);
	httpRequestDuration.observe(labels, durationMs / 1000);
}

/**
 * Record database query metrics
 */
export function recordDbQuery(operation: string, table: string, durationMs: number) {
	dbQueryDuration.observe({ operation, table }, durationMs / 1000);
}

/**
 * Update running days gauge
 */
export function updateRunningDaysCount(year: number, count: number) {
	runningDaysCount.set({ year: String(year) }, count);
}

/**
 * Record PHI access for HIPAA compliance
 */
export function recordPhiAccess(action: string, outcome: 'success' | 'denied' | 'error') {
	phiAccessTotal.inc({ action, outcome });
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
	return registry.metrics();
}

/**
 * Get content type for Prometheus
 */
export function getContentType(): string {
	return registry.contentType;
}
