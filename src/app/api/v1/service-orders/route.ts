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
    const [orders, total] = await Promise.all([
      db.serviceOrder.findMany({ where, include: { _count: { select: { lines: true, parts: true, diagnoses: true, qcChecks: true } } }, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.perPage, take: params.perPage }),
      db.serviceOrder.count({ where }),
    ])
    return jsonResponse({ data: orders.map(toDTO), meta: { page: params.page, per_page: params.perPage, total, last_page: Math.ceil(total / params.perPage) || 1 } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list service orders', statusCode: 500 })
  }
}

function toDTO(o: any) {
  return {
    id: o.id, orderNumber: o.orderNumber, serviceRequestId: o.serviceRequestId,
    customerPartyId: o.customerPartyId, productInstanceId: o.productInstanceId,
    warrantyCardId: o.warrantyCardId, serviceKind: o.serviceKind, status: o.status,
    assignedTechnicianId: o.assignedTechnicianId,
    laborCost: o.laborCost, partsCost: o.partsCost, totalCost: o.totalCost,
    currencyCode: o.currencyCode, version: o.version,
    lineCount: o._count?.lines ?? 0, partCount: o._count?.parts ?? 0,
    diagnosisCount: o._count?.diagnoses ?? 0, qcCount: o._count?.qcChecks ?? 0,
    createdDate: o.createdDate.toISOString(),
    deliveredDate: o.deliveredDate?.toISOString() ?? null,
  }
}
