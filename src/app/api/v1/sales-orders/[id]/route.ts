import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/sales-orders/{id}
 * Show sales order with all lines.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const order = await db.salesOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    })
    if (!order) throw new NotFoundException('SalesOrder', params.id)

    return jsonResponse({ data: { ...toDTO(order), lines: order.lines.map(lineToDTO) } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch sales order', statusCode: 500 })
  }
}

/**
 * PATCH /api/v1/sales-orders/{id}
 * Update sales order (only allowed in draft status — LAW-14: Immutable after approval).
 * Uses Optimistic Locking (LAW-07).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const body = await request.json()

    const order = await db.salesOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!order) throw new NotFoundException('SalesOrder', params.id)

    // LAW-14: Immutable Business Documents
    const immutableStatuses = ['approved', 'invoiced', 'shipped', 'partially_shipped', 'completed']
    if (immutableStatuses.includes(order.status)) {
      throw new ValidationException('Cannot edit approved sales order (LAW-14)', [
        { field: 'status', message: `Order is ${order.status} — use reversal/correction instead`, code: 'IMMUTABLE' },
      ])
    }

    const ifMatch = request.headers.get('If-Match')
    const expectedVersion = ifMatch ? parseInt(ifMatch, 10) : null

    // LAW-07: Optimistic Lock
    const result = await db.salesOrder.updateMany({
      where: expectedVersion !== null
        ? { id: params.id, tenantId, version: expectedVersion }
        : { id: params.id, tenantId },
      data: {
        notes: body.notes ?? order.notes,
        expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : order.expectedDelivery,
        shippingAmount: body.shippingAmount ?? order.shippingAmount,
        version: { increment: 1 },
      },
    })

    if (result.count === 0) {
      throw new DomainException(
        'Optimistic lock conflict or not found',
        'OPTIMISTIC_LOCK_FAILED',
        409,
      )
    }

    const updated = await db.salesOrder.findUnique({ where: { id: params.id } })
    return jsonResponse({ data: toDTO(updated) })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update sales order', statusCode: 500 })
  }
}

function toDTO(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerPartyId: order.customerPartyId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    shippingAmount: order.shippingAmount,
    totalAmount: order.totalAmount,
    currencyCode: order.currencyCode,
    notes: order.notes,
    version: order.version,
    orderDate: order.orderDate.toISOString(),
  }
}

function lineToDTO(line: any) {
  return {
    id: line.id,
    lineNumber: line.lineNumber,
    productId: line.productId,
    productInstanceId: line.productInstanceId,
    quantityOrdered: line.quantityOrdered,
    quantityReserved: line.quantityReserved,
    quantityShipped: line.quantityShipped,
    quantityReturned: line.quantityReturned,
    unitPrice: line.unitPrice,
    discountPercent: line.discountPercent,
    discountAmount: line.discountAmount,
    taxPercent: line.taxPercent,
    taxAmount: line.taxAmount,
    lineTotal: line.lineTotal,
    notes: line.notes,
  }
}
