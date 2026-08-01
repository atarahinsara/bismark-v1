import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * POST /api/v1/tax/post
 * LAW-44: Every Tax Posting Must Produce Independent Journal Entries.
 *
 * Creates:
 *   1. TaxCalculation record (snapshot — LAW-43)
 *   2. Independent Journal Entry (LAW-44): Debit AR, Credit VAT Payable
 *   3. TaxPosting record linking JE to TaxCalculation
 *
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12). LAW-35: balanced. LAW-36: period check.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_post')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.taxCodeId) throw new ValidationException('Tax code required', [{ field: 'taxCodeId', message: 'Required', code: 'REQUIRED' }])
    if (!body.taxableAmount || body.taxableAmount <= 0) throw new ValidationException('Taxable amount must be positive', [{ field: 'taxableAmount', message: 'Must be > 0', code: 'INVALID' }])
    if (!body.documentType || !body.documentId) throw new ValidationException('Document type and ID required', [{ field: 'documentType', message: 'Required', code: 'REQUIRED' }])

    const taxCode = await db.taxCode.findFirst({ where: { id: body.taxCodeId, tenantId, isActive: true } })
    if (!taxCode) throw new NotFoundException('TaxCode', body.taxCodeId)

    const entryDate = body.entryDate ? new Date(body.entryDate) : new Date()

    // LAW-36: Check fiscal period
    const fiscalPeriod = await db.fiscalPeriod.findFirst({ where: { tenantId, startDate: { lte: entryDate }, endDate: { gte: entryDate } } })
    if (fiscalPeriod && fiscalPeriod.status === 'closed') {
      throw new BusinessException(`Fiscal period ${fiscalPeriod.periodCode} is closed (LAW-36)`, 'FISCAL_PERIOD_CLOSED', 422)
    }

    // LAW-45: Find effective rule
    const rules = await db.taxRule.findMany({
      where: { tenantId, taxCodeId: body.taxCodeId, isActive: true, deletedAt: null, effectiveFrom: { lte: entryDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: entryDate } }] },
      orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }],
    })
    let effectiveRule = rules.find((r) => r.productCategoryId === body.productCategoryId)
    if (!effectiveRule) effectiveRule = rules.find((r) => r.productCategoryId === null)
    if (!effectiveRule && rules.length > 0) effectiveRule = rules[0]

    // LAW-43: Calculate tax
    const effectiveRate = effectiveRule?.rateOverride ?? taxCode.ratePercent
    const taxRate = effectiveRate / 100
    const taxAmount = body.taxableAmount * taxRate

    if (taxAmount <= 0) {
      const response = jsonResponse({ data: { taxAmount: 0, message: 'Tax amount is zero — no posting required.' } })
      const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
      return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
    }

    const entryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)

    await UnitOfWork.execute(async (uow) => {
      // 1. Create TaxCalculation (snapshot — LAW-43)
      const calc = await uow.tx.taxCalculation.create({
        data: {
          tenantId,
          documentType: body.documentType,
          documentId: body.documentId,
          taxCodeId: body.taxCodeId,
          taxRuleId: effectiveRule?.id ?? 'no-rule',
          taxableAmount: body.taxableAmount,
          taxRate: effectiveRate,
          taxAmount,
          currencyCode: body.currencyCode ?? 'IRR',
          snapshot: {
            taxCode: taxCode.code,
            taxType: taxCode.taxType,
            ratePercent: taxCode.ratePercent,
            effectiveRate,
            ruleName: effectiveRule?.name ?? 'default',
            formula: effectiveRule?.formula ?? 'rate * taxableAmount',
            productCategoryId: body.productCategoryId ?? null,
            calculationDate: entryDate.toISOString(),
          },
        },
      })

      // 2. LAW-44: Create independent Journal Entry for tax
      // Find accounts: AR (debit) and VAT Payable (credit)
      const arAccount = await uow.tx.chartOfAccount.findFirst({ where: { tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } } })
      const vatPayableAccount = taxCode.outputAccountId
        ? await uow.tx.chartOfAccount.findFirst({ where: { id: taxCode.outputAccountId, tenantId } })
        : await uow.tx.chartOfAccount.findFirst({ where: { tenantId, accountType: 'liability', accountCode: { contains: 'VAT' } } })

      if (!arAccount || !vatPayableAccount) {
        throw new BusinessException('AR or VAT Payable account not found', 'ACCOUNT_NOT_FOUND', 422)
      }

      const taxJE = await uow.tx.journalEntry.create({
        data: {
          tenantId, entryNumber, entryDate,
          fiscalPeriodId: fiscalPeriod?.id ?? null,
          description: `Tax Posting: ${taxCode.code} for ${body.documentType} ${body.documentId}`,
          sourceType: 'tax_posting', sourceId: body.documentId,
          status: 'posted', postedAt: new Date(), postedBy: 'tax-engine',
          totalDebit: taxAmount, totalCredit: taxAmount, // LAW-35: balanced
          metadata: { taxCalculationId: calc.id, taxCodeId: body.taxCodeId },
        },
      })

      // Debit AR
      await uow.tx.journalEntryLine.create({
        data: { tenantId, journalEntryId: taxJE.id, lineNumber: 1, accountId: arAccount.id, partyId: body.customerPartyId ?? null, debitAmount: taxAmount, creditAmount: 0, description: `Tax AR - ${taxCode.code}` },
      })

      // Credit VAT Payable
      await uow.tx.journalEntryLine.create({
        data: { tenantId, journalEntryId: taxJE.id, lineNumber: 2, accountId: vatPayableAccount.id, debitAmount: 0, creditAmount: taxAmount, description: `VAT Payable - ${taxCode.code}` },
      })

      // 3. Create TaxPosting link
      await uow.tx.taxPosting.create({
        data: { tenantId, journalEntryId: taxJE.id, taxCalculationId: calc.id },
      })

      // Outbox events
      await uow.outbox.append({
        tenantId, aggregateType: 'TaxCalculation', aggregateId: calc.id,
        eventType: 'tax.calculated', eventVersion: '1.0',
        payload: { taxCodeId: body.taxCodeId, taxableAmount: body.taxableAmount, taxAmount, documentType: body.documentType, documentId: body.documentId },
        actorId: null,
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: taxJE.id,
        eventType: 'tax.posted', eventVersion: '1.0',
        payload: { entryNumber, taxCalculationId: calc.id, taxAmount, taxCode: taxCode.code },
        actorId: null,
      })
    })

    const response = jsonResponse({
      data: {
        entryNumber, taxAmount, taxRate: effectiveRate,
        taxCode: taxCode.code, documentType: body.documentType, documentId: body.documentId,
        message: `Tax posted: independent JE ${entryNumber} created (LAW-44). Debit AR, Credit VAT Payable. Amount: ${taxAmount}.`,
      },
    })

    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to post tax', statusCode: 500 })
  }
}
