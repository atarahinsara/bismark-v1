import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/stock-transfers/{id}
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const transfer = await db.stockTransfer.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!transfer) throw new NotFoundException('StockTransfer', params.id)
    return jsonResponse({ data: toDTO(transfer) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch transfer', statusCode: 500 })
  }
}

/**
 * POST /api/v1/stock-transfers/{id}/lines
 * Add a line item to the transfer.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    const transfer = await db.stockTransfer.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!transfer) throw new NotFoundException('StockTransfer', params.id)
    if (transfer.status !== 'draft') {
      throw new ValidationException('Transfer is not in draft status', [
        { field: 'status', message: `Current: ${transfer.status}`, code: 'INVALID_STATE' },
      ])
    }

    if (!body.stockItemId) throw new ValidationException('Stock item is required', [
      { field: 'stockItemId', message: 'Required', code: 'REQUIRED' },
    ])
    if (!body.quantity || body.quantity <= 0) throw new ValidationException('Quantity must be positive', [
      { field: 'quantity', message: 'Must be > 0', code: 'INVALID' },
    ])

    const stockItem = await db.stockItem.findFirst({
      where: { id: body.stockItemId, tenantId, deletedAt: null },
    })
    if (!stockItem) throw new NotFoundException('StockItem', body.stockItemId)

    const line = await db.stockTransferLine.create({
      data: {
        tenantId,
        transferId: params.id,
        stockItemId: body.stockItemId,
        productId: stockItem.productId,
        productInstanceId: stockItem.productInstanceId,
        batchNumber: body.batchNumber ?? stockItem.batchNumber,
        quantity: body.quantity,
        unitCost: body.unitCost ?? null,
        fromLocationId: body.fromLocationId ?? null,
        toLocationId: body.toLocationId ?? null,
        notes: body.notes ?? null,
      },
    })

    return jsonResponse({ data: line }, 201)
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to add line', statusCode: 500 })
  }
}

function toDTO(transfer: any) {
  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    transferType: transfer.transferType,
    fromWarehouseId: transfer.fromWarehouseId,
    toWarehouseId: transfer.toWarehouseId,
    status: transfer.status,
    transferDate: transfer.transferDate.toISOString(),
    expectedArrival: transfer.expectedArrival?.toISOString() ?? null,
    actualArrival: transfer.actualArrival?.toISOString() ?? null,
    version: transfer.version,
    lines: transfer.lines?.map((l: any) => ({
      id: l.id,
      stockItemId: l.stockItemId,
      productId: l.productId,
      quantity: l.quantity,
      quantityReceived: l.quantityReceived,
    })) ?? [],
  }
}
