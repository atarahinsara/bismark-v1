import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'return.read')

    const tenantId = await getTenantId()
    const ret = await db.returnOrder.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: { orderBy: { lineNumber: 'asc' } }, refunds: true },
    })
    if (!ret) throw new NotFoundException('ReturnOrder', params.id)
    return jsonResponse({ data: toDTO(ret), lines: ret.lines.map(lineToDTO), refunds: ret.refunds.map(r => ({ id: r.id, refundNumber: r.refundNumber, amount: r.amount, status: r.status })) })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch return', statusCode: 500 })
  }
}

function toDTO(r: any) {
  return {
    id: r.id, returnNumber: r.returnNumber, salesOrderId: r.salesOrderId, invoiceId: r.invoiceId,
    customerPartyId: r.customerPartyId, returnType: r.returnType, status: r.status,
    refundAmount: r.refundAmount, currencyCode: r.currencyCode, version: r.version,
    returnDate: r.returnDate.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null, receivedAt: r.receivedAt?.toISOString() ?? null,
    reason: r.reason, replacementSalesOrderId: r.replacementSalesOrderId,
  }
}

function lineToDTO(l: any) {
  return {
    id: l.id, lineNumber: l.lineNumber, productId: l.productId,
    productInstanceId: l.productInstanceId, quantityReturned: l.quantityReturned,
    unitPrice: l.unitPrice, lineTotal: l.lineTotal, returnReason: l.returnReason,
    isInspected: l.isInspected, inspectedCondition: l.inspectedCondition,
    inspectionNotes: l.inspectionNotes, inspectedAt: l.inspectedAt?.toISOString() ?? null,
  }
}
