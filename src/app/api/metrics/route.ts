/**
 * GET /api/metrics
 *
 * Prometheus metrics endpoint (T-2-10).
 * Returns metrics in Prometheus text exposition format.
 *
 * Security: IP-whitelist in production (configure via METRICS_ALLOWED_IPS env).
 * In development, accessible from localhost only.
 */

import { NextRequest } from 'next/server'
import { getMetrics } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Basic access control — in production, restrict to monitoring subnet
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const allowedIps = process.env.METRICS_ALLOWED_IPS?.split(',').map((s) => s.trim()) || []

  if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
    return new Response('Forbidden', { status: 403 })
  }

  // In production without explicit allowlist, restrict to localhost
  if (process.env.NODE_ENV === 'production' && allowedIps.length === 0) {
    if (clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== 'unknown') {
      return new Response('Forbidden', { status: 403 })
    }
  }

  const metrics = await getMetrics()

  return new Response(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
