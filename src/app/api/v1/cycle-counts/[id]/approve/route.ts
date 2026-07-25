import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/cycle-counts/{id}/approve
 *
 * Approve the cycle count and create ADJUSTMENT ledger entries for all variances.
 *
 * CRITICAL (User Requirement): No direct adjustments — ALL adjustments go through
 * approval flow. This endpoint is the ONLY way to create adjustment transactions.
 *
 * Flow:
 *   CycleCount (completed) → approve → for each line with variance:
 *     → create InventoryTransaction (ADJUSTMENT type)
 *     → mark line as reconciled
 *   → transition CycleCount to 'adjusted'
 *
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12). Optimistic lock (LAW-07).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const count = await db.cycleCount.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!count) throw new NotFoundException('CycleCount', params.id)
    if (count.status !== 'completed') {
      throw new ValidationException('Cycle count must be completed to approve', [
        { field: 'status', message: `Current: ${count.status}`, code: 'INVALID_STATE' },
      ])
    }

    // Check that all lines have been counted
    const uncountedLines = count.lines.filter((l) => l.countedQuantity === null)
    if (uncountedLines.length > 0) {
      throw new ValidationException(`${uncountedLines.length} lines have not been counted`, [
        { field: 'lines', message: `${uncountedLines.length} uncounted lines`, code: 'UNCOUNTED_LINES' },
      ])
    }

    let adjustmentsCreated = 0
    let totalVariance = 0

    // LAW-11: Application Service manages transaction
    // LAW-12: Unit of Work wraps all repos (cycle count + ledger + outbox)
    await UnitOfWork.execute(async (uow) => {
      const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

      for (const line of count.lines) {
        const variance = (line.countedQuantity ?? 0) - line.systemQuantity

        if (variance === 0) {
          // No variance — mark as reconciled
          await uow.tx.cycleCountLine.update({
            where: { id: line.id },
            data: { isReconciled: true },
          })
          continue
        }

        // Create ADJUSTMENT ledger entry (LAW-05: append-only)
        await uow.tx.inventoryTransaction.create({
          data: {
            tenantId,
            transactionNumber: `${txnNumber}-ADJ-${line.id.slice(-6)}`,
            transactionType: 'ADJUSTMENT',
            stockItemId: line.stockItemId,
            productId: line.productId,
            productInstanceId: line.productInstanceId,
            fromWarehouseId: line.warehouseId,
            toWarehouseId: line.warehouseId,
            batchNumber: line.batchNumber,
            quantity: variance, // positive if surplus, negative if shortage
            reason: `Cycle Count ${count.countNumber} — ${line.varianceReason ?? 'Variance adjustment'}`,
            referenceType: 'cycle_count',
            referenceId: count.id,
          },
        })

        // Mark line as reconciled
        await uow.tx.cycleCountLine.update({
          where: { id: line.id },
          data: { isReconciled: true },
        })

        adjustmentsCreated++
        totalVariance += variance
      }

      // Transition cycle count to approved → adjusted
      await uow.tx.cycleCount.update({
        where: { id: count.id, version: count.version }, // LAW-07: optimistic lock
        data: {
          status: 'adjusted',
          approvedAt: new Date(),
          approvedBy: body.approvedBy ?? null,
          adjustedAt: new Date(),
          version: { increment: 1 },
        },
      })

      // Outbox event (LAW-08: in same transaction as data change)
      await uow.outbox.append({
        tenantId,
        aggregateType: 'CycleCount',
        aggregateId: count.id,
        eventType: 'cycle_count.adjusted',
        payload: {
          countNumber: count.countNumber,
          adjustmentsCreated,
          totalVariance,
        },
        actorId: body.approvedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        id: count.id,
        countNumber: count.countNumber,
        status: 'adjusted',
        adjustmentsCreated,
        totalVariance,
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve cycle count', statusCode: 500 })
  }
}
