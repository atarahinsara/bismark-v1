import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * GET /api/v1/invoices/{id}
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const tenantId = await getTenantId()
    const invoice = await db.invoice.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: { orderBy: { lineNumber: 'asc' } }, allocations: true },
    })
    if (!invoice) throw new NotFoundException('Invoice', params.id)

    const balanceDue = invoice.totalAmount - invoice.paidAmount
    return jsonResponse({
      data: { ...toDTO(invoice), balanceDue },
      lines: invoice.lines.map(lineToDTO),
      allocations: invoice.allocations.map(a => ({
        id: a.id, paymentId: a.paymentId, allocatedAmount: a.allocatedAmount,
        allocatedAt: a.allocatedAt.toISOString(),
      })),
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch invoice', statusCode: 500 })
  }
}

function toDTO(inv: any) {
  return {
    id: inv.id, invoiceNumber: inv.invoiceNumber, salesOrderId: inv.salesOrderId,
    customerPartyId: inv.customerPartyId, status: inv.status, version: inv.version,
    subtotal: inv.subtotal, discountAmount: inv.discountAmount, taxAmount: inv.taxAmount,
    shippingAmount: inv.shippingAmount, totalAmount: inv.totalAmount, paidAmount: inv.paidAmount,
    currencyCode: inv.currencyCode, taxInvoiceNumber: inv.taxInvoiceNumber,
    invoiceDate: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate?.toISOString() ?? null,
    issuedAt: inv.issuedAt?.toISOString() ?? null,
    notes: inv.notes,
  }
}

function lineToDTO(l: any) {
  return {
    id: l.id, lineNumber: l.lineNumber, productId: l.productId,
    productInstanceId: l.productInstanceId, quantity: l.quantity,
    unitPrice: l.unitPrice, discountAmount: l.discountAmount,
    taxAmount: l.taxAmount, lineTotal: l.lineTotal,
  }
}
