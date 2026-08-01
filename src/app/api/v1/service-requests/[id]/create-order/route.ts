import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/service-requests/{id}/create-order
 * Convert a validated ServiceRequest into a ServiceOrder.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'service.create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const req = await db.serviceRequest.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!req) throw new NotFoundException('ServiceRequest', params.id)
    if (req.status !== 'submitted' && req.status !== 'validated') {
      throw new ValidationException('Request must be submitted or validated', [{ field: 'status', message: `Current: ${req.status}`, code: 'INVALID_STATE' }])
    }

    const orderNumber = await BusinessCodeGenerator.generate('service_order', tenantId)

    const order = await UnitOfWork.execute(async (uow) => {
      const newOrder = await uow.tx.serviceOrder.create({
        data: {
          tenantId, orderNumber,
          serviceRequestId: req.id,
          customerPartyId: req.customerPartyId,
          productInstanceId: req.productInstanceId,
          warrantyCardId: req.warrantyCardId,
          warrantyClaimId: req.warrantyClaimId,
          serviceCenterId: req.serviceCenterId ?? body.serviceCenterId,
          serviceKind: req.serviceKind,
          status: 'open',
          assignedTechnicianId: body.technicianId ?? null,
          notes: body.notes ?? null,
          metadata: {},
        },
      })

      // Link request to order
      await uow.tx.serviceRequest.updateMany({
        where: { id: req.id, version: req.version },
        data: { status: 'service_order', serviceOrderId: newOrder.id, version: { increment: 1 } },
      })

      // Create technician assignment if specified
      if (body.technicianId) {
        await uow.tx.technicianAssignment.create({
          data: {
            tenantId, technicianPartyId: body.technicianId,
            serviceOrderId: newOrder.id, serviceCenterId: req.serviceCenterId ?? null,
            assignmentType: 'primary', status: 'active',
            assignedBy: body.assignedBy ?? null,
          },
        })
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'ServiceOrder', aggregateId: newOrder.id,
        eventType: 'service_order.created', eventVersion: '1.0',
        payload: { orderNumber, serviceRequestId: req.id, customerPartyId: req.customerPartyId },
        actorId: body.assignedBy ?? null,
      })
      return newOrder
    })

    const responseBody = JSON.stringify({ data: { id: order.id, orderNumber: order.orderNumber, status: 'open', message: 'Service order created from request.' } })

    await IdempotencyHelper.store(request, responseBody, 201, JSON.stringify(body || {}))
    return new Response(responseBody, { status: 201, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create service order', statusCode: 500 })
  }
}