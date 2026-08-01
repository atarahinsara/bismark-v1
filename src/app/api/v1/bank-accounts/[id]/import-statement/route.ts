/**
 * POST /api/v1/bank-accounts/[id]/import-statement
 *
 * T-3-05: Import bank statement transactions.
 *
 * Accepts array of transactions:
 *   [{ transactionDate, amount, description, referenceNumber?, checkNumber? }]
 *
 * Each transaction is stored with status='imported'.
 * Matching happens during reconciliation.
 *
 * Requires: financial.journal_create
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'financial.journal_create')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: bankAccountId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    // Find bank account
    const bankAccount = await db.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId, isActive: true },
    })
    if (!bankAccount) throw new NotFoundException('BankAccount', bankAccountId)

    // Validate transactions array
    if (!Array.isArray(body.transactions)) {
      throw new ValidationException('transactions must be an array', [
        { field: 'transactions', message: 'Array required', code: 'INVALID_TYPE' },
      ])
    }

    if (body.transactions.length === 0) {
      throw new ValidationException('transactions cannot be empty', [
        { field: 'transactions', message: 'At least one transaction required', code: 'EMPTY' },
      ])
    }

    // Validate each transaction
    for (let i = 0; i < body.transactions.length; i++) {
      const t = body.transactions[i]
      if (!t.transactionDate) {
        throw new ValidationException(`Transaction ${i}: date required`, [
          { field: `transactions[${i}].transactionDate`, message: 'Required', code: 'REQUIRED' },
        ])
      }
      if (typeof t.amount !== 'number' || t.amount === 0) {
        throw new ValidationException(`Transaction ${i}: amount must be non-zero number`, [
          { field: `transactions[${i}].amount`, message: 'Non-zero number required', code: 'INVALID' },
        ])
      }
      if (!t.description) {
        throw new ValidationException(`Transaction ${i}: description required`, [
          { field: `transactions[${i}].description`, message: 'Required', code: 'REQUIRED' },
        ])
      }
    }

    // Create transactions
    const created = await db.$transaction(async (tx) => {
      const txns = []
      for (const t of body.transactions) {
        const txn = await tx.bankTransaction.create({
          data: {
            tenantId,
            bankAccountId,
            transactionDate: new Date(t.transactionDate),
            amount: t.amount,
            description: t.description,
            referenceNumber: t.referenceNumber ?? null,
            checkNumber: t.checkNumber ?? null,
            counterpartyName: t.counterpartyName ?? null,
            counterpartyAccount: t.counterpartyAccount ?? null,
            status: 'imported',
            metadata: t.metadata ?? {},
          },
        })
        txns.push(txn)
      }
      return txns
    })

    logger.info({
      bankAccountId,
      count: created.length,
      userId: ctx.userId,
    }, 'Bank statement imported')

    const responseBody = JSON.stringify({
      data: {
        message: 'Bank statement imported',
        importedCount: created.length,
        bankAccountId,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Bank statement import failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Import failed', statusCode: 500 })
  }
}
