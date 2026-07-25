import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/fiscal-years/{id}/close
 * LAW-39: Year Closing Automatically Generates Opening Balances.
 *
 * Flow:
 *   1. Verify all periods are closed
 *   2. Calculate closing balances per account
 *   3. Post Year-End Closing JE (zero revenue/expense → Retained Earnings)
 *   4. Create Opening Balance JE for next year (carry forward balance sheet)
 *   5. Lock fiscal year
 *   6. Publish 'fiscal_year.closed' event
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const year = await db.fiscalYear.findFirst({
      where: { id: params.id, tenantId },
      include: { periods: true },
    })
    if (!year) throw new NotFoundException('FiscalYear', params.id)
    if (year.status === 'closed') throw new ValidationException('Year already closed', [{ field: 'status', message: 'Already closed', code: 'ALREADY_CLOSED' }])

    // Verify all periods are closed
    const openPeriods = year.periods.filter((p) => p.status !== 'closed')
    if (openPeriods.length > 0) {
      throw new BusinessException(`${openPeriods.length} periods are not closed. Close all periods first.`, 'PERIODS_NOT_CLOSED', 422)
    }

    // Calculate closing balances per account
    const allLines = await db.journalEntryLine.findMany({
      where: {
        tenantId,
        journalEntry: {
          status: 'posted',
          deletedAt: null,
          entryDate: { gte: year.startDate, lte: year.endDate },
        },
      },
      include: { account: true },
    })

    const accountBalances = new Map<string, { account: any; totalDebit: number; totalCredit: number }>()
    for (const line of allLines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, { account: line.account, totalDebit: 0, totalCredit: 0 })
      }
      const bal = accountBalances.get(line.accountId)!
      bal.totalDebit += line.debitAmount
      bal.totalCredit += line.creditAmount
    }

    // Calculate net P&L (revenue - expense)
    let totalRevenue = 0
    let totalExpense = 0
    const balanceSheetBalances: Array<{ account: any; balance: number }> = []

    for (const [, bal] of accountBalances) {
      const netDebit = bal.totalDebit - bal.totalCredit
      const isDebitNormal = bal.account.accountType === 'asset' || bal.account.accountType === 'expense'

      if (bal.account.accountType === 'revenue') {
        totalRevenue += isDebitNormal ? -netDebit : netDebit
      } else if (bal.account.accountType === 'expense') {
        totalExpense += isDebitNormal ? netDebit : -netDebit
      } else {
        // Balance sheet account — carry forward
        balanceSheetBalances.push({ account: bal.account, balance: netDebit })
      }
    }

    const retainedEarnings = totalRevenue - totalExpense

    // Find or create Retained Earnings account
    let retainedEarningsAccount = await db.chartOfAccount.findFirst({
      where: { tenantId, accountType: 'equity', accountCode: { contains: 'RE' } },
    })

    if (!retainedEarningsAccount) {
      retainedEarningsAccount = await db.chartOfAccount.create({
        data: {
          tenantId, accountCode: '3900', accountName: 'Retained Earnings',
          accountType: 'equity', isPostable: true, isActive: true, currencyCode: 'IRR',
        },
      })
    }

    const closingEntryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)
    const openingEntryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)

    await UnitOfWork.execute(async (uow) => {
      let closingDebit = 0
      let closingCredit = 0
      const closingLines: Array<{ accountId: string; debit: number; credit: number; desc: string }> = []

      // Zero out revenue accounts
      for (const [, bal] of accountBalances) {
        if (bal.account.accountType === 'revenue') {
          const netCredit = bal.totalCredit - bal.totalDebit
          if (netCredit > 0) {
            closingLines.push({ accountId: bal.account.id, debit: netCredit, credit: 0, desc: `Close Revenue: ${bal.account.accountName}` })
            closingDebit += netCredit
          }
        }
      }

      // Zero out expense accounts
      for (const [, bal] of accountBalances) {
        if (bal.account.accountType === 'expense') {
          const netDebit = bal.totalDebit - bal.totalCredit
          if (netDebit > 0) {
            closingLines.push({ accountId: bal.account.id, debit: 0, credit: netDebit, desc: `Close Expense: ${bal.account.accountName}` })
            closingCredit += netDebit
          }
        }
      }

      // Retained Earnings (balancing figure)
      const reAmount = closingDebit - closingCredit
      if (reAmount > 0) {
        closingLines.push({ accountId: retainedEarningsAccount!.id, debit: 0, credit: reAmount, desc: 'Retained Earnings (net income)' })
        closingCredit += reAmount
      } else if (reAmount < 0) {
        closingLines.push({ accountId: retainedEarningsAccount!.id, debit: -reAmount, credit: 0, desc: 'Retained Earnings (net loss)' })
        closingDebit += -reAmount
      }

      // Create Year-End Closing JE
      const closingJE = await uow.tx.journalEntry.create({
        data: {
          tenantId, entryNumber: closingEntryNumber, entryDate: year.endDate,
          description: `Year-End Closing: ${year.yearCode}`,
          sourceType: 'year_closing', sourceId: year.id,
          status: 'posted', postedAt: new Date(), postedBy: body.closedBy ?? 'system',
          totalDebit: closingDebit, totalCredit: closingCredit,
          metadata: { fiscalYearId: year.id },
        },
      })

      for (let i = 0; i < closingLines.length; i++) {
        const line = closingLines[i]
        await uow.tx.journalEntryLine.create({
          data: { tenantId, journalEntryId: closingJE.id, lineNumber: i + 1, accountId: line.accountId, debitAmount: line.debit, creditAmount: line.credit, description: line.desc },
        })
      }

      // Create Opening Balance JE for next year (carry forward balance sheet)
      let openingDebit = 0
      let openingCredit = 0
      const openingLines: Array<{ accountId: string; debit: number; credit: number; desc: string }> = []

      for (const bsb of balanceSheetBalances) {
        if (bsb.balance > 0) {
          openingLines.push({ accountId: bsb.account.id, debit: bsb.balance, credit: 0, desc: `Opening: ${bsb.account.accountName}` })
          openingDebit += bsb.balance
        } else if (bsb.balance < 0) {
          openingLines.push({ accountId: bsb.account.id, debit: 0, credit: -bsb.balance, desc: `Opening: ${bsb.account.accountName}` })
          openingCredit += -bsb.balance
        }
      }

      // Add Retained Earnings to opening
      if (retainedEarnings !== 0) {
        if (retainedEarnings > 0) {
          openingLines.push({ accountId: retainedEarningsAccount!.id, debit: 0, credit: retainedEarnings, desc: 'Opening: Retained Earnings' })
          openingCredit += retainedEarnings
        } else {
          openingLines.push({ accountId: retainedEarningsAccount!.id, debit: -retainedEarnings, credit: 0, desc: 'Opening: Retained Earnings (loss)' })
          openingDebit += -retainedEarnings
        }
      }

      // Only create opening JE if there are lines
      if (openingLines.length > 0) {
        const openingJE = await uow.tx.journalEntry.create({
          data: {
            tenantId, entryNumber: openingEntryNumber, entryDate: new Date(year.endDate.getTime() + 86400000), // next day
            description: `Opening Balance: Next Year after ${year.yearCode}`,
            sourceType: 'opening_balance', sourceId: year.id,
            status: 'posted', postedAt: new Date(), postedBy: body.closedBy ?? 'system',
            totalDebit: openingDebit, totalCredit: openingCredit,
            metadata: { fiscalYearId: year.id, isOpening: true },
          },
        })

        for (let i = 0; i < openingLines.length; i++) {
          const line = openingLines[i]
          await uow.tx.journalEntryLine.create({
            data: { tenantId, journalEntryId: openingJE.id, lineNumber: i + 1, accountId: line.accountId, debitAmount: line.debit, creditAmount: line.credit, description: line.desc },
          })
        }
      }

      // Lock fiscal year
      await uow.tx.fiscalYear.update({ where: { id: year.id }, data: { status: 'closed', closedAt: new Date(), closedBy: body.closedBy ?? 'admin' } })

      // Outbox events
      await uow.outbox.append({
        tenantId, aggregateType: 'FiscalYear', aggregateId: year.id,
        eventType: 'fiscal_year.closed', eventVersion: '1.0',
        payload: { yearCode: year.yearCode, closingEntryNumber, openingEntryNumber, retainedEarnings },
        actorId: body.closedBy ?? null,
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: 'opening',
        eventType: 'opening_balance.created', eventVersion: '1.0',
        payload: { entryNumber: openingEntryNumber, fiscalYearId: year.id },
        actorId: body.closedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        fiscalYearId: year.id,
        yearCode: year.yearCode,
        status: 'closed',
        closingEntryNumber,
        openingEntryNumber,
        retainedEarnings,
        message: `Year ${year.yearCode} closed. Closing JE: ${closingEntryNumber}. Opening JE: ${openingEntryNumber}. Retained Earnings: ${retainedEarnings} (LAW-39).`,
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to close fiscal year', statusCode: 500 })
  }
}
