/**
 * POST /api/v1/return-orders/[id]/reverse
 *
 * T-3-02: Returns Financial Reversal
 *
 * When a return order is received + closed, this endpoint:
 *   1. Creates a Credit Note for the returned items
 *   2. Reverses inventory (stock back in)
 *   3. Creates reversing Journal Entry (debit Revenue, credit AR/Cash)
 *   4. If refund: marks Refund as completed
 *   5. Emits return_order.closed event
 *
 * Requires: return.approve permission
 *
 * Idempotent via Idempotency-Key header.
 */

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { DomainException, ValidationException, NotFoundException, ConflictException, IdempotencyHelper, UnitOfWork, BusinessCodeGenerator } from '@/lib/shared'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'return.approve')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const { id: returnOrderId } = await params
    const tenantId = await getTenantId()
    const rawBody = await request.text()
    const body = rawBody ? JSON.parse(rawBody) : {}

    // Find return order with lines
    // NOTE: ReturnOrder uses loose FK pattern (LAW-04) — salesOrderId and invoiceId
    // are string fields, not Prisma relations. Only `lines` and `refunds` are relations.
    // BUG-01 fix: removed invalid `include: { salesOrder, invoice }` that caused
    // PrismaClientValidationError. The route only needs invoiceId (string) for
    // Credit Note creation, which is already available on the ReturnOrder record.
    const returnOrder = await db.returnOrder.findFirst({
      where: { id: returnOrderId, tenantId, deletedAt: null },
      include: {
        lines: true,
      },
    })

    if (!returnOrder) {
      throw new NotFoundException('ReturnOrder', returnOrderId)
    }

    // State validation — must be 'received' to reverse
    if (returnOrder.status === 'closed') {
      // Idempotency at business level: already reversed → return success
      return jsonResponse({
        data: {
          message: 'Return order already reversed (closed)',
          returnOrderId,
          status: 'closed',
          refundAmount: returnOrder.refundAmount,
        },
      })
    }

    if (returnOrder.status !== 'received') {
      throw new ConflictException(
        `Return order must be in 'received' status to reverse (current: ${returnOrder.status})`,
      )
    }

    // Validate reason is provided
    if (!body.reason) {
      throw new ValidationException('Reversal reason required', [
        { field: 'reason', message: 'Required for audit trail', code: 'REQUIRED' },
      ])
    }

    // Pre-generate business codes BEFORE the transaction.
    // BUG-01 fix (root cause): BusinessCodeGenerator.generate() internally calls
    // db.$transaction, which deadlocks when called inside UnitOfWork.execute()
    // (nested transaction on SQLite). Pre-generating outside the UoW avoids this.
    // We need: inventory_transaction number (per line), credit_note number, journal_entry number.
    const inventoryTxnNumbers: string[] = []
    for (let i = 0; i < returnOrder.lines.length; i++) {
      inventoryTxnNumbers.push(await BusinessCodeGenerator.generate('inventory_transaction', tenantId))
    }
    const cnNumber = returnOrder.invoiceId
      ? await BusinessCodeGenerator.generate('credit_note', tenantId)
      : null
    const jeNumber = await BusinessCodeGenerator.generate('journal_entry', tenantId)

    // Execute reversal in a transaction
    const result = await UnitOfWork.execute(async (uow) => {
      let refundAmount = 0

      // Step 1: Calculate refund amount from lines
      for (const line of returnOrder.lines) {
        refundAmount += line.quantityReturned * line.unitPrice
      }

      // Step 2: Reverse inventory — stock back in
      let lineIdx = 0
      for (const line of returnOrder.lines) {
        const stockItem = await uow.tx.stockItem.findFirst({
          where: { tenantId, productId: line.productId },
        })

        if (stockItem) {
          await uow.tx.stockItem.update({
            where: { id: stockItem.id },
            data: {
              quantity: { increment: line.quantityReturned },
              version: { increment: 1 },
            },
          })

          // Create inventory transaction (stock in) — use pre-generated number
          await uow.tx.inventoryTransaction.create({
            data: {
              tenantId,
              transactionNumber: inventoryTxnNumbers[lineIdx],
              productId: line.productId,
              transactionType: 'return_in',
              quantity: line.quantityReturned,
              unitCost: line.unitPrice,
              referenceType: 'return_order',
              referenceId: returnOrder.id,
              warehouseId: stockItem.warehouseId,
              status: 'posted',
              metadata: { returnOrderId, reason: body.reason },
            },
          })
        }
        lineIdx++
      }

      // Step 3: Create Credit Note if invoice exists
      let creditNoteId: string | null = null
      if (returnOrder.invoiceId && cnNumber) {
        const creditNote = await uow.tx.creditNote.create({
          data: {
            tenantId,
            creditNoteNumber: cnNumber,
            invoiceId: returnOrder.invoiceId,
            customerPartyId: returnOrder.customerPartyId,
            creditNoteDate: new Date(),
            status: 'issued',
            subtotal: refundAmount,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: refundAmount,
            reason: `Return ${returnOrder.returnNumber}: ${body.reason}`,
            metadata: { returnOrderId },
            version: 1,
          },
        })
        creditNoteId = creditNote.id

        // Create credit note lines
        for (const line of returnOrder.lines) {
          await uow.tx.creditNoteLine.create({
            data: {
              tenantId,
              creditNoteId: creditNote.id,
              productId: line.productId,
              description: `Returned item`,
              quantity: line.quantityReturned,
              unitPrice: line.unitPrice,
              totalPrice: line.quantityReturned * line.unitPrice,
            },
          })
        }
      }

      // Step 4: Create reversing Journal Entry (LAW-34/35) — use pre-generated number
      const fiscalYear = await uow.tx.fiscalYear.findFirst({
        where: { tenantId, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
      })
      const fiscalPeriod = fiscalYear
        ? await uow.tx.fiscalPeriod.findFirst({
            where: { tenantId, fiscalYearId: fiscalYear.id, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          })
        : null

      // Find accounts
      const revenueAccount = await uow.tx.chartOfAccount.findFirst({
        where: { tenantId, accountType: 'revenue' },
      })
      const arAccount = await uow.tx.chartOfAccount.findFirst({
        where: { tenantId, accountCode: { contains: 'AR' } },
      }) || await uow.tx.chartOfAccount.findFirst({
        where: { tenantId, accountType: 'asset', isControlAccount: true },
      })

      if (revenueAccount && arAccount) {
        const journalEntry = await uow.tx.journalEntry.create({
          data: {
            tenantId,
            entryNumber: jeNumber,
            entryDate: new Date(),
            status: 'posted',
            description: `Return reversal: ${returnOrder.returnNumber} - ${body.reason}`,
            // BUG-01 fix: JournalEntry model uses sourceType/sourceId, not referenceType/referenceId
            sourceType: 'credit_note',
            sourceId: creditNoteId || returnOrder.id,
            fiscalYearId: fiscalYear?.id,
            fiscalPeriodId: fiscalPeriod?.id,
            totalDebit: refundAmount,
            totalCredit: refundAmount,
            postedAt: new Date(),
            postedBy: ctx.userId,
            version: 1,
            metadata: { returnOrderId, creditNoteId, reversalReason: body.reason },
          },
        })

        // Debit Revenue (reversal)
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId,
            journalEntryId: journalEntry.id,
            accountId: revenueAccount.id,
            lineNumber: 1,
            description: 'Revenue reversal',
            debitAmount: refundAmount,
            creditAmount: 0,
          },
        })

        // Credit AR (reversal)
        await uow.tx.journalEntryLine.create({
          data: {
            tenantId,
            journalEntryId: journalEntry.id,
            accountId: arAccount.id,
            lineNumber: 2,
            description: 'AR reversal',
            debitAmount: 0,
            creditAmount: refundAmount,
          },
        })
      }

      // Step 5: Update return order status to closed
      const updated = await uow.tx.returnOrder.update({
        where: { id: returnOrder.id },
        data: {
          status: 'closed',
          closedAt: new Date(),
          refundAmount,
          metadata: { ...(returnOrder as any).metadata, reversalReason: body.reason, creditNoteId },
        },
      })

      // Step 6: Emit outbox event
      await uow.outbox.append({
        aggregateType: 'ReturnOrder',
        aggregateId: returnOrder.id,
        eventType: 'return_order.closed',
        payload: {
          returnOrderId: returnOrder.id,
          returnNumber: returnOrder.returnNumber,
          refundAmount,
          creditNoteId,
          reason: body.reason,
          reversedBy: ctx.userId,
        },
        tenantId,
        actorId: ctx.userId,
      })

      return { returnOrder: updated, refundAmount, creditNoteId }
    })

    logger.info({
      returnOrderId,
      refundAmount: result.refundAmount,
      creditNoteId: result.creditNoteId,
      userId: ctx.userId,
    }, 'Return order reversed')

    const responseBody = JSON.stringify({
      data: {
        message: 'Return order reversed successfully',
        returnOrderId,
        status: 'closed',
        refundAmount: result.refundAmount,
        creditNoteId: result.creditNoteId,
      },
    })
    await IdempotencyHelper.store(request, responseBody, 200, rawBody)
    return new Response(responseBody, { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) {
      return errorResponse({
        code: e.code,
        message: e.message,
        statusCode: e.statusCode,
        errors: (e as ValidationException).errors,
      })
    }
    logger.error({ err: e }, 'Return reversal failed')
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Return reversal failed', statusCode: 500 })
  }
}
