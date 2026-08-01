import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * GET /api/v1/payments
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'payment.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) }

    const [payments, total] = await Promise.all([
      db.payment.findMany({
        where, include: { _count: { select: { allocations: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.perPage, take: params.perPage,
      }),
      db.payment.count({ where }),
    ])

    return jsonResponse({
      data: payments.map(toDTO),
      meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list payments', statusCode: 500 })
  }
}

/**
 * POST /api/v1/payments
 * Create a payment (status: pending — LAW-20: must be allocated to complete).
 * Idempotent (LAW-06).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'payment.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.customerPartyId) throw new ValidationException('Customer is required', [
      { field: 'customerPartyId', message: 'Required', code: 'REQUIRED' },
    ])
    if (!body.amount || body.amount <= 0) throw new ValidationException('Amount must be positive', [
      { field: 'amount', message: 'Must be > 0', code: 'INVALID' },
    ])

    const paymentNumber = await BusinessCodeGenerator.generate('payment', tenantId)

    const payment = await UnitOfWork.execute(async (uow) => {
      const p = await uow.tx.payment.create({
        data: {
          tenantId,
          paymentNumber,
          customerPartyId: body.customerPartyId,
          amount: body.amount,
          currencyCode: body.currencyCode ?? 'IRR',
          paymentMethod: body.paymentMethod ?? 'cash',
          status: 'pending', // LAW-20: pending until allocated
          referenceNumber: body.referenceNumber ?? null,
          bankAccount: body.bankAccount ?? null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'Payment', aggregateId: p.id,
        eventType: 'payment.created', eventVersion: '1.0',
        payload: { paymentNumber, amount: body.amount, customerPartyId: body.customerPartyId },
        actorId: null,
      })

      return p
    })

    const result = await db.payment.findUnique({
      where: { id: payment.id },
      include: { _count: { select: { allocations: true } } },
    })

    const response = jsonResponse({ data: toDTO(result) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create payment', statusCode: 500 })
  }
}

function toDTO(p: any) {
  return {
    id: p.id, paymentNumber: p.paymentNumber, customerPartyId: p.customerPartyId,
    paymentDate: p.paymentDate.toISOString(), amount: p.amount,
    currencyCode: p.currencyCode, paymentMethod: p.paymentMethod,
    status: p.status, referenceNumber: p.referenceNumber, bankAccount: p.bankAccount,
    version: p.version,
    allocationCount: p._count?.allocations ?? 0,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
  }
}
