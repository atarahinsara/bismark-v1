import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const card = await db.warrantyCard.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { warrantyPolicy: true, claims: { orderBy: { claimDate: 'desc' } }, extensions: { orderBy: { activationDate: 'desc' } }, transfers: { orderBy: { transferDate: 'desc' } } },
    })
    if (!card) throw new NotFoundException('WarrantyCard', params.id)

    // Compute is_expired (NOT a stored field — LAW-05)
    const now = new Date()
    const isExpired = card.endDate ? now > card.graceEndDate : false
    const isInGrace = card.endDate && now > card.endDate && now <= card.graceEndDate

    return jsonResponse({
      data: {
        id: card.id, warrantyNumber: card.warrantyNumber,
        productInstanceId: card.productInstanceId, customerPartyId: card.customerPartyId,
        status: card.status, activationDate: card.activationDate?.toISOString() ?? null,
        startDate: card.startDate?.toISOString() ?? null,
        endDate: card.endDate?.toISOString() ?? null,
        graceEndDate: card.graceEndDate?.toISOString() ?? null,
        isExpired, isInGrace, // computed — LAW-05
        extendedMonths: card.extendedMonths, version: card.version,
        policy: card.warrantyPolicy ? {
          policyName: card.warrantyPolicy.policyName,
          warrantyType: card.warrantyPolicy.warrantyType,
          warrantyMonths: card.warrantyPolicy.warrantyMonths,
          coverageTerms: card.warrantyPolicy.coverageTerms,
        } : null,
      },
      claims: card.claims.map(c => ({ id: c.id, claimNumber: c.claimNumber, status: c.status, claimDate: c.claimDate.toISOString() })),
      extensions: card.extensions.map(e => ({ id: e.id, extensionNumber: e.extensionNumber, extensionMonths: e.extensionMonths, activationDate: e.activationDate.toISOString() })),
      transfers: card.transfers.map(t => ({ id: t.id, transferNumber: t.transferNumber, fromPartyId: t.fromPartyId, toPartyId: t.toPartyId, transferDate: t.transferDate.toISOString(), approvalStatus: t.approvalStatus })),
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch warranty card', statusCode: 500 })
  }
}
