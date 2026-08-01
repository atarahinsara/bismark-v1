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
    await requirePermission(ctx, 'service.read')

    const tenantId = await getTenantId()
    const params = parseQueryParams(request)
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const where = { tenantId, deletedAt: null, ...(status ? { status } : {}) }
    const [reqs, total] = await Promise.all([
      db.serviceRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.serviceRequest.count({ where }),
    ])
    return jsonResponse({ data: reqs.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list service requests', statusCode: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.customerPartyId) throw new ValidationException('Customer is required', [{ field: 'customerPartyId', message: 'Required', code: 'REQUIRED' }])
    if (!body.customerProblem) throw new ValidationException('Problem description is required', [{ field: 'customerProblem', message: 'Required', code: 'REQUIRED' }])

    const requestNumber = await BusinessCodeGenerator.generate('service_request', tenantId)

    const req = await UnitOfWork.execute(async (uow) => {
      const newReq = await uow.tx.serviceRequest.create({
        data: {
          tenantId, requestNumber,
          customerPartyId: body.customerPartyId,
          productInstanceId: body.productInstanceId ?? null,
          warrantyCardId: body.warrantyCardId ?? null,
          warrantyClaimId: body.warrantyClaimId ?? null,
          serviceCenterId: body.serviceCenterId ?? null,
          serviceKind: body.serviceKind ?? 'warranty',
          priority: body.priority ?? 'normal',
          status: 'submitted',
          customerProblem: body.customerProblem,
          customerDescription: body.customerDescription ?? null,
          reportedDefect: body.reportedDefect ?? null,
          deviceInfo: body.deviceInfo ?? null,
          customerConsent: body.customerConsent ?? false,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceRequest', aggregateId: newReq.id,
        eventType: 'service_request.created', eventVersion: '1.0',
        payload: { requestNumber, customerPartyId: body.customerPartyId, serviceKind: body.serviceKind ?? 'warranty' },
        actorId: null,
      })
      return newReq
    })

    const responseBody = JSON.stringify({ data: toDTO(req) })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create service request', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, requestNumber: r.requestNumber,
    customerPartyId: r.customerPartyId, productInstanceId: r.productInstanceId,
    warrantyCardId: r.warrantyCardId, warrantyClaimId: r.warrantyClaimId,
    serviceCenterId: r.serviceCenterId, serviceKind: r.serviceKind,
    priority: r.priority, status: r.status,
    customerProblem: r.customerProblem, customerDescription: r.customerDescription,
    reportedDefect: r.reportedDefect,
    serviceOrderId: r.serviceOrderId, version: r.version,
    createdAt: r.createdAt.toISOString(),
  }
}