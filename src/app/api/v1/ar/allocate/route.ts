import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * POST /api/v1/ar/allocate
 * Allocate a payment/credit to an invoice/charge.
 * LAW-41: Append-only (no update/delete). Reversal = negative allocation.
 * LAW-42: Balance derived (update openAmount on transactions).
 */
export async function POST(request: NextRequest) {
  try {
    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.debitTransactionId) throw new ValidationException('Debit transaction (invoice) required', [{ field: 'debitTransactionId', message: 'Required', code: 'REQUIRED' }])
    if (!body.creditTransactionId) throw new ValidationException('Credit transaction (payment) required', [{ field: 'creditTransactionId', message: 'Required', code: 'REQUIRED' }])
    if (!body.allocatedAmount || body.allocatedAmount <= 0) throw new ValidationException('Amount must be positive', [{ field: 'allocatedAmount', message: 'Must be > 0', code: 'INVALID' }])

    const debitTxn = await db.aRTransaction.findFirst({ where: { id: body.debitTransactionId, tenantId } })
    if (!debitTxn) throw new NotFoundException('ARTransaction', body.debitTransactionId)

    const creditTxn = await db.aRTransaction.findFirst({ where: { id: body.creditTransactionId, tenantId } })
    if (!creditTxn) throw new NotFoundException('ARTransaction', body.creditTransactionId)

    if (debitTxn.customerPartyId !== creditTxn.customerPartyId) {
      throw new BusinessException('Transactions must belong to same customer', 'CUSTOMER_MISMATCH', 422)
    }
    if (debitTxn.openAmount < body.allocatedAmount) {
      throw new BusinessException(`Invoice open amount (${debitTxn.openAmount}) < allocation (${body.allocatedAmount})`, 'INSUFFICIENT_OPEN', 422)
    }
    if (Math.abs(creditTxn.openAmount) < body.allocatedAmount) {
      throw new BusinessException(`Payment open amount (${Math.abs(creditTxn.openAmount)}) < allocation (${body.allocatedAmount})`, 'INSUFFICIENT_OPEN', 422)
    }

    await UnitOfWork.execute(async (uow) => {
      // LAW-41: Create allocation (append-only)
      await uow.tx.aRAllocation.create({
        data: {
          tenantId, customerPartyId: debitTxn.customerPartyId,
          debitTransactionId: body.debitTransactionId,
          creditTransactionId: body.creditTransactionId,
          allocatedAmount: body.allocatedAmount,
          allocatedBy: body.allocatedBy ?? 'admin',
          notes: body.notes ?? null,
        },
      })

      // Update open amounts (LAW-42: openAmount is derived-like cache, updated atomically)
      const newDebitOpen = debitTxn.openAmount - body.allocatedAmount
      const newCreditOpen = creditTxn.openAmount + body.allocatedAmount // credit has negative open

      await uow.tx.aRTransaction.update({
        where: { id: debitTxn.id },
        data: {
          openAmount: newDebitOpen,
          status: newDebitOpen <= 0 ? 'fully_allocated' : 'partially_allocated',
          version: { increment: 1 },
        },
      })

      await uow.tx.aRTransaction.update({
        where: { id: creditTxn.id },
        data: {
          openAmount: newCreditOpen,
          status: Math.abs(newCreditOpen) < 0.01 ? 'fully_allocated' : 'partially_allocated',
          version: { increment: 1 },
        },
      })

      await uow.outbox.append({
        tenantId, aggregateType: 'ARAllocation', aggregateId: body.debitTransactionId,
        eventType: 'ar.allocated', eventVersion: '1.0',
        payload: { customerPartyId: debitTxn.customerPartyId, debitTransactionId: body.debitTransactionId, creditTransactionId: body.creditTransactionId, allocatedAmount: body.allocatedAmount },
        actorId: body.allocatedBy ?? null,
      })
    })

    const response = jsonResponse({ data: { status: 'allocated', message: 'AR allocation created (LAW-41: append-only, LAW-42: balance derived).' } })
    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to allocate', statusCode: 500 })
  }
}
