import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/shipments/{id}
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const shipment = await db.shipment.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: { orderBy: { lineNumber: 'asc' } } },
    })
    if (!shipment) throw new NotFoundException('Shipment', params.id)
    return jsonResponse({ data: toDTO(shipment), lines: shipment.lines.map(lineToDTO) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch shipment', statusCode: 500 })
  }
}

function toDTO(s: any) {
  return {
    id: s.id, shipmentNumber: s.shipmentNumber, salesOrderId: s.salesOrderId,
    customerPartyId: s.customerPartyId, fromWarehouseId: s.fromWarehouseId,
    status: s.status, version: s.version,
    shipmentDate: s.shipmentDate.toISOString(),
    shippedAt: s.shippedAt?.toISOString() ?? null,
    deliveredAt: s.deliveredAt?.toISOString() ?? null,
    trackingNumber: s.trackingNumber, shippingMethod: s.shippingMethod,
    shippingCost: s.shippingCost, notes: s.notes,
  }
}

function lineToDTO(l: any) {
  return {
    id: l.id, lineNumber: l.lineNumber, productId: l.productId,
    productInstanceId: l.productInstanceId, quantity: l.quantity,
    quantityPicked: l.quantityPicked, quantityPacked: l.quantityPacked,
    quantityShipped: l.quantityShipped, quantityDelivered: l.quantityDelivered,
  }
}
