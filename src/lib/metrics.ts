/**
 * BISMARK ERP — Metrics Service (T-2-10)
 *
 * Prometheus-compatible metrics collection.
 * Exposed at /api/metrics for Prometheus scraping.
 *
 * Metrics collected:
 * - HTTP request count + duration (by method, route, status)
 * - Active sessions count
 * - Outbox message count (by status)
 * - Worker loop duration
 * - DB query duration (if instrumented)
 */

import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'

// Create a Registry to register metrics
export const register = new Registry()

// Enable default metrics (CPU, memory, event loop)
collectDefaultMetrics({ register })

// ============================================================
// HTTP Metrics
// ============================================================

export const httpRequestCounter = new Counter({
  name: 'bismark_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
})

export const httpRequestDuration = new Histogram({
  name: 'bismark_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

// ============================================================
// Business Metrics
// ============================================================

export const businessEventsCounter = new Counter({
  name: 'bismark_business_events_total',
  help: 'Business events published (by type)',
  labelNames: ['eventType', 'aggregateType'],
  registers: [register],
})

export const ordersCreatedCounter = new Counter({
  name: 'bismark_orders_created_total',
  help: 'Sales orders created',
  labelNames: ['tenantId'],
  registers: [register],
})

export const paymentsReceivedCounter = new Counter({
  name: 'bismark_payments_received_total',
  help: 'Payments received',
  labelNames: ['tenantId', 'currencyCode'],
  registers: [register],
})

// ============================================================
// Infrastructure Metrics
// ============================================================

export const activeSessionsGauge = new Gauge({
  name: 'bismark_active_sessions',
  help: 'Active user sessions',
  labelNames: ['tenantId'],
  registers: [register],
})

export const outboxPendingGauge = new Gauge({
  name: 'bismark_outbox_pending_messages',
  help: 'Outbox messages pending publication',
  registers: [register],
})

export const outboxFailedGauge = new Gauge({
  name: 'bismark_outbox_failed_messages',
  help: 'Outbox messages in DLQ',
  registers: [register],
})

export const workerLoopDuration = new Histogram({
  name: 'bismark_worker_loop_duration_seconds',
  help: 'Worker loop execution duration',
  labelNames: ['worker'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
})

export const dbQueryDuration = new Histogram({
  name: 'bismark_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
})

// ============================================================
// Auth Metrics
// ============================================================

export const authAttemptsCounter = new Counter({
  name: 'bismark_auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['method', 'result'],
  registers: [register],
})

/**
 * Record an HTTP request metric.
 * Call from middleware or route handler.
 */
export function recordHttpRequest(
  method: string,
  route: string,
  status: number,
  durationMs: number,
): void {
  const durationSec = durationMs / 1000
  httpRequestCounter.labels(method, route, String(status)).inc()
  httpRequestDuration.labels(method, route, String(status)).observe(durationSec)
}

/**
 * Get metrics in Prometheus text format.
 */
export async function getMetrics(): Promise<string> {
  return register.metrics()
}
