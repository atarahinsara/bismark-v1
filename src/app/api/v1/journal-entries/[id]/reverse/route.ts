import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { BusinessCodeGenerator, IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/journal-entries/{id}/reverse
 * LAW-37: Only Reversal May Correct Posted Journal Entries.
 *
 * Creates a mirror JE with swapped debit/credit.
 * Marks original as 'reversed'.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json().catch(() => ({}))

    const original = await db.journalEntry.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: { lines: true },
    })
    if (!original) throw new NotFoundException('JournalEntry', params.id)

    // LAW-37: Only posted entries can be reversed
    if (original.status !== 'posted') {
      throw new ValidationException('Only posted entries can be reversed (LAW-37)', [
        { field: 'status', message: `Current: ${original.status}`, code: 'INVALID_STATE' },
      ])
    }
    if (original.status === 'reversed') {
      throw new ValidationException('Entry already reversed', [
        { field: 'status', message: 'Already reversed', code: 'ALREADY_REVERSED' },
      ])
    }

    const entryNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)

    await UnitOfWork.execute(async (uow) => {
      // Create reversal JE (mirror: swap debit ↔ credit)
      const reversal = await uow.tx.journalEntry.create({
        data: {
          tenantId, entryNumber, entryDate: new Date(),
          fiscalPeriodId: original.fiscalPeriodId,
          description: `REVERSAL: ${original.description}`,
          sourceType: 'reversal',
          sourceId: original.id,
          status: 'posted', // auto-posted
          totalDebit: original.totalCredit, // swapped
          totalCredit: original.totalDebit,
          postedAt: new Date(),
          postedBy: body.reversedBy ?? 'system',
          reversalReason: body.reason ?? `Reversal of ${original.entryNumber}`,
          metadata: { originalEntryId: original.id },
        },
      })

      // Create reversal lines (swap debit ↔ credit)
      for (let i = 0; i < original.lines.length; i++) {
        const line = original.lines[i]
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId, journalEntryId: reversal.id, lineNumber: i + 1,
            accountId: line.accountId,
            costCenterId: line.costCenterId,
            partyId: line.partyId,
            debitAmount: line.creditAmount,  // swapped
            creditAmount: line.debitAmount,   // swapped
            description: `REVERSAL: ${line.description ?? ''}`,
          },
        })
      }

      // Mark original as reversed (LAW-37: immutable, only status change)
      await uow.tx.journalEntry.updateMany({
        where: { id: original.id, version: original.version },
        data: {
          status: 'reversed',
          reversedAt: new Date(),
          reversedById: reversal.id,
          reversalReason: body.reason ?? `Reversed by ${entryNumber}`,
          version: { increment: 1 },
        },
      })

      // Outbox events
      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: reversal.id,
        eventType: 'journal_entry.posted', eventVersion: '1.0',
        payload: { entryNumber, sourceType: 'reversal', totalDebit: reversal.totalDebit, totalCredit: reversal.totalCredit },
        actorId: body.reversedBy ?? null,
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'JournalEntry', aggregateId: original.id,
        eventType: 'journal.reversed', eventVersion: '1.0',
        payload: { entryNumber: original.entryNumber, reversalEntryNumber: entryNumber, reason: body.reason },
        actorId: body.reversedBy ?? null,
      })
    })

    const response = jsonResponse({
      data: {
        originalEntryId: original.id,
        originalEntryNumber: original.entryNumber,
        reversalEntryNumber: entryNumber,
        status: 'reversed',
        message: 'Journal entry reversed (LAW-37). Reversal JE created and posted.',
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to reverse journal entry', statusCode: 500 })
  }
}
