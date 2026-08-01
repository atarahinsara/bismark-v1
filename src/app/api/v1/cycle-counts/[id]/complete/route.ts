import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/cycle-counts/{id}/complete
 * Complete the cycle count — transitions from in_progress → completed.
 * Expects counted quantities in body (array of { lineId, countedQuantity, reason }).
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'inventory.cycle_count')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    const count = await db.cycleCount.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!count) throw new NotFoundException('CycleCount', params.id)
    if (count.status !== 'in_progress') {
      throw new ValidationException('Cycle count must be in_progress to complete', [
        { field: 'status', message: `Current: ${count.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-11/12: Application Service + Unit of Work
    await UnitOfWork.execute(async (uow) => {
      // Update each line with counted quantity
      if (body.lines && Array.isArray(body.lines)) {
        for (const entry of body.lines) {
          if (entry.lineId === undefined || entry.countedQuantity === undefined) continue
          await uow.tx.cycleCountLine.update({
            where: { id: entry.lineId },
            data: {
              countedQuantity: entry.countedQuantity,
              countedAt: new Date(),
              varianceReason: entry.reason ?? null,
            },
          })
        }
      }

      // Transition to completed
      await uow.tx.cycleCount.update({
        where: { id: count.id, version: count.version }, // LAW-07
        data: {
          status: 'completed',
          completedAt: new Date(),
          version: { increment: 1 },
        },
      })

      await uow.outbox.append({
        tenantId,
        aggregateType: 'CycleCount',
        aggregateId: count.id,
        eventType: 'cycle_count.completed',
        payload: { countNumber: count.countNumber },
        actorId: null,
      })
    })

    const response = jsonResponse({ data: { id: count.id, status: 'completed' } })
    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to complete cycle count', statusCode: 500 })
  }
}
