import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/warranty-claims/{id}/approve
 * LAW-29: Claim must be inspected before approval.
 * Publishes 'warranty.claim.approved' — Service context listens to create Service Order.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'warranty.claim_approve')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const claim = await db.warrantyClaim.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!claim) throw new NotFoundException('WarrantyClaim', params.id)

    // LAW-29: Must be inspected first
    if (!claim.isInspected) {
      throw new ValidationException('Claim must be inspected before approval (LAW-29)', [
        { field: 'isInspected', message: 'Inspection required', code: 'NOT_INSPECTED' },
      ])
    }
    if (claim.status !== 'inspection') {
      throw new ValidationException('Claim must be in inspection status', [{ field: 'status', message: `Current: ${claim.status}`, code: 'INVALID_STATE' }])
    }

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.warrantyClaim.updateMany({
        where: { id: claim.id, version: claim.version },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: body.approvedBy ?? null,
          approvalNotes: body.approvalNotes ?? null,
          estimatedCost: body.estimatedCost ?? null,
          version: { increment: 1 },
        },
      })

      // Publish event — Service context will create Service Order (LAW-25: async)
      await uow.outbox.append({
        tenantId, aggregateType: 'WarrantyClaim', aggregateId: claim.id,
        eventType: 'warranty.claim.approved', eventVersion: '1.0',
        payload: {
          claimNumber: claim.claimNumber,
          warrantyCardId: claim.warrantyCardId,
          productInstanceId: claim.productInstanceId,
          customerPartyId: claim.customerPartyId,
          defectType: claim.defectType,
          defectSeverity: claim.defectSeverity,
          estimatedCost: body.estimatedCost ?? null,
        },
        actorId: body.approvedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: { id: claim.id, claimNumber: claim.claimNumber, status: 'approved', message: 'Claim approved. Service context will create Service Order via event (LAW-25).' },
    })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to approve claim', statusCode: 500 })
  }
}
