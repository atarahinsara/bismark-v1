import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) }
    const [returns, total] = await Promise.all([
      db.returnOrder.findMany({ where, include: { _count: { select: { lines: true, refunds: true } } }, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.returnOrder.count({ where }),
    ])
    return jsonResponse({ data: returns.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list returns', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.customerPartyId) throw new ValidationException('Customer is required', [{ field: 'customerPartyId', message: 'Required', code: 'REQUIRED' }])
    if (!body.lines?.length) throw new ValidationException('At least one line required', [{ field: 'lines', message: 'Required', code: 'REQUIRED' }])

    const returnNumber = await BusinessCodeGenerator.generate('return_order', tenantId)

    const ret = await UnitOfWork.execute(async (uow) => {
      let totalAmount = 0
      const newReturn = await uow.tx.returnOrder.create({
        data: {
          tenantId, returnNumber,
          salesOrderId: body.salesOrderId ?? null,
          invoiceId: body.invoiceId ?? null,
          customerPartyId: body.customerPartyId,
          returnType: body.returnType ?? 'refund',
          status: 'draft',
          reason: body.reason ?? null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      for (let i = 0; i < body.lines.length; i++) {
        const line = body.lines[i]
        const lineTotal = line.quantityReturned * line.unitPrice
        totalAmount += lineTotal
        await uow.tx.returnOrderLine.create({
          data: {
            tenantId, returnOrderId: newReturn.id, lineNumber: i + 1,
            productId: line.productId, productInstanceId: line.productInstanceId ?? null,
            quantityReturned: line.quantityReturned, unitPrice: line.unitPrice,
            lineTotal, returnReason: line.returnReason ?? null,
          },
        })
      }

      await uow.tx.returnOrder.update({ where: { id: newReturn.id }, data: { refundAmount: totalAmount } })

      await uow.outbox.append({
        tenantId, aggregateType: 'ReturnOrder', aggregateId: newReturn.id,
        eventType: 'return_order.created', eventVersion: '1.0',
        payload: { returnNumber, customerPartyId: body.customerPartyId, totalAmount },
        actorId: null,
      })
      return newReturn
    })

    const result = await db.returnOrder.findUnique({ where: { id: ret.id }, include: { _count: { select: { lines: true, refunds: true } } } })
    const response = jsonResponse({ data: toDTO(result) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create return', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, returnNumber: r.returnNumber, salesOrderId: r.salesOrderId, invoiceId: r.invoiceId,
    customerPartyId: r.customerPartyId, returnType: r.returnType, status: r.status,
    returnDate: r.returnDate.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    receivedAt: r.receivedAt?.toISOString() ?? null,
    closedAt: r.closedAt?.toISOString() ?? null,
    refundAmount: r.refundAmount, currencyCode: r.currencyCode,
    reason: r.reason, notes: r.notes, version: r.version,
    replacementSalesOrderId: r.replacementSalesOrderId,
    lineCount: r._count?.lines ?? 0, refundCount: r._count?.refunds ?? 0,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  }
}
