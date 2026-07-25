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
    const customerPartyId = url.searchParams.get('customer_party_id')

    const where = { tenantId, deletedAt: null, ...(status ? { status } : {}), ...(customerPartyId ? { customerPartyId } : {}) }
    const [cards, total] = await Promise.all([
      db.warrantyCard.findMany({ where, include: { _count: { select: { claims: true, extensions: true, transfers: true } } }, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.warrantyCard.count({ where }),
    ])
    return jsonResponse({ data: cards.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list warranty cards', statusCode: 500 })
  }
}

/**
 * POST /api/v1/warranty-cards
 * Create a warranty card (status: pending — NOT active yet).
 * LAW-28: Activation only from 'shipment.delivered' event.
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.productInstanceId) throw new ValidationException('Product instance is required', [{ field: 'productInstanceId', message: 'Required', code: 'REQUIRED' }])
    if (!body.customerPartyId) throw new ValidationException('Customer is required', [{ field: 'customerPartyId', message: 'Required', code: 'REQUIRED' }])
    if (!body.warrantyPolicyId) throw new ValidationException('Warranty policy is required', [{ field: 'warrantyPolicyId', message: 'Required', code: 'REQUIRED' }])

    const policy = await db.warrantyPolicy.findFirst({ where: { id: body.warrantyPolicyId, tenantId, isActive: true, deletedAt: null } })
    if (!policy) throw new NotFoundException('WarrantyPolicy', body.warrantyPolicyId)

    const warrantyNumber = await BusinessCodeGenerator.generate('warranty_card', tenantId)

    const card = await UnitOfWork.execute(async (uow) => {
      const newCard = await uow.tx.warrantyCard.create({
        data: {
          tenantId, warrantyNumber,
          productInstanceId: body.productInstanceId,
          customerPartyId: body.customerPartyId,
          warrantyPolicyId: body.warrantyPolicyId,
          salesOrderId: body.salesOrderId ?? null,
          shipmentId: body.shipmentId ?? null,
          status: 'pending', // LAW-28: NOT active until shipment.delivered event
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'WarrantyCard', aggregateId: newCard.id,
        eventType: 'warranty_card.created', eventVersion: '1.0',
        payload: { warrantyNumber, productInstanceId: body.productInstanceId, customerPartyId: body.customerPartyId },
        actorId: null,
      })
      return newCard
    })

    const result = await db.warrantyCard.findUnique({ where: { id: card.id }, include: { _count: { select: { claims: true, extensions: true, transfers: true } } } })
    const response = jsonResponse({ data: toDTO(result) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create warranty card', statusCode: 500 })
  }
}

function toDTO(c: any) {
  return {
    id: c.id, warrantyNumber: c.warrantyNumber,
    productInstanceId: c.productInstanceId, customerPartyId: c.customerPartyId,
    warrantyPolicyId: c.warrantyPolicyId, salesOrderId: c.salesOrderId, shipmentId: c.shipmentId,
    activationDate: c.activationDate?.toISOString() ?? null,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    graceEndDate: c.graceEndDate?.toISOString() ?? null,
    status: c.status, extendedMonths: c.extendedMonths,
    notes: c.notes, version: c.version,
    claimCount: c._count?.claims ?? 0,
    extensionCount: c._count?.extensions ?? 0,
    transferCount: c._count?.transfers ?? 0,
    createdAt: c.createdAt.toISOString(),
  }
}
