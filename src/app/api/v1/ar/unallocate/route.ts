import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException } from '@/lib/shared'

/**
 * POST /api/v1/ar/unallocate
 * LAW-41: Reverse an allocation (create negative allocation, restore open amounts).
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.allocationId) throw new ValidationException('Allocation ID required', [{ field: 'allocationId', message: 'Required', code: 'REQUIRED' }])

    const original = await db.aRAllocation.findFirst({ where: { id: body.allocationId, tenantId } })
    if (!original) throw new NotFoundException('ARAllocation', body.allocationId)
    if (original.allocatedAmount < 0) throw new ValidationException('Already reversed', [{ field: 'allocationId', message: 'Already a reversal', code: 'ALREADY_REVERSED' }])

    const debitTxn = await db.aRTransaction.findFirst({ where: { id: original.debitTransactionId, tenantId } })
    const creditTxn = await db.aRTransaction.findFirst({ where: { id: original.creditTransactionId, tenantId } })
    if (!debitTxn || !creditTxn) throw new NotFoundException('ARTransaction', 'transaction not found')

    await UnitOfWork.execute(async (uow) => {
      // LAW-41: Create reversal allocation (negative amount)
      await uow.tx.aRAllocation.create({
        data: {
          tenantId, customerPartyId: original.customerPartyId,
          debitTransactionId: original.debitTransactionId,
          creditTransactionId: original.creditTransactionId,
          allocatedAmount: -original.allocatedAmount, // negative = reversal
          allocatedBy: body.reversedBy ?? 'admin',
          reversalOfId: original.id,
          notes: `Reversal of allocation ${original.id}`,
        },
      })

      // Restore open amounts
      await uow.tx.aRTransaction.update({
        where: { id: debitTxn.id },
        data: {
          openAmount: { increment: original.allocatedAmount },
          status: 'open', // reopen
          version: { increment: 1 },
        },
      })

      await uow.tx.aRTransaction.update({
        where: { id: creditTxn.id },
        data: {
          openAmount: { decrement: original.allocatedAmount },
          status: 'open',
          version: { increment: 1 },
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ARAllocation', aggregateId: original.id,
        eventType: 'ar.unallocated', eventVersion: '1.0',
        payload: { allocationId: original.id, reversedAmount: original.allocatedAmount },
        actorId: body.reversedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { status: 'unallocated', message: 'AR allocation reversed (LAW-41). Open amounts restored.' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to unallocate', statusCode: 500 })
  }
}
