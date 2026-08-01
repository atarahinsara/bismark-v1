/**
 * BISMARK ERP — SLA Enforcement Service (T-6-07 to T-6-09)
 *
 * - T-6-07: SLA Deadline Auto-Calculation (on ServiceRequest creation)
 * - T-6-08: SLA Breach Detection (cron-style check)
 * - T-6-09: Escalation Rules
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * T-6-07: Calculate SLA deadline for a service request.
 *
 * Finds matching SLAPolicy (by entityType + priority) and creates SLATracker
 * with responseDeadline + resolutionDeadline.
 *
 * Called when a ServiceRequest is created or validated.
 */
export async function calculateSlaDeadlines(
  serviceRequestId: string,
  tenantId: string,
): Promise<{ trackerId: string; responseDeadline: Date; resolutionDeadline: Date } | null> {
  // Get service request
  const sr = await db.serviceRequest.findFirst({
    where: { id: serviceRequestId, tenantId },
    select: { id: true, priority: true, createdAt: true },
  })

  if (!sr) return null

  // Find matching SLA policy
  const policy = await db.sLAPolicy.findFirst({
    where: {
      tenantId,
      entityType: 'service_request',
      isActive: true,
    },
    orderBy: [{ priority: 'desc' }],
  })

  if (!policy) {
    logger.debug({ serviceRequestId }, 'No SLA policy found — skipping deadline calculation')
    return null
  }

  // Calculate deadlines
  const now = sr.createdAt || new Date()
  const responseDeadline = new Date(now.getTime() + policy.responseTimeMinutes * 60 * 1000)
  const resolutionDeadline = new Date(now.getTime() + policy.resolutionTimeHours * 60 * 60 * 1000)

  // Check if tracker already exists (idempotency)
  const existing = await db.sLATracker.findFirst({
    where: { tenantId, entityType: 'service_request', entityId: serviceRequestId },
  })

  if (existing) {
    return {
      trackerId: existing.id,
      responseDeadline: existing.responseDeadline,
      resolutionDeadline: existing.resolutionDeadline,
    }
  }

  // Create SLA tracker
  const tracker = await db.sLATracker.create({
    data: {
      tenantId,
      entityType: 'service_request',
      entityId: serviceRequestId,
      slaPolicyId: policy.id,
      responseDeadline,
      resolutionDeadline,
      isBreached: false,
    },
  })

  // Emit outbox event
  await db.outboxMessage.create({
    data: {
      tenantId,
      aggregateType: 'SLATracker',
      aggregateId: tracker.id,
      eventType: 'sla.deadline_calculated',
      eventVersion: '1.0',
      payload: {
        trackerId: tracker.id,
        serviceRequestId,
        responseDeadline: responseDeadline.toISOString(),
        resolutionDeadline: resolutionDeadline.toISOString(),
        policyId: policy.id,
      },
      status: 'pending',
    },
  })

  logger.info({ trackerId: tracker.id, serviceRequestId, responseDeadline, resolutionDeadline }, 'SLA deadlines calculated')

  return {
    trackerId: tracker.id,
    responseDeadline,
    resolutionDeadline,
  }
}

/**
 * T-6-08: Check for SLA breaches.
 *
 * Called periodically (every 5 minutes) by a cron job or worker.
 *
 * Finds SLA trackers that:
 *   - Are not yet breached
 *   - Have deadlines that have passed
 *   - Have not been responded/resolved
 *
 * Marks them as breached + emits sla.breached event.
 */
export async function checkSlaBreaches(tenantId: string): Promise<{
  responseBreaches: number
  resolutionBreaches: number
  imminentBreaches: number
}> {
  const now = new Date()
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

  // Find response breaches (deadline passed, not responded)
  const responseBreaches = await db.sLATracker.findMany({
    where: {
      tenantId,
      isBreached: false,
      respondedAt: null,
      responseDeadline: { lt: now },
    },
  })

  // Find resolution breaches (deadline passed, not resolved)
  const resolutionBreaches = await db.sLATracker.findMany({
    where: {
      tenantId,
      isBreached: false,
      resolvedAt: null,
      resolutionDeadline: { lt: now },
    },
  })

  // Find imminent breaches (deadline within 1 hour)
  const imminentBreaches = await db.sLATracker.findMany({
    where: {
      tenantId,
      isBreached: false,
      resolvedAt: null,
      resolutionDeadline: { lt: oneHourFromNow, gt: now },
    },
  })

  // Mark breaches
  const allBreaches = [...responseBreaches, ...resolutionBreaches]
  for (const tracker of allBreaches) {
    await db.sLATracker.update({
      where: { id: tracker.id },
      data: {
        isBreached: true,
        breachReason: responseBreaches.includes(tracker)
          ? 'Response deadline breached'
          : 'Resolution deadline breached',
      },
    })

    // Emit outbox event
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'SLATracker',
        aggregateId: tracker.id,
        eventType: 'sla.breached',
        eventVersion: '1.0',
        payload: {
          trackerId: tracker.id,
          entityType: tracker.entityType,
          entityId: tracker.entityId,
          breachType: responseBreaches.includes(tracker) ? 'response' : 'resolution',
          deadline: responseBreaches.includes(tracker)
            ? tracker.responseDeadline.toISOString()
            : tracker.resolutionDeadline.toISOString(),
        },
        status: 'pending',
      },
    })
  }

  // Emit imminent breach alerts
  for (const tracker of imminentBreaches) {
    await db.outboxMessage.create({
      data: {
        tenantId,
        aggregateType: 'SLATracker',
        aggregateId: tracker.id,
        eventType: 'sla.breach_imminent',
        eventVersion: '1.0',
        payload: {
          trackerId: tracker.id,
          entityType: tracker.entityType,
          entityId: tracker.entityId,
          deadline: tracker.resolutionDeadline.toISOString(),
          minutesRemaining: Math.round(
            (tracker.resolutionDeadline.getTime() - now.getTime()) / 60000,
          ),
        },
        status: 'pending',
      },
    })
  }

  logger.info({
    tenantId,
    responseBreaches: responseBreaches.length,
    resolutionBreaches: resolutionBreaches.length,
    imminentBreaches: imminentBreaches.length,
  }, 'SLA breach check completed')

  return {
    responseBreaches: responseBreaches.length,
    resolutionBreaches: resolutionBreaches.length,
    imminentBreaches: imminentBreaches.length,
  }
}
