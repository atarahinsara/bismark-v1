import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/return-orders/{id}/create-replacement
 * LAW-24: Replacement = Return + New Sales Order + New Shipment
 * Creates a new Sales Order referencing this return.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const ret = await db.returnOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!ret) throw new NotFoundException('ReturnOrder', params.id)
    if (ret.status !== 'received' && ret.status !== 'closed') {
      throw new ValidationException('Return must be received to create replacement (LAW-24)', [
        { field: 'status', message: `Current: ${ret.status}`, code: 'INVALID_STATE' },
      ])
    }

    const orderNumber = await BusinessCodeGenerator.generate('sales_order', tenantId)

    const order = await UnitOfWork.execute(async (uow) => {
      let subtotal = 0
      const newOrder = await uow.tx.salesOrder.create({
        data: {
          tenantId, orderNumber, customerPartyId: ret.customerPartyId,
          status: 'approved', paymentStatus: 'paid',
          currencyCode: ret.currencyCode,
          notes: `Replacement for return ${ret.returnNumber}`,
          metadata: { originalReturnOrderId: ret.id, isReplacement: true },
          subtotal: 0, discountAmount: 0, taxAmount: 0, shippingAmount: 0, totalAmount: 0,
        },
      })

      let lineNum = 1
      for (const retLine of ret.lines) {
        const lineTotal = retLine.quantityReturned * retLine.unitPrice
        subtotal += lineTotal
        await uow.tx.salesOrderLine.create({
          data: {
            tenantId, salesOrderId: newOrder.id, lineNumber: lineNum++,
            productId: retLine.productId, productInstanceId: retLine.productInstanceId,
            quantityOrdered: retLine.quantityReturned, unitPrice: retLine.unitPrice,
            discountPercent: 0, discountAmount: 0, taxPercent: 0, taxAmount: 0, lineTotal,
          },
        })
      }

      await uow.tx.salesOrder.update({ where: { id: newOrder.id }, data: { subtotal, totalAmount: subtotal } })

      // Link return to replacement order (LAW-24)
      await uow.tx.returnOrder.updateMany({
        where: { id: ret.id, version: ret.version },
        data: { replacementSalesOrderId: newOrder.id, version: { increment: 1 } },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ReturnOrder', aggregateId: ret.id,
        eventType: 'return_order.replacement_created', eventVersion: '1.0',
        payload: { returnNumber: ret.returnNumber, replacementOrderNumber: orderNumber },
        actorId: null,
      })

      return newOrder
    })

    const response = jsonResponse({
      data: {
        id: ret.id, returnNumber: ret.returnNumber,
        replacementSalesOrderId: order.id, replacementOrderNumber: order.orderNumber,
        message: 'Replacement Sales Order created (LAW-24). Create Shipment from this order to send replacement.',
      },
    }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create replacement', statusCode: 500 })
  }
}
