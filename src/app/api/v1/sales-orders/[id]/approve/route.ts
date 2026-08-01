import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'

interface Params { params: { id: string } }

/**
 * POST /api/v1/sales-orders/{id}/approve
 * Approve sales order — transitions draft → pending_approval → approved.
 * Requires: sales.approve
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'sales.approve')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const order = await db.salesOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
    })
    if (!order) throw new NotFoundException('SalesOrder', params.id)

    if (order.status !== 'draft' && order.status !== 'pending_approval') {
      throw new ValidationException('Order must be draft or pending_approval to approve', [
        { field: 'status', message: `Current: ${order.status}`, code: 'INVALID_STATE' },
      ])
    }

    // LAW-11/12: Application Service + Unit of Work
    await UnitOfWork.execute(async (uow) => {
      // LAW-07: Optimistic Lock
      const result = await uow.tx.salesOrder.updateMany({
        where: { id: order.id, version: order.version },
        data: {
          status: 'approved',
          version: { increment: 1 },
        },
      })

      if (result.count === 0) {
        throw new DomainException('Optimistic lock conflict', 'OPTIMISTIC_LOCK_FAILED', 409)
      }

      // Outbox event (LAW-08, LAW-15)
      // Financial Context will consume this to create Journal Entry (LAW-13)
      // Inventory Context will consume this to reserve stock
      await uow.outbox.append({
        tenantId,
        aggregateType: 'SalesOrder',
        aggregateId: order.id,
        eventType: 'sales_order.approved',
        eventVersion: '1.0', // LAW-15
        payload: {
          orderNumber: order.orderNumber,
          customerPartyId: order.customerPartyId,
          totalAmount: order.totalAmount,
          currencyCode: order.currencyCode,
        },
        actorId: body.approvedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: 'approved',
        message: 'Order approved. Financial and Inventory will be notified via events.',
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve sales order', statusCode: 500 })
  }
}
