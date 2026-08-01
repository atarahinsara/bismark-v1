import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/shipments
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'fulfillment.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const salesOrderId = url.searchParams.get('sales_order_id')

    const where = {
      tenantId, deletedAt: null,
      ...(status ? { status } : {}),
      ...(salesOrderId ? { salesOrderId } : {}),
    }

    const [shipments, total] = await Promise.all([
      db.shipment.findMany({
        where, include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.shipment.count({ where }),
    ])

    return jsonResponse({
      data: shipments.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list shipments', statusCode: 500 })
  }
}

/**
 * POST /api/v1/shipments
 * Create a new shipment from a sales order.
 * LAW-17: Requires approved Sales Order with reservation.
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'fulfillment.read')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.salesOrderId) throw new ValidationException('Sales order is required', [
      { field: 'salesOrderId', message: 'Required', code: 'REQUIRED' },
    ])
    if (!body.fromWarehouseId) throw new ValidationException('Warehouse is required', [
      { field: 'fromWarehouseId', message: 'Required', code: 'REQUIRED' },
    ])

    // Verify sales order exists and is approved (LAW-17: Reservation Before Shipment)
    const order = await db.salesOrder.findFirst({
      where: { id: body.salesOrderId, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!order) throw new NotFoundException('SalesOrder', body.salesOrderId)
    if (order.status !== 'approved' && order.status !== 'partially_shipped') {
      throw new ValidationException('Sales order must be approved to create shipment (LAW-17)', [
        { field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-17: Verify reservation exists (check stock reservations for this order)
    const reservations = await db.stockReservation.findMany({
      where: { tenantId, referenceType: 'sales_order', referenceId: body.salesOrderId, status: 'active' },
    })
    if (reservations.length === 0) {
      throw new ValidationException('No active reservation found for this sales order (LAW-17)', [
        { field: 'reservation', message: 'Reservation required before shipment', code: 'NO_RESERVATION' },
      ])
    }

    // Verify warehouse
    const warehouse = await db.warehouse.findFirst({ where: { id: body.fromWarehouseId, tenantId, deletedAt: null } })
    if (!warehouse) throw new NotFoundException('Warehouse', body.fromWarehouseId)

    const shipmentNumber = await BusinessCodeGenerator.generate('shipment', tenantId)

    // Create shipment + lines from sales order lines
    const shipment = await UnitOfWork.execute(async (uow) => {
      const newShipment = await uow.tx.shipment.create({
        data: {
          tenantId,
          shipmentNumber,
          salesOrderId: body.salesOrderId,
          customerPartyId: order.customerPartyId,
          fromWarehouseId: body.fromWarehouseId,
          toPartyId: order.customerPartyId,
          status: 'draft',
          shippingMethod: body.shippingMethod ?? null,
          shippingCost: body.shippingCost ?? 0,
          expectedArrival: body.expectedArrival ? new Date(body.expectedArrival) : null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      // Create shipment lines from sales order lines
      let lineNum = 1
      for (const orderLine of order.lines) {
        const remainingQty = orderLine.quantityOrdered - orderLine.quantityShipped
        if (remainingQty <= 0) continue

        await uow.tx.shipmentLine.create({
          data: {
            tenantId,
            shipmentId: newShipment.id,
            salesOrderLineId: orderLine.id,
            lineNumber: lineNum++,
            productId: orderLine.productId,
            productInstanceId: orderLine.productInstanceId,
            quantity: remainingQty,
            batchNumber: null,
          },
        })
      }

      // Outbox event (LAW-08, LAW-15)
      await uow.outbox.append({
        tenantId,
        aggregateType: 'Shipment',
        aggregateId: newShipment.id,
        eventType: 'shipment.created',
        eventVersion: '1.0',
        payload: { shipmentNumber, salesOrderId: body.salesOrderId, customerPartyId: order.customerPartyId },
        actorId: null,
      })

      return newShipment
    })

    const result = await db.shipment.findUnique({
      where: { id: shipment.id },
      include: { _count: { select: { lines: true } } },
    })

    const response = jsonResponse({ data: toDTO(result) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create shipment', statusCode: 500 })
  }
}

function toDTO(s: any) {
  return {
    id: s.id, shipmentNumber: s.shipmentNumber, salesOrderId: s.salesOrderId,
    customerPartyId: s.customerPartyId, fromWarehouseId: s.fromWarehouseId, toPartyId: s.toPartyId,
    status: s.status, shipmentDate: s.shipmentDate.toISOString(),
    expectedArrival: s.expectedArrival?.toISOString() ?? null,
    shippedAt: s.shippedAt?.toISOString() ?? null,
    deliveredAt: s.deliveredAt?.toISOString() ?? null,
    shippingMethod: s.shippingMethod, trackingNumber: s.trackingNumber,
    shippingCost: s.shippingCost, currencyCode: s.currencyCode,
    notes: s.notes, version: s.version,
    lineCount: s._count?.lines ?? 0,
    createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(),
  }
}
