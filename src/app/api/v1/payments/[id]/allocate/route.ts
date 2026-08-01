import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

interface Params { params: { id: string } }

/**
 * POST /api/v1/payments/{id}/allocate
 *
 * LAW-20: Every Payment Must Be Allocated.
 * Allocates payment to one or more invoices.
 *
 * Flow:
 *   1. Create PaymentAllocation records
 *   2. Update Invoice.paidAmount + status (partially_paid or paid)
 *   3. Update Payment.status (partially_allocated or completed)
 *   4. Outbox event (Financial will create Journal Entry — LAW-19)
 *
 * Idempotent (LAW-06). Uses Unit of Work (LAW-12).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'payment.allocate')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.allocations || !Array.isArray(body.allocations) || body.allocations.length === 0) {
      throw new ValidationException('At least one allocation is required (LAW-20)', [
        { field: 'allocations', message: 'Required', code: 'REQUIRED' },
      ])
    }

    const payment = await db.payment.findFirst({ where: { id: params.id, tenantId, deletedAt: null } })
    if (!payment) throw new NotFoundException('Payment', params.id)
    if (payment.status === 'completed') {
      throw new ValidationException('Payment is already completed', [
        { field: 'status', message: 'Already completed', code: 'INVALID_STATE' },
      ])
    }

    // Calculate total already allocated
    const existingAllocations = await db.paymentAllocation.aggregate({
      where: { paymentId: payment.id },
      _sum: { allocatedAmount: true },
    })
    const alreadyAllocated = existingAllocations._sum.allocatedAmount ?? 0
    const remainingToAllocate = payment.amount - alreadyAllocated

    // Calculate total new allocation
    const newAllocationTotal = body.allocations.reduce(
      (sum: number, a: any) => sum + (a.allocatedAmount || 0), 0,
    )

    if (newAllocationTotal > remainingToAllocate) {
      throw new BusinessException(
        `Allocation exceeds remaining payment amount: requested ${newAllocationTotal}, available ${remainingToAllocate}`,
        'ALLOCATION_EXCEEDS_PAYMENT',
        422,
      )
    }

    let totalAllocated = alreadyAllocated + newAllocationTotal

    await UnitOfWork.execute(async (uow) => {
      for (const alloc of body.allocations) {
        const invoice = await uow.tx.invoice.findFirst({
          where: { id: alloc.invoiceId, tenantId, deletedAt: null },
        })
        if (!invoice) throw new NotFoundException('Invoice', alloc.invoiceId)

        // LAW-21: Invoice must be issued
        if (invoice.status === 'draft' || invoice.status === 'cancelled') {
          throw new ValidationException(`Invoice ${invoice.invoiceNumber} is not issued`, [
            { field: 'invoiceId', message: `Status: ${invoice.status}`, code: 'INVALID_STATE' },
          ])
        }

        const invoiceBalance = invoice.totalAmount - invoice.paidAmount
        if (alloc.allocatedAmount > invoiceBalance) {
          throw new BusinessException(
            `Allocation exceeds invoice balance: ${alloc.allocatedAmount} > ${invoiceBalance}`,
            'ALLOCATION_EXCEEDS_INVOICE',
            422,
          )
        }

        // Create allocation
        await uow.tx.paymentAllocation.create({
          data: {
            tenantId,
            paymentId: payment.id,
            invoiceId: alloc.invoiceId,
            allocatedAmount: alloc.allocatedAmount,
            allocatedBy: body.allocatedBy ?? null,
            notes: alloc.notes ?? null,
          },
        })

        // Update invoice paidAmount + status
        const newPaidAmount = invoice.paidAmount + alloc.allocatedAmount
        const newStatus = newPaidAmount >= invoice.totalAmount ? 'paid' : 'partially_paid'
        await uow.tx.invoice.updateMany({
          where: { id: invoice.id, version: invoice.version },
          data: { paidAmount: newPaidAmount, status: newStatus, version: { increment: 1 } },
        })
      }

      // Update payment status (LAW-20)
      const paymentStatus = totalAllocated >= payment.amount ? 'completed' : 'partially_allocated'
      await uow.tx.payment.updateMany({
        where: { id: payment.id, version: payment.version },
        data: { status: paymentStatus, version: { increment: 1 } },
      })

      // Outbox events (LAW-08, LAW-19)
      await uow.outbox.append({
        tenantId, aggregateType: 'Payment', aggregateId: payment.id,
        eventType: 'payment.allocated', eventVersion: '1.0',
        payload: {
          paymentNumber: payment.paymentNumber,
          totalAllocated,
          paymentStatus,
          allocations: body.allocations.map((a: any) => ({ invoiceId: a.invoiceId, amount: a.allocatedAmount })),
        },
        actorId: body.allocatedBy ?? null,
      })

      // If payment completed → financial event for Journal Entry (LAW-19)
      if (paymentStatus === 'completed') {
        await uow.outbox.append({
          tenantId, aggregateType: 'Payment', aggregateId: payment.id,
          eventType: 'payment.received', eventVersion: '1.0',
          payload: {
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            currencyCode: payment.currencyCode,
            customerPartyId: payment.customerPartyId,
          },
          actorId: body.allocatedBy ?? null,
        })
      }
    })

    const response = jsonResponse({
      data: {
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        status: totalAllocated >= payment.amount ? 'completed' : 'partially_allocated',
        totalAllocated,
        message: totalAllocated >= payment.amount
          ? 'Payment fully allocated and completed (LAW-20). Financial will create Journal Entry (LAW-19).'
          : 'Payment partially allocated. More allocation needed to complete (LAW-20).',
      },
    })

    await IdempotencyHelper.store(request, await response.clone().text(), 200)
    return response
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to allocate payment', statusCode: 500 })
  }
}
