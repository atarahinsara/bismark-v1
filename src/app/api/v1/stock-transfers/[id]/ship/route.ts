import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/stock-transfers/{id}/ship
 * Ship the transfer — creates OUT ledger entries for all lines.
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // LAW-06: Idempotency
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const transfer = await db.stockTransfer.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!transfer) throw new NotFoundException('StockTransfer', params.id)
    if (transfer.status !== 'draft') {
      throw new ValidationException('Transfer must be in draft status to ship', [
        { field: 'status', message: `Current: ${transfer.status}`, code: 'INVALID_STATE' },
      ])
    }
    if (transfer.lines.length === 0) {
      throw new ValidationException('Transfer has no lines', [
        { field: 'lines', message: 'Add at least one line before shipping', code: 'EMPTY' },
      ])
    }

    // Create OUT ledger entries for each line (LAW-05: append-only)
    const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

    await db.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            transactionNumber: `${txnNumber}-OUT-${line.id.slice(-6)}`,
            transactionType: 'OUT',
            stockItemId: line.stockItemId,
            productId: line.productId,
            productInstanceId: line.productInstanceId,
            fromWarehouseId: transfer.fromWarehouseId,
            fromLocationId: line.fromLocationId ?? transfer.fromLocationId,
            toWarehouseId: transfer.toWarehouseId,
            toLocationId: line.toLocationId ?? transfer.toLocationId,
            batchNumber: line.batchNumber,
            quantity: -Math.abs(line.quantity),
            unitCost: line.unitCost,
            reason: `Transfer ${transfer.transferNumber}`,
            referenceType: 'transfer',
            referenceId: transfer.id,
          },
        })
      }

      // Update transfer status (LAW-07: optimistic lock via version)
      await tx.stockTransfer.update({
        where: { id: transfer.id, version: transfer.version },
        data: {
          status: 'in_transit',
          shippedBy: (await request.json().catch(() => ({}))).shippedBy ?? null,
          version: { increment: 1 },
        },
      })
    })

    const response = jsonResponse({
      data: {
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        status: 'in_transit',
        ledgerEntriesCreated: transfer.lines.length,
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to ship transfer', statusCode: 500 })
  }
}
