/**
 * POST /api/v1/bank-accounts/[id]/reconcile
 *
 * T-3-05: Auto-match bank transactions with system payments.
 *
 * Matching algorithm:
 *   1. Find unmatched bank transactions in date range
 *   2. Find unmatched system payments in date range
 *   3. Match by: exact amount + closest date (±3 days)
 *   4. If reference number matches, prioritize
 *   5. Create BankReconciliation record with results
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

const DATE_TOLERANCE_DAYS = 3

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

    // Validate period
    if (!body.periodStart || !body.periodEnd) {
      throw new ValidationException('Period required', [
        { field: 'periodStart', message: 'Required', code: 'REQUIRED' },
        { field: 'periodEnd', message: 'Required', code: 'REQUIRED' },
      ])
    }

    const periodStart = new Date(body.periodStart)
    const periodEnd = new Date(body.periodEnd)

    if (periodStart >= periodEnd) {
      throw new ValidationException('Invalid period', [
        { field: 'periodEnd', message: 'Must be after periodStart', code: 'INVALID' },
      ])
    }

    // Find unmatched bank transactions in period
    const bankTxns = await db.bankTransaction.findMany({
      where: {
        tenantId,
        bankAccountId,
        transactionDate: { gte: periodStart, lte: periodEnd },
        status: { in: ['imported', 'unmatched'] },
      },
      orderBy: { transactionDate: 'asc' },
    })

    // Find unmatched system payments in period
    const payments = await db.payment.findMany({
      where: {
        tenantId,
        paymentDate: { gte: periodStart, lte: periodEnd },
        deletedAt: null,
        // Only payments not already matched
      },
      orderBy: { paymentDate: 'asc' },
    })

    // Matching algorithm
    const matches: Array<{ bankTxnId: string; paymentId: string; matchType: string }> = []
    const unmatchedBankTxns: string[] = []

    for (const bankTxn of bankTxns) {
      let bestMatch = null
      let bestScore = 0

      for (const payment of payments) {
        // Amount must match (bank deposit = payment received)
        if (Math.abs(bankTxn.amount - payment.amount) > 0.01) continue

        // Calculate match score
        let score = 1 // amount matches

        // Date proximity (closer = better)
        const dateDiff = Math.abs(
          new Date(bankTxn.transactionDate).getTime() - new Date(payment.paymentDate).getTime(),
        ) / (1000 * 60 * 60 * 24) // days

        if (dateDiff <= DATE_TOLERANCE_DAYS) {
          score += (DATE_TOLERANCE_DAYS - dateDiff) / DATE_TOLERANCE_DAYS
        } else {
          continue // too far apart
        }

        // Reference number match (high priority)
        if (bankTxn.referenceNumber && payment.referenceNumber &&
            bankTxn.referenceNumber === payment.referenceNumber) {
          score += 2
        }

        if (score > bestScore) {
          bestScore = score
          bestMatch = payment
        }
      }

      if (bestMatch) {
        matches.push({
          bankTxnId: bankTxn.id,
          paymentId: bestMatch.id,
          matchType: bestScore >= 3 ? 'exact' : 'fuzzy',
        })
      } else {
        unmatchedBankTxns.push(bankTxn.id)
      }
    }

    // Calculate balances
    const bankStatementBalance = bankTxns.reduce(
      (sum, t) => sum + t.amount,
      bankAccount.openingBalance,
    )
    const adjustedBalance = bankStatementBalance // simplified

    // Create reconciliation record
    const reconciliation = await db.$transaction(async (tx) => {
      const recon = await tx.bankReconciliation.create({
        data: {
          tenantId,
          bankAccountId,
          periodStart,
          periodEnd,
          openingBalance: bankAccount.openingBalance,
          closingBalance: bankAccount.currentBalance,
          bankStatementBalance,
          adjustedBalance,
          difference: bankAccount.currentBalance - bankStatementBalance,
          status: 'completed',
          completedAt: new Date(),
          completedBy: ctx.userId,
          matchedCount: matches.length,
          unmatchedCount: unmatchedBankTxns.length,
          metadata: { matches, unmatchedBankTxns },
        },
      })

      // Update matched transactions
      for (const match of matches) {
        await tx.bankTransaction.update({
          where: { id: match.bankTxnId },
          data: {
            status: 'matched',
            matchedPaymentId: match.paymentId,
            reconciliationId: recon.id,
            metadata: { matchType: match.matchType },
          },
        })
      }

      // Update unmatched transactions
      for (const txnId of unmatchedBankTxns) {
        await tx.bankTransaction.update({
          where: { id: txnId },
          data: {
            status: 'unmatched',
            reconciliationId: recon.id,
          },
        })
      }

      // Update bank account lastReconciledAt
      await tx.bankAccount.update({
        where: { id: bankAccountId },
        data: { lastReconciledAt: new Date() },
      })

      return recon
    })

    logger.info({
      reconciliationId: reconciliation.id,
      bankAccountId,
      matched: matches.length,
      unmatched: unmatchedBankTxns.length,
      userId: ctx.userId,
    }, 'Bank reconciliation completed')

    const responseBody = JSON.stringify({
      data: {
        reconciliationId: reconciliation.id,
        matchedCount: matches.length,
        unmatchedCount: unmatchedBankTxns.length,
        bankStatementBalance,
        adjustedBalance,
        difference: reconciliation.difference,
        status: 'completed',
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    }
    logger.error({ err: e }, 'Bank reconciliation failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Reconciliation failed', statusCode: 500 })
  }
}
