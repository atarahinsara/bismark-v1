import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const where = { tenantId, deletedAt: null }
    const [refunds, total] = await Promise.all([
      db.refund.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.refund.count({ where }),
    ])
    return jsonResponse({ data: refunds.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list refunds', statusCode: 500 })
  }
}

/**
 * POST /api/v1/refunds
 * LAW-23: Refund Requires Approved Return
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.returnOrderId) throw new ValidationException('Return order is required (LAW-23)', [
      { field: 'returnOrderId', message: 'Required', code: 'REQUIRED' },
    ])

    // LAW-23: Verify return is approved
    const ret = await db.returnOrder.findFirst({ where: { id: body.returnOrderId, tenantId, deletedAt: null } })
    if (!ret) throw new NotFoundException('ReturnOrder', body.returnOrderId)
    if (ret.status !== 'approved' && ret.status !== 'received' && ret.status !== 'closed') {
      throw new BusinessException(
        `Return must be approved to create refund (LAW-23). Current: ${ret.status}`,
        'RETURN_NOT_APPROVED', 422,
      )
    }

    if (!body.amount || body.amount <= 0) throw new ValidationException('Amount must be positive', [
      { field: 'amount', message: 'Must be > 0', code: 'INVALID' },
    ])

    // Check total refunds don't exceed return amount
    const existingRefunds = await db.refund.aggregate({
      where: { returnOrderId: body.returnOrderId, status: { in: ['pending', 'approved', 'completed'] } },
      _sum: { amount: true },
    })
    const totalRefunded = existingRefunds._sum.amount ?? 0
    if (totalRefunded + body.amount > ret.refundAmount) {
      throw new BusinessException(
        `Refund exceeds return amount: ${totalRefunded + body.amount} > ${ret.refundAmount}`,
        'REFUND_EXCEEDS_RETURN', 422,
      )
    }

    const refundNumber = await BusinessCodeGenerator.generate('refund', tenantId)

    const refund = await UnitOfWork.execute(async (uow) => {
      const r = await uow.tx.refund.create({
        data: {
          tenantId, refundNumber, returnOrderId: body.returnOrderId,
          customerPartyId: ret.customerPartyId, amount: body.amount,
          currencyCode: ret.currencyCode, refundMethod: body.refundMethod ?? 'bank_transfer',
          status: 'pending', referenceNumber: body.referenceNumber ?? null,
          notes: body.notes ?? null, metadata: {},
        },
      })
      await uow.outbox.append({
        tenantId, aggregateType: 'Refund', aggregateId: r.id,
        eventType: 'refund.created', eventVersion: '1.0',
        payload: { refundNumber, amount: body.amount, returnOrderId: body.returnOrderId },
        actorId: null,
      })
      return r
    })

    const response = jsonResponse({ data: toDTO(refund) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create refund', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, refundNumber: r.refundNumber, returnOrderId: r.returnOrderId,
    customerPartyId: r.customerPartyId, refundDate: r.refundDate.toISOString(),
    amount: r.amount, currencyCode: r.currencyCode, refundMethod: r.refundMethod,
    status: r.status, referenceNumber: r.referenceNumber, version: r.version,
    approvedAt: r.approvedAt?.toISOString() ?? null, completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }
}
