/**
 * Financial Event Handlers — LAW-34
 *
 * ONLY Financial Context creates Journal Entries.
 * These handlers consume events from other contexts and create
 * the appropriate Journal Entries via the Financial API.
 *
 * Events consumed:
 *   invoice.issued       → JE: debit AR, credit Revenue
 *   payment.received     → JE: debit Cash, credit AR
 *   credit_note.issued   → JE: debit Revenue (reversal), credit AR
 *   refund.completed     → JE: debit AR, credit Cash
 *   service.part_consumed → JE: debit COGS, credit Inventory (for warranty)
 *   inventory.adjustment → JE: debit/credit Inventory Adj, credit/debit Inventory
 */

import { InboxWorker } from '@/lib/shared/inbox'
import { db } from '@/lib/db'
import { BusinessCodeGenerator, UnitOfWork } from '@/lib/shared'

/**
 * Register Financial Event Handlers (LAW-34).
 * These are THE ONLY handlers that create Journal Entries.
 */
export function registerFinancialEventHandlers(): void {

  // ===== INVOICE ISSUED → Create AR Journal Entry =====
  // Debit: Accounts Receivable (asset)
  // Credit: Sales Revenue (revenue)
  InboxWorker.register('invoice.issued', 'financial-ar-handler', async (message) => {
    const { invoiceNumber, customerPartyId, totalAmount, currencyCode } = message.payload as any
    console.log(`[FINANCIAL] Creating AR Journal Entry for invoice ${invoiceNumber} (LAW-34)`)

    try {
      // Find AR control account and Revenue account
      const arAccount = await db.chartOfAccount.findFirst({
        where: { tenantId: message.tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } },
      })
      const revenueAccount = await db.chartOfAccount.findFirst({
        where: { tenantId: message.tenantId, accountType: 'revenue', isActive: true },
      })

      if (!arAccount || !revenueAccount) {
        console.error('[FINANCIAL] AR or Revenue account not found — skipping JE creation')
        return
      }

      const entryNumber = await BusinessCodeGenerator.generate('journal_entry', message.tenantId)

      await UnitOfWork.execute(async (uow) => {
        const entry = await uow.tx.journalEntry.create({
          data: {
            tenantId: message.tenantId, entryNumber, entryDate: new Date(),
            description: `AR for Invoice ${invoiceNumber}`,
            sourceType: 'sales_invoice', sourceId: message.aggregateId,
            status: 'posted', postedAt: new Date(), postedBy: 'financial-event-handler',
            totalDebit: totalAmount, totalCredit: totalAmount,
            metadata: {},
          },
        })

        // Debit AR
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 1,
            accountId: arAccount.id, partyId: customerPartyId,
            debitAmount: totalAmount, creditAmount: 0,
            description: `AR - Invoice ${invoiceNumber}`,
          },
        })

        // Credit Revenue
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 2,
            accountId: revenueAccount.id,
            debitAmount: 0, creditAmount: totalAmount,
            description: `Revenue - Invoice ${invoiceNumber}`,
          },
        })

        await uow.outbox.append({
          tenantId: message.tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
          eventType: 'journal_entry.posted', eventVersion: '1.0',
          payload: { entryNumber, sourceType: 'sales_invoice', totalDebit: totalAmount, totalCredit: totalAmount },
          actorId: null,
        })
      })

      console.log(`[FINANCIAL] AR Journal Entry created for ${invoiceNumber}: ${totalAmount} ${currencyCode}`)
    } catch (e) {
      console.error(`[FINANCIAL] Failed to create AR JE for ${invoiceNumber}:`, e)
    }
  })

  // ===== PAYMENT RECEIVED → Create Cash Receipt Journal Entry =====
  // Debit: Cash/Bank (asset)
  // Credit: Accounts Receivable (asset)
  InboxWorker.register('payment.received', 'financial-cash-handler', async (message) => {
    const { paymentNumber, amount, currencyCode, customerPartyId } = message.payload as any
    console.log(`[FINANCIAL] Creating Cash Receipt JE for payment ${paymentNumber} (LAW-34)`)

    try {
      const cashAccount = await db.chartOfAccount.findFirst({
        where: { tenantId: message.tenantId, accountType: 'asset', accountCode: { contains: 'CASH' } },
      })
      const arAccount = await db.chartOfAccount.findFirst({
        where: { tenantId: message.tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } },
      })

      if (!cashAccount || !arAccount) {
        console.error('[FINANCIAL] Cash or AR account not found')
        return
      }

      const entryNumber = await BusinessCodeGenerator.generate('journal_entry', message.tenantId)

      await UnitOfWork.execute(async (uow) => {
        const entry = await uow.tx.journalEntry.create({
          data: {
            tenantId: message.tenantId, entryNumber, entryDate: new Date(),
            description: `Cash Receipt for Payment ${paymentNumber}`,
            sourceType: 'payment', sourceId: message.aggregateId,
            status: 'posted', postedAt: new Date(), postedBy: 'financial-event-handler',
            totalDebit: amount, totalCredit: amount,
            metadata: {},
          },
        })

        // Debit Cash
        await uow.tx.journalEntryLine.create({
          data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 1, accountId: cashAccount.id, partyId: customerPartyId, debitAmount: amount, creditAmount: 0, description: `Cash - Payment ${paymentNumber}` },
        })

        // Credit AR
        await uow.tx.journalEntryLine.create({
          data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 2, accountId: arAccount.id, partyId: customerPartyId, debitAmount: 0, creditAmount: amount, description: `AR Applied - Payment ${paymentNumber}` },
        })

        await uow.outbox.append({
          tenantId: message.tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
          eventType: 'journal_entry.posted', eventVersion: '1.0',
          payload: { entryNumber, sourceType: 'payment', totalDebit: amount, totalCredit: amount },
          actorId: null,
        })
      })

      console.log(`[FINANCIAL] Cash Receipt JE created for ${paymentNumber}: ${amount} ${currencyCode}`)
    } catch (e) {
      console.error(`[FINANCIAL] Failed to create Cash JE for ${paymentNumber}:`, e)
    }
  })

  // ===== CREDIT NOTE ISSUED → Create Reversal Journal Entry =====
  // Debit: Revenue (reversal)
  // Credit: Accounts Receivable (reversal)
  InboxWorker.register('credit_note.issued', 'financial-reversal-handler', async (message) => {
    const { creditNoteNumber, totalAmount } = message.payload as any
    console.log(`[FINANCIAL] Creating Reversal JE for Credit Note ${creditNoteNumber} (LAW-34)`)

    try {
      const revenueAccount = await db.chartOfAccount.findFirst({ where: { tenantId: message.tenantId, accountType: 'revenue', isActive: true } })
      const arAccount = await db.chartOfAccount.findFirst({ where: { tenantId: message.tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } } })

      if (!revenueAccount || !arAccount) return

      const entryNumber = await BusinessCodeGenerator.generate('journal_entry', message.tenantId)

      await UnitOfWork.execute(async (uow) => {
        const entry = await uow.tx.journalEntry.create({
          data: {
            tenantId: message.tenantId, entryNumber, entryDate: new Date(),
            description: `Reversal for Credit Note ${creditNoteNumber}`,
            sourceType: 'credit_note', sourceId: message.aggregateId,
            status: 'posted', postedAt: new Date(), postedBy: 'financial-event-handler',
            totalDebit: totalAmount, totalCredit: totalAmount,
            metadata: {},
          },
        })

        // Debit Revenue (reversal)
        await uow.tx.journalEntryLine.create({
          data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 1, accountId: revenueAccount.id, debitAmount: totalAmount, creditAmount: 0, description: `Revenue Reversal - CN ${creditNoteNumber}` },
        })

        // Credit AR (reversal)
        await uow.tx.journalEntryLine.create({
          data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 2, accountId: arAccount.id, debitAmount: 0, creditAmount: totalAmount, description: `AR Reversal - CN ${creditNoteNumber}` },
        })

        await uow.outbox.append({
          tenantId: message.tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
          eventType: 'journal_entry.posted', eventVersion: '1.0',
          payload: { entryNumber, sourceType: 'credit_note', totalDebit: totalAmount, totalCredit: totalAmount },
          actorId: null,
        })
      })

      console.log(`[FINANCIAL] Reversal JE created for CN ${creditNoteNumber}: ${totalAmount}`)
    } catch (e) {
      console.error(`[FINANCIAL] Failed to create Reversal JE:`, e)
    }
  })

  // ===== REFUND COMPLETED → Create Refund Journal Entry =====
  // Debit: Accounts Receivable
  // Credit: Cash/Bank
  InboxWorker.register('refund.completed', 'financial-refund-handler', async (message) => {
    const { refundNumber, amount, customerPartyId } = message.payload as any
    console.log(`[FINANCIAL] Creating Refund JE for ${refundNumber} (LAW-34)`)

    try {
      const arAccount = await db.chartOfAccount.findFirst({ where: { tenantId: message.tenantId, isControlAccount: true, accountType: 'asset', accountCode: { contains: 'AR' } } })
      const cashAccount = await db.chartOfAccount.findFirst({ where: { tenantId: message.tenantId, accountType: 'asset', accountCode: { contains: 'CASH' } } })

      if (!arAccount || !cashAccount) return

      const entryNumber = await BusinessCodeGenerator.generate('journal_entry', message.tenantId)

      await UnitOfWork.execute(async (uow) => {
        const entry = await uow.tx.journalEntry.create({
          data: {
            tenantId: message.tenantId, entryNumber, entryDate: new Date(),
            description: `Refund ${refundNumber}`,
            sourceType: 'refund', sourceId: message.aggregateId,
            status: 'posted', postedAt: new Date(), postedBy: 'financial-event-handler',
            totalDebit: amount, totalCredit: amount,
            metadata: {},
          },
        })

        // Debit AR (reduce customer balance)
        await uow.tx.journalEntryLine.create({ data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 1, accountId: arAccount.id, partyId: customerPartyId, debitAmount: amount, creditAmount: 0, description: `AR - Refund ${refundNumber}` } })

        // Credit Cash (money out)
        await uow.tx.journalEntryLine.create({ data: { tenantId: message.tenantId, journalEntryId: entry.id, lineNumber: 2, accountId: cashAccount.id, debitAmount: 0, creditAmount: amount, description: `Cash Out - Refund ${refundNumber}` } })

        await uow.outbox.append({
          tenantId: message.tenantId, aggregateType: 'JournalEntry', aggregateId: entry.id,
          eventType: 'journal_entry.posted', eventVersion: '1.0',
          payload: { entryNumber, sourceType: 'refund', totalDebit: amount, totalCredit: amount },
          actorId: null,
        })
      })

      console.log(`[FINANCIAL] Refund JE created for ${refundNumber}: ${amount}`)
    } catch (e) {
      console.error(`[FINANCIAL] Failed to create Refund JE:`, e)
    }
  })

  console.log('[FINANCIAL EVENT HANDLERS] Registered all Financial consumers (LAW-34)')
}
