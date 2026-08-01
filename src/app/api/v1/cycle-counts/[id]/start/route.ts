import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/cycle-counts/{id}/start
 * Start the cycle count — transitions from draft → in_progress.
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
    const body = await request.json().catch(() => ({}))

    const count = await db.cycleCount.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!count) throw new NotFoundException('CycleCount', params.id)
    if (count.status !== 'draft') {
      throw new ValidationException('Cycle count must be in draft status to start', [
        { field: 'status', message: `Current: ${count.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-11: Application Service manages transaction
    // LAW-12: Unit of Work wraps all repos
    await UnitOfWork.execute(async (uow) => {
      await uow.tx.cycleCount.update({
        where: { id: count.id, version: count.version }, // LAW-07: optimistic lock
        data: {
          status: 'in_progress',
          startedAt: new Date(),
          countedBy: body.countedBy ?? null,
          version: { increment: 1 },
        },
      })

      // Re-snapshot system quantities at start time (LAW-05: from ledger)
      const lines = await uow.tx.cycleCountLine.findMany({
        where: { cycleCountId: count.id },
      })
      for (const line of lines) {
        const ledgerSum = await uow.tx.inventoryTransaction.aggregate({
          where: { stockItemId: line.stockItemId },
          _sum: { quantity: true },
        })
        await uow.tx.cycleCountLine.update({
          where: { id: line.id },
          data: { systemQuantity: ledgerSum._sum.quantity ?? 0 },
        })
      }

      await uow.outbox.append({
        tenantId,
        aggregateType: 'CycleCount',
        aggregateId: count.id,
        eventType: 'cycle_count.started',
        payload: { countNumber: count.countNumber },
        actorId: body.countedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: count.id, status: 'in_progress' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to start cycle count', statusCode: 500 })
  }
}
