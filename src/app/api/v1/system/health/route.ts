import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { jsonResponse } from '@/lib/api-helpers'

/**
 * GET /api/v1/system/health
 * Health check endpoint for Docker, K8s, and monitoring.
 */
export async function GET(request: NextRequest) {
  const checks: Record<string, { status: string; latency?: number }> = {}

  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`
    checks.database = { status: 'healthy', latency: Date.now() - start }
  } catch {
    checks.database = { status: 'unhealthy' }
  }

  try {
    const pendingCount = await db.outboxMessage.count({ where: { status: 'pending' } })
    checks.outbox = { status: pendingCount > 1000 ? 'degraded' : 'healthy', latency: pendingCount }
  } catch {
    checks.outbox = { status: 'unknown' }
  }

  try {
    const activeSagas = await db.sagaInstance.count({ where: { status: { in: ['running', 'compensating'] } } })
    checks.sagas = { status: 'healthy', latency: activeSagas }
  } catch {
    checks.sagas = { status: 'unknown' }
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy')
  const overall = allHealthy ? 'healthy' : 'degraded'

  return jsonResponse({
    data: {
      status: overall,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks,
    },
  }, allHealthy ? 200 : 503)
}
