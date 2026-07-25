import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/stock-transfers/{id}/receive
 * Receive the transfer — creates IN ledger entries for destination stock items.
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
    if (transfer.status !== 'in_transit') {
      throw new ValidationException('Transfer must be in_transit to receive', [
        { field: 'status', message: `Current: ${transfer.status}`, code: 'INVALID_STATE' },
      ])
    }

    if (!transfer.toWarehouseId) {
      throw new ValidationException('Transfer has no destination warehouse', [
        { field: 'toWarehouseId', message: 'Required for receive', code: 'MISSING_DEST' },
      ])
    }

    const txnNumber = await BusinessCodeGenerator.generate('inventory_transaction', tenantId)

    await db.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        // Find or create destination stock item
        const destItem = await tx.stockItem.upsert({
          where: {
            tenantId_warehouseId_productId_productInstanceId_batchNumber: {
              tenantId,
              warehouseId: transfer.toWarehouseId!,
              productId: line.productId,
              productInstanceId: line.productInstanceId ?? '',
              batchNumber: line.batchNumber ?? '',
            },
          },
          update: {},
          create: {
            tenantId,
            warehouseId: transfer.toWarehouseId!,
            locationId: line.toLocationId ?? null,
            productId: line.productId,
            productInstanceId: line.productInstanceId,
            batchNumber: line.batchNumber,
            status: 'available',
            metadata: {},
          },
        })

        // IN ledger entry
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            transactionNumber: `${txnNumber}-IN-${line.id.slice(-6)}`,
            transactionType: 'IN',
            stockItemId: destItem.id,
            productId: line.productId,
            productInstanceId: line.productInstanceId,
            fromWarehouseId: transfer.fromWarehouseId,
            fromLocationId: line.fromLocationId,
            toWarehouseId: transfer.toWarehouseId,
            toLocationId: line.toLocationId,
            batchNumber: line.batchNumber,
            quantity: Math.abs(line.quantity),
            unitCost: line.unitCost,
            reason: `Transfer ${transfer.transferNumber}`,
            referenceType: 'transfer',
            referenceId: transfer.id,
          },
        })

        // Update line received quantity
        await tx.stockTransferLine.update({
          where: { id: line.id },
          data: { quantityReceived: line.quantity },
        })
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id: transfer.id, version: transfer.version },
        data: {
          status: 'received',
          actualArrival: new Date(),
          version: { increment: 1 },
        },
      })
    })

    const response = jsonResponse({
      data: {
        id: transfer.id,
        transferNumber: transfer.transferNumber,
        status: 'received',
        ledgerEntriesCreated: transfer.lines.length,
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to receive transfer', statusCode: 500 })
  }
}
