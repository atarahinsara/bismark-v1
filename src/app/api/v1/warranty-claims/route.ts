import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse, parseQueryParams } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

export async function GET(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'warranty.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) }
    const [claims, total] = await Promise.all([
      db.warrantyClaim.findMany({ where, orderBy: { claimDate: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.warrantyClaim.count({ where }),
    ])
    return jsonResponse({ data: claims.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list claims', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.warrantyCardId) throw new ValidationException('Warranty card is required', [{ field: 'warrantyCardId', message: 'Required', code: 'REQUIRED' }])
    if (!body.description) throw new ValidationException('Description is required', [{ field: 'description', message: 'Required', code: 'REQUIRED' }])

    const card = await db.warrantyCard.findFirst({ where: { id: body.warrantyCardId, tenantId, deletedAt: null } })
    if (!card) throw new NotFoundException('WarrantyCard', body.warrantyCardId)
    if (card.status !== 'active') throw new ValidationException('Warranty card must be active', [{ field: 'status', message: `Current: ${card.status}`, code: 'INVALID_STATE' }])

    const claimNumber = await BusinessCodeGenerator.generate('warranty_claim', tenantId)

    const claim = await UnitOfWork.execute(async (uow) => {
      const newClaim = await uow.tx.warrantyClaim.create({
        data: {
          tenantId, claimNumber,
          warrantyCardId: body.warrantyCardId,
          productInstanceId: card.productInstanceId,
          customerPartyId: card.customerPartyId,
          claimType: body.claimType ?? 'defect',
          description: body.description,
          defectDescription: body.defectDescription ?? null,
          status: 'submitted', // starts as submitted
          currencyCode: 'IRR',
          metadata: {},
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'WarrantyClaim', aggregateId: newClaim.id,
        eventType: 'warranty.claim.submitted', eventVersion: '1.0',
        payload: { claimNumber, warrantyCardId: body.warrantyCardId, productInstanceId: card.productInstanceId },
        actorId: null,
      })
      return newClaim
    })

    const response = jsonResponse({ data: toDTO(claim) }, 201)
    await IdempotencyHelper.store(request, await response.clone().text(), 201)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create claim', statusCode: 500 })
  }
}

function toDTO(c: any) {
  return {
    id: c.id, claimNumber: c.claimNumber, warrantyCardId: c.warrantyCardId,
    productInstanceId: c.productInstanceId, customerPartyId: c.customerPartyId,
    claimType: c.claimType, claimDate: c.claimDate.toISOString(),
    description: c.description, status: c.status,
    isInspected: c.isInspected, defectType: c.defectType, defectSeverity: c.defectSeverity,
    isCovered: c.isCovered, inspectionNotes: c.inspectionNotes,
    approvedAt: c.approvedAt?.toISOString() ?? null, rejectedAt: c.rejectedAt?.toISOString() ?? null,
    serviceOrderId: c.serviceOrderId, version: c.version,
    estimatedCost: c.estimatedCost, actualCost: c.actualCost,
    createdAt: c.createdAt.toISOString(),
  }
}
