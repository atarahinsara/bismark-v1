import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/tax/reports/vat
 * VAT Report: summary of all tax calculations for VAT-type tax codes.
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')

    const calculations = await db.taxCalculation.findMany({
      where: {
        tenantId,
        ...(fromDate || toDate ? {
          calculationDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        } : {}),
      },
      include: { taxCode: true },
    })

    const vatCalcs = calculations.filter((c) => c.taxCode.taxType === 'vat')

    const summary = {
      totalTaxableAmount: vatCalcs.reduce((s, c) => s + c.taxableAmount, 0),
      totalTaxAmount: vatCalcs.reduce((s, c) => s + c.taxAmount, 0),
      calculationCount: vatCalcs.length,
      byTaxCode: {} as Record<string, { taxableAmount: number; taxAmount: number; count: number }>,
    }

    for (const calc of vatCalcs) {
      const key = calc.taxCode.code
      if (!summary.byTaxCode[key]) summary.byTaxCode[key] = { taxableAmount: 0, taxAmount: 0, count: 0 }
      summary.byTaxCode[key].taxableAmount += calc.taxableAmount
      summary.byTaxCode[key].taxAmount += calc.taxAmount
      summary.byTaxCode[key].count++
    }

    return jsonResponse({
      data: {
        reportType: 'vat',
        period: { fromDate, toDate },
        summary,
        details: vatCalcs.map((c) => ({
          id: c.id, documentType: c.documentType, documentId: c.documentId,
          taxCode: c.taxCode.code, taxableAmount: c.taxableAmount, taxRate: c.taxRate,
          taxAmount: c.taxAmount, calculationDate: c.calculationDate.toISOString(),
        })),
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to generate VAT report', statusCode: 500 })
  }
}
