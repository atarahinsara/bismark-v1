import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

interface Params { params: { instanceId: string } }

/**
 * GET /api/v1/device-timeline/{instanceId}
 *
 * LAW-30: Device Timeline is reconstructed from immutable Domain Events.
 * NOT stored as a table. NOT computed via cross-context JOINs.
 *
 * Query: SELECT * FROM outbox_messages
 *        WHERE aggregateId = ? OR payload contains instanceId
 *        ORDER BY occurredAt ASC
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const instanceId = params.instanceId

    // LAW-30: Reconstruct timeline from Outbox events
    const events = await db.outboxMessage.findMany({
      where: {
        tenantId,
        OR: [
          { aggregateId: instanceId },
          { aggregateType: 'ProductInstance', aggregateId: instanceId },
          { aggregateType: 'WarrantyCard', payload: { path: ['productInstanceId'], equals: instanceId } },
          { aggregateType: 'WarrantyClaim', payload: { path: ['productInstanceId'], equals: instanceId } },
          { aggregateType: 'Shipment', payload: { path: ['productInstanceId'], equals: instanceId } },
        ],
      },
      orderBy: { occurredAt: 'asc' },
    })

    // Map events to timeline entries
    const timeline = events.map((e) => ({
      eventId: e.id,
      eventType: e.eventType,
      eventVersion: e.eventVersion,
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      payload: e.payload,
      occurredAt: e.occurredAt.toISOString(),
      publishedAt: e.publishedAt?.toISOString() ?? null,
      label: getEventLabel(e.eventType),
    }))

    return jsonResponse({
      data: {
        productInstanceId: instanceId,
        eventCount: timeline.length,
        timeline,
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to build timeline', statusCode: 500 })
  }
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'product_instance.created': 'ایجاد محصول',
    'shipment.created': 'ساخت محموله',
    'shipment.shipped': 'ارسال شد',
    'shipment.delivered': 'تحویل داده شد',
    'warranty_card.created': 'کارت گارانتی ایجاد شد',
    'warranty.activated': 'گارانتی فعال شد',
    'warranty.extended': 'گارانتی تمدید شد',
    'warranty.claim.submitted': 'ادعای گارانتی ثبت شد',
    'warranty.claim.inspected': 'بازرسی انجام شد',
    'warranty.claim.approved': 'ادعا تأیید شد',
    'warranty.claim.rejected': 'ادعا رد شد',
    'warranty.transfer.approved': 'انتقال گارانتی تأیید شد',
    'return_order.received': 'مرجوعی دریافت شد',
    'sales_order.approved': 'سفارش تأیید شد',
  }
  return labels[eventType] || eventType
}
