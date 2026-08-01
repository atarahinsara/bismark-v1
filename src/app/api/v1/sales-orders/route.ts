import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, forbiddenResponse, unauthorizedResponse } from '@/lib/rbac'

/**
 * GET /api/v1/sales-orders
 * List sales orders with filtering.
 * Requires: sales.read
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'sales.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const customerPartyId = url.searchParams.get('customer_party_id')

    const where = {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(customerPartyId ? { customerPartyId } : {}),
    }

    const [orders, total] = await Promise.all([
      db.salesOrder.findMany({
        where,
        include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
      db.salesOrder.count({ where }),
    ])

    return jsonResponse({
      data: orders.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list sales orders', statusCode: 500 })
  }
}

/**
 * POST /api/v1/sales-orders
 * Create a new sales order with lines (Idempotent — LAW-06).
 * Uses Unit of Work (LAW-12) + Optimistic Lock (LAW-07) + Outbox (LAW-08).
 * Requires: sales.create
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'sales.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    // Validation
    if (!body.customerPartyId) throw new ValidationException('Customer is required', [
      { field: 'customerPartyId', message: 'Required', code: 'REQUIRED' },
    ])
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
      throw new ValidationException('At least one line is required', [
        { field: 'lines', message: 'At least one line required', code: 'REQUIRED' },
      ])
    }

    // Verify customer party exists (loose FK — LAW-01)
    const customer = await db.party.findFirst({
      where: { id: body.customerPartyId, tenantId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Party', body.customerPartyId)

    const orderNumber = await BusinessCodeGenerator.generate('sales_order', tenantId)

    // LAW-11/12: Application Service + Unit of Work
    const order = await UnitOfWork.execute(async (uow) => {
      let subtotal = 0
      let totalDiscount = 0
      let totalTax = 0

      // Create the order first
      const newOrder = await uow.tx.salesOrder.create({
        data: {
          tenantId,
          orderNumber,
          customerPartyId: body.customerPartyId,
          salesRepPartyId: body.salesRepPartyId ?? null,
          branchId: body.branchId ?? null,
          status: 'draft',
          paymentStatus: 'unpaid',
          currencyCode: body.currencyCode ?? 'IRR',
          expectedDelivery: body.expectedDelivery ? new Date(body.expectedDelivery) : null,
          notes: body.notes ?? null,
          metadata: {},
          // Totals will be calculated from lines
          subtotal: 0, discountAmount: 0, taxAmount: 0, shippingAmount: 0, totalAmount: 0,
        },
      })

      // Create lines and calculate totals
      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i]
        if (!line.productId || !line.quantityOrdered || !line.unitPrice) {
          throw new ValidationException(`Line ${i + 1} missing required fields`, [
            { field: `lines[${i}].productId`, message: 'Required', code: 'REQUIRED' },
          ])
        }

        const lineSubtotal = line.quantityOrdered * line.unitPrice
        const discountAmount = lineSubtotal * ((line.discountPercent ?? 0) / 100)
        const taxableAmount = lineSubtotal - discountAmount
        const taxAmount = taxableAmount * ((line.taxPercent ?? 0) / 100)
        const lineTotal = taxableAmount + taxAmount

        subtotal += lineSubtotal
        totalDiscount += discountAmount
        totalTax += taxAmount

        await uow.tx.salesOrderLine.create({
          data: {
            tenantId,
            salesOrderId: newOrder.id,
            lineNumber: i + 1,
            productId: line.productId,
            productInstanceId: line.productInstanceId ?? null,
            quantityOrdered: line.quantityOrdered,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            discountAmount,
            taxPercent: line.taxPercent ?? 0,
            taxAmount,
            lineTotal,
            notes: line.notes ?? null,
          },
        })
      }

      const shippingAmount = body.shippingAmount ?? 0
      const totalAmount = subtotal - totalDiscount + totalTax + shippingAmount

      // Update order totals
      const updated = await uow.tx.salesOrder.update({
        where: { id: newOrder.id },
        data: {
          subtotal,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          shippingAmount,
          totalAmount,
        },
        include: { lines: true },
      })

      // Outbox event (LAW-08: in same transaction — LAW-15: version 1.0)
      await uow.outbox.append({
        tenantId,
        aggregateType: 'SalesOrder',
        aggregateId: newOrder.id,
        eventType: 'sales_order.created',
        eventVersion: '1.0', // LAW-15
        payload: {
          orderNumber,
          customerPartyId: body.customerPartyId,
          totalAmount,
          currencyCode: body.currencyCode ?? 'IRR',
          lineCount: body.lines.length,
        },
        actorId: null,
      })

      return updated
    })

    const result = await db.salesOrder.findUnique({
      where: { id: order.id },
      include: { _count: { select: { lines: true } } },
    })

    const responseBody = JSON.stringify({ data: toDTO(result) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: "INTERNAL_ERROR", message: "Failed to create sales order", statusCode: 500 })
  }
}

function toDTO(order: any) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerPartyId: order.customerPartyId,
    salesRepPartyId: order.salesRepPartyId,
    branchId: order.branchId,
    orderDate: order.orderDate.toISOString(),
    expectedDelivery: order.expectedDelivery?.toISOString() ?? null,
    actualDelivery: order.actualDelivery?.toISOString() ?? null,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    discountAmount: order.discountAmount,
    taxAmount: order.taxAmount,
    shippingAmount: order.shippingAmount,
    totalAmount: order.totalAmount,
    currencyCode: order.currencyCode,
    notes: order.notes,
    version: order.version, // LAW-07
    lineCount: order._count?.lines ?? 0,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  }
}