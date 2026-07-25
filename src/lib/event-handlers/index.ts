/**
 * Event Handlers — Cross-Context Event Consumers
 *
 * LAW-25: No Cross-Context Synchronous Commands
 * LAW-26: Every Domain Event Must Be Processed Exactly Once
 *
 * Each handler is registered with the InboxWorker with a unique consumerId.
 * The InboxWorker ensures exactly-once processing via processed_messages table.
 */

import { InboxWorker } from '@/lib/shared/inbox'
import { db } from '@/lib/db'
import { SagaManager } from '@/lib/saga/saga-manager'

/**
 * Register all cross-context event handlers.
 * Called at application startup.
 */
export function registerEventHandlers(): void {
  // ===== INVENTORY CONSUMERS =====

  // When sales order is approved → create stock reservation (LAW-25: async, not direct call)
  InboxWorker.register('sales_order.approved', 'inventory-reservation-handler', async (message) => {
    const { orderNumber, customerPartyId, totalAmount } = message.payload as any
    console.log(`[INVENTORY] Received sales_order.approved for ${orderNumber}`)

    // In production: create StockReservation for each order line
    // For now: log the event (the actual reservation logic would be here)
    // This is async — Sales does NOT wait for this (LAW-25)

    // Advance saga if one is running
    const sagaInstance = await db.sagaInstance.findFirst({
      where: { correlationId: message.aggregateId, status: 'running' },
    })
    if (sagaInstance) {
      await SagaManager.advanceStep(sagaInstance.id, 'inventory.reserved')
    }
  })

  // When sales order is cancelled → release reservations
  InboxWorker.register('sales_order.cancelled', 'inventory-cancel-handler', async (message) => {
    const { orderNumber, reason } = message.payload as any
    console.log(`[INVENTORY] Received sales_order.cancelled for ${orderNumber} — releasing reservations`)

    // Release active reservations for this sales order
    await db.stockReservation.updateMany({
      where: { referenceType: 'sales_order', referenceId: message.aggregateId, status: 'active' },
      data: { status: 'released', releasedAt: new Date(), releaseReason: `Order cancelled: ${reason}` },
    })
  })

  // ===== BILLING CONSUMERS =====

  // When shipment is shipped → auto-create invoice (LAW-25: async)
  InboxWorker.register('shipment.shipped', 'billing-invoice-handler', async (message) => {
    const { shipmentNumber, salesOrderId } = message.payload as any
    console.log(`[BILLING] Received shipment.shipped for ${shipmentNumber} — auto-invoice`)

    // In production: create Invoice from Sales Order
    // The invoice creation itself would use UnitOfWork + Outbox

    // Advance saga
    const sagaInstance = await db.sagaInstance.findFirst({
      where: { correlationId: salesOrderId, status: 'running' },
    })
    if (sagaInstance) {
      await SagaManager.advanceStep(sagaInstance.id, 'invoice.issued')
    }
  })

  // ===== SAGA CONSUMERS =====

  // When return is received → advance return saga
  InboxWorker.register('return_order.received', 'saga-return-handler', async (message) => {
    const sagaInstance = await db.sagaInstance.findFirst({
      where: { correlationId: message.aggregateId, status: 'running' },
    })
    if (sagaInstance) {
      await SagaManager.advanceStep(sagaInstance.id, 'return_order.received')
    }
  })

  // When refund is completed → advance return saga + financial
  InboxWorker.register('refund.completed', 'saga-refund-handler', async (message) => {
    const sagaInstance = await db.sagaInstance.findFirst({
      where: { correlationId: message.aggregateId, status: 'running' },
    })
    if (sagaInstance) {
      await SagaManager.advanceStep(sagaInstance.id, 'refund.completed')
    }
  })

  // When return is closed → complete return saga
  InboxWorker.register('return_order.closed', 'saga-return-close-handler', async (message) => {
    const sagaInstance = await db.sagaInstance.findFirst({
      where: { correlationId: message.aggregateId, status: 'running' },
    })
    if (sagaInstance) {
      await SagaManager.advanceStep(sagaInstance.id, 'return_order.closed')
    }
  })

  // ===== FINANCIAL CONSUMERS (LAW-19: Financial creates Journal Entries) =====

  // When invoice is issued → Financial creates AR Invoice + Journal Entry
  InboxWorker.register('invoice.issued', 'financial-ar-handler', async (message) => {
    const { invoiceNumber, customerPartyId, totalAmount, currencyCode } = message.payload as any
    console.log(`[FINANCIAL] Received invoice.issued for ${invoiceNumber} — will create Journal Entry (LAW-19)`)

    // In production: create JournalEntry (debit AR, credit Revenue)
    // For now: log — Financial module will be built in Sprint 6
  })

  // When payment is received → Financial creates Journal Entry (debit Cash, credit AR)
  InboxWorker.register('payment.received', 'financial-cash-handler', async (message) => {
    const { paymentNumber, amount, currencyCode, customerPartyId } = message.payload as any
    console.log(`[FINANCIAL] Received payment.received for ${paymentNumber} — will create Journal Entry (LAW-19)`)

    // In production: create JournalEntry (debit Cash, credit AR)
  })

  // When credit note is issued → Financial creates reversal Journal Entry
  InboxWorker.register('credit_note.issued', 'financial-reversal-handler', async (message) => {
    const { creditNoteNumber, invoiceId, totalAmount } = message.payload as any
    console.log(`[FINANCIAL] Received credit_note.issued for ${creditNoteNumber} — will create reversal Journal Entry (LAW-19)`)

    // In production: create reversal JournalEntry
  })

  // When refund is completed → Financial creates refund Journal Entry
  InboxWorker.register('refund.completed', 'financial-refund-handler', async (message) => {
    const { refundNumber, amount, customerPartyId } = message.payload as any
    console.log(`[FINANCIAL] Received refund.completed for ${refundNumber} — will create refund Journal Entry (LAW-19)`)
  })

  // ===== AUDIT CONSUMER (wildcard — consumes ALL events) =====
  InboxWorker.register('*', 'audit-wildcard-handler', async (message) => {
    // Audit log is already handled by direct event dispatch in the EventBus
  })

  // ===== WARRANTY CONSUMERS (LAW-28: Activation from shipment.delivered) =====

  // When shipment is delivered → activate warranty (LAW-28)
  InboxWorker.register('shipment.delivered', 'warranty-activation-handler', async (message) => {
    console.log(`[WARRANTY] Received shipment.delivered — activating warranty (LAW-28)`)

    // In production: find pending WarrantyCard linked to this shipment
    // and activate it (compute start/end dates from policy)
    // For now: log — the actual activation logic would query WarrantyCard by shipmentId
  })

  // When warranty claim is approved → notify Service context to create Service Order (LAW-25)
  InboxWorker.register('warranty.claim.approved', 'warranty-service-handler', async (message) => {
    const { claimNumber, productInstanceId, customerPartyId } = message.payload as any
    console.log(`[WARRANTY→SERVICE] Claim ${claimNumber} approved — Service should create Service Order (LAW-25)`)

    // In production: Service context would create ServiceOrder from this event
    // No direct call — purely event-driven (LAW-25)
  })

  console.log('[EVENT HANDLERS] Registered all cross-context event handlers (including Warranty — LAW-28)')
}
