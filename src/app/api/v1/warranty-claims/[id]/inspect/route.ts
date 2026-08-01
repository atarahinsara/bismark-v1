import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/warranty-claims/{id}/inspect
 * Record physical inspection (LAW-29: required before approval).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'warranty.claim_approve')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    const claim = await db.warrantyClaim.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!claim) throw new NotFoundException('WarrantyClaim', params.id)
    if (claim.status !== 'submitted' && claim.status !== 'inspection') {
      throw new ValidationException('Claim must be submitted to inspect', [{ field: 'status', message: `Current: ${claim.status}`, code: 'INVALID_STATE' }])
    }

    if (!body.defectType || !body.defectSeverity) throw new ValidationException('Defect type and severity required (LAW-29)', [
      { field: 'defectType', message: 'Required', code: 'REQUIRED' },
      { field: 'defectSeverity', message: 'Required', code: 'REQUIRED' },
    ])

    await UnitOfWork.execute(async (uow) => {
      await uow.tx.warrantyClaim.updateMany({
        where: { id: claim.id, version: claim.version },
        data: {
          status: 'inspection',
          defectType: body.defectType,
          defectSeverity: body.defectSeverity,
          isCovered: body.isCovered ?? true,
          inspectionNotes: body.inspectionNotes ?? null,
          inspectedBy: body.inspectedBy ?? null,
          inspectedAt: new Date(),
          isInspected: true, // LAW-29
          version: { increment: 1 },
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'WarrantyClaim', aggregateId: claim.id,
        eventType: 'warranty.claim.inspected', eventVersion: '1.0',
        payload: { claimNumber: claim.claimNumber, defectType: body.defectType, defectSeverity: body.defectSeverity, isCovered: body.isCovered ?? true },
        actorId: body.inspectedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { id: claim.id, status: 'inspection', isInspected: true, message: 'Inspection recorded (LAW-29). Claim can now be approved.' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to inspect claim', statusCode: 500 })
  }
}
