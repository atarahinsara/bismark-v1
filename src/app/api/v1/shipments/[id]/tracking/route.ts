import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/shipments/{id}/tracking
 * Get tracking information for a shipment.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const shipment = await db.shipment.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!shipment) throw new NotFoundException('Shipment', params.id)

    // Build tracking timeline from shipment lifecycle
    const timeline = []
    if (shipment.createdAt) timeline.push({ event: 'created', timestamp: shipment.createdAt.toISOString(), label: 'سفارش ایجاد شد' })
    if (shipment.shippedAt) timeline.push({ event: 'shipped', timestamp: shipment.shippedAt.toISOString(), label: 'ارسال شد' })
    if (shipment.deliveredAt) timeline.push({ event: 'delivered', timestamp: shipment.deliveredAt.toISOString(), label: 'تحویل داده شد' })

    return jsonResponse({
      data: {
        shipmentNumber: shipment.shipmentNumber,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
        shippingMethod: shipment.shippingMethod,
        shippedAt: shipment.shippedAt?.toISOString() ?? null,
        deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
        expectedArrival: shipment.expectedArrival?.toISOString() ?? null,
        lineCount: shipment.lines.length,
        timeline,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get tracking', statusCode: 500 })
  }
}
