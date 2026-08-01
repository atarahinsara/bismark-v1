import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/invoices
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'invoice.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const customerPartyId = url.searchParams.get('customer_party_id')

    const where = {
      tenantId, deletedAt: null,
      ...(status ? { status } : {}),
      ...(customerPartyId ? { customerPartyId } : {}),
    }

    const [invoices, total] = await Promise.all([
      db.invoice.findMany({
        where, include: { _count: { select: { lines: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.invoice.count({ where }),
    ])

    return jsonResponse({
      data: invoices.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list invoices', statusCode: 500 })
  }
}

/**
 * POST /api/v1/invoices
 * Create invoice from sales order (Idempotent — LAW-06).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'invoice.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.salesOrderId) throw new ValidationException('Sales order is required', [
      { field: 'salesOrderId', message: 'Required', code: 'REQUIRED' },
    ])

    const order = await db.salesOrder.findFirst({
      where: { id: body.salesOrderId, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!order) throw new NotFoundException('SalesOrder', body.salesOrderId)
    if (order.status !== 'approved' && order.status !== 'shipped' && order.status !== 'partially_shipped' && order.status !== 'completed') {
      throw new ValidationException('Sales order must be approved/shipped to invoice', [
        { field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' },
      ])
    }

    const invoiceNumber = await BusinessCodeGenerator.generate('sales_invoice', tenantId)

    const invoice = await UnitOfWork.execute(async (uow) => {
      const newInvoice = await uow.tx.invoice.create({
        data: {
          tenantId,
          invoiceNumber,
          salesOrderId: body.salesOrderId,
          customerPartyId: order.customerPartyId,
          status: 'draft',
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          shippingAmount: order.shippingAmount,
          totalAmount: order.totalAmount,
          currencyCode: order.currencyCode,
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      // Create invoice lines from sales order lines
      let lineNum = 1
      for (const orderLine of order.lines) {
        const lineSubtotal = orderLine.quantityOrdered * orderLine.unitPrice
        const lineTotal = lineSubtotal - orderLine.discountAmount + orderLine.taxAmount
        await uow.tx.invoiceLine.create({
          data: {
            tenantId,
            invoiceId: newInvoice.id,
            salesOrderLineId: orderLine.id,
            lineNumber: lineNum++,
            productId: orderLine.productId,
            productInstanceId: orderLine.productInstanceId,
            quantity: orderLine.quantityOrdered,
            unitPrice: orderLine.unitPrice,
            discountAmount: orderLine.discountAmount,
            taxAmount: orderLine.taxAmount,
            lineTotal,
          },
        })
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'Invoice', aggregateId: newInvoice.id,
        eventType: 'invoice.created', eventVersion: '1.0',
        payload: { invoiceNumber, salesOrderId: body.salesOrderId, totalAmount: order.totalAmount },
        actorId: null,
      })

      return newInvoice
    })

    const result = await db.invoice.findUnique({
      where: { id: invoice.id },
      include: { _count: { select: { lines: true } } },
    })

    const response = jsonResponse({ data: toDTO(result) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create invoice', statusCode: 500 })
  }
}

function toDTO(inv: any) {
  const balanceDue = inv.totalAmount - inv.paidAmount
  return {
    id: inv.id, invoiceNumber: inv.invoiceNumber, salesOrderId: inv.salesOrderId,
    customerPartyId: inv.customerPartyId,
    invoiceDate: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    status: inv.status,
    subtotal: inv.subtotal, discountAmount: inv.discountAmount,
    taxAmount: inv.taxAmount, shippingAmount: inv.shippingAmount,
    totalAmount: inv.totalAmount, paidAmount: inv.paidAmount,
    balanceDue, // computed — LAW-05
    currencyCode: inv.currencyCode, taxInvoiceNumber: inv.taxInvoiceNumber,
    notes: inv.notes, version: inv.version,
    issuedAt: inv.issuedAt?.toISOString() ?? null,
    lineCount: inv._count?.lines ?? 0,
    createdAt: inv.createdAt.toISOString(), updatedAt: inv.updatedAt.toISOString(),
  }
}
