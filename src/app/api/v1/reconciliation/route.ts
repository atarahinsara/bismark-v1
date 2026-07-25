import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/reconciliation
 * LAW-40: Subledger Must Reconcile With General Ledger.
 *
 * Checks:
 *   AR: SUM(customer open balances) === GL AR Control Account balance
 *   AP: SUM(vendor open balances) === GL AP Control Account balance
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()

    // 1. AR Subledger: sum of all open debit transactions
    const arTransactions = await db.aRTransaction.findMany({
      where: { tenantId, status: { in: ['open', 'partially_allocated'] }, amount: { gt: 0 } },
    })
    const arSubledgerBalance = arTransactions.reduce((s, t) => s + t.openAmount, 0)

    // 2. AR GL: sum of posted JE lines for AR control account
    const arAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } },
    })

    let arGLBalance = 0
    if (arAccount) {
      const arLines = await db.journalEntryLine.findMany({
        where: { tenantId, accountId: arAccount.id, journalEntry: { status: 'posted' } },
      })
      // AR is asset → debit increases
      arGLBalance = arLines.reduce((s, l) => s + l.debitAmount - l.creditAmount, 0)
    }

    // 3. AP Subledger
    const apTransactions = await db.aPTransaction.findMany({
      where: { tenantId, status: { in: ['open', 'partially_allocated'] }, amount: { gt: 0 } },
    })
    const apSubledgerBalance = apTransactions.reduce((s, t) => s + t.openAmount, 0)

    // 4. AP GL
    const apAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, isControlAccount: true, accountType: 'liability', accountCode: { contains: 'AP' } },
    })

    let apGLBalance = 0
    if (apAccount) {
      const apLines = await db.journalEntryLine.findMany({
        where: { tenantId, accountId: apAccount.id, journalEntry: { status: 'posted' } },
      })
      // AP is liability → credit increases
      apGLBalance = apLines.reduce((s, l) => s + l.creditAmount - l.debitAmount, 0)
    }

    const arDifference = Math.abs(arSubledgerBalance - arGLBalance)
    const apDifference = Math.abs(apSubledgerBalance - apGLBalance)
    const isBalanced = arDifference < 0.01 && apDifference < 0.01

    return jsonResponse({
      data: {
        status: isBalanced ? 'in_balance' : 'out_of_balance',
        timestamp: new Date().toISOString(),
        ar: {
          subledgerBalance: arSubledgerBalance,
          glBalance: arGLBalance,
          difference: arDifference,
          isBalanced: arDifference < 0.01,
        },
        ap: {
          subledgerBalance: apSubledgerBalance,
          glBalance: apGLBalance,
          difference: apDifference,
          isBalanced: apDifference < 0.01,
        },
      },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to reconcile', statusCode: 500 })
  }
}
