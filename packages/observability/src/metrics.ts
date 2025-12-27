/**
 * Prometheus metrics collection
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

/**
 * Create a metrics registry with all application metrics
 */
export function createMetricsRegistry() {
  const registry = new Registry();

  // Collect default Node.js metrics
  collectDefaultMetrics({ register: registry });

  // HTTP request metrics
  const httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [registry]
  });

  const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry]
  });

  // Webhook metrics
  const webhookPayloadsTotal = new Counter({
    name: 'webhook_payloads_total',
    help: 'Total number of webhook payloads received',
    labelNames: ['status'] as const,
    registers: [registry]
  });

  const workoutsProcessedTotal = new Counter({
    name: 'workouts_processed_total',
    help: 'Total number of workouts processed',
    labelNames: ['type'] as const,
    registers: [registry]
  });

  // Database metrics
  const dbQueryDuration = new Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'] as const,
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [registry]
  });

  // Business metrics
  const runningDaysCount = new Gauge({
    name: 'running_days_count',
    help: 'Current number of running days for the year',
    labelNames: ['year'] as const,
    registers: [registry]
  });

  const goalTargetDays = new Gauge({
    name: 'goal_target_days',
    help: 'Target number of running days for the year',
    labelNames: ['year'] as const,
    registers: [registry]
  });

  // PHI access metrics (for HIPAA monitoring)
  const phiAccessTotal = new Counter({
    name: 'phi_access_total',
    help: 'Total number of PHI access events',
    labelNames: ['action', 'outcome'] as const,
    registers: [registry]
  });

  // Outbound webhook metrics
  const webhookDeliveriesTotal = new Counter({
    name: 'webhook_deliveries_total',
    help: 'Total number of webhook delivery attempts',
    labelNames: ['event_type', 'status'] as const,
    registers: [registry]
  });

  const webhookDeliveryDuration = new Histogram({
    name: 'webhook_delivery_duration_seconds',
    help: 'Webhook delivery duration in seconds',
    labelNames: ['event_type', 'status'] as const,
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [registry]
  });

  const webhookRetryQueueSize = new Gauge({
    name: 'webhook_retry_queue_size',
    help: 'Number of webhook deliveries pending retry',
    registers: [registry]
  });

  return {
    registry,
    metrics: {
      httpRequestsTotal,
      httpRequestDuration,
      webhookPayloadsTotal,
      workoutsProcessedTotal,
      dbQueryDuration,
      runningDaysCount,
      goalTargetDays,
      phiAccessTotal,
      webhookDeliveriesTotal,
      webhookDeliveryDuration,
      webhookRetryQueueSize
    }
  };
}

export type MetricsRegistry = ReturnType<typeof createMetricsRegistry>;

/**
 * Helper functions for common metric operations
 */
export function createMetricsHelpers(metricsRegistry: MetricsRegistry) {
  const { metrics } = metricsRegistry;

  return {
    /**
     * Record HTTP request metrics
     */
    recordHttpRequest(method: string, route: string, status: number, durationMs: number) {
      const labels = { method, route, status: String(status) };
      metrics.httpRequestsTotal.inc(labels);
      metrics.httpRequestDuration.observe(labels, durationMs / 1000);
    },

    /**
     * Record database query metrics
     */
    recordDbQuery(operation: string, table: string, durationMs: number) {
      metrics.dbQueryDuration.observe({ operation, table }, durationMs / 1000);
    },

    /**
     * Update running days gauge
     */
    updateRunningDaysCount(year: number, count: number) {
      metrics.runningDaysCount.set({ year: String(year) }, count);
    },

    /**
     * Record PHI access for HIPAA compliance
     */
    recordPhiAccess(action: string, outcome: 'success' | 'denied' | 'error') {
      metrics.phiAccessTotal.inc({ action, outcome });
    },

    /**
     * Record webhook delivery attempt
     */
    recordWebhookDelivery(
      eventType: string,
      status: 'success' | 'failed',
      durationMs: number
    ) {
      metrics.webhookDeliveriesTotal.inc({ event_type: eventType, status });
      metrics.webhookDeliveryDuration.observe(
        { event_type: eventType, status },
        durationMs / 1000
      );
    },

    /**
     * Update webhook retry queue size
     */
    updateWebhookQueueSize(size: number) {
      metrics.webhookRetryQueueSize.set(size);
    },

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics(): Promise<string> {
      return metricsRegistry.registry.metrics();
    },

    /**
     * Get content type for Prometheus
     */
    getContentType(): string {
      return metricsRegistry.registry.contentType;
    }
  };
}

export type MetricsHelpers = ReturnType<typeof createMetricsHelpers>;
