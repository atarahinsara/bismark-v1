/**
 * BISMARK ERP — Domain Event Catalog
 *
 * Centralized registry of all domain events in the system.
 * Each event defines: payload schema, version, publisher, consumer, retry policy.
 *
 * LAW-15: All events have version
 * LAW-25: All cross-context communication via events
 * LAW-26: All events processed exactly once (Inbox)
 */

export interface EventDefinition {
  eventType: string
  version: string
  publisher: string        // Bounded Context that publishes
  consumers: string[]      // Bounded Contexts that consume
  payloadFields: string[]  // expected fields in payload
  retryPolicy: string      // 'exponential' | 'linear' | 'none'
  idempotencyKey: string   // field used for deduplication
}

export const EVENT_CATALOG: EventDefinition[] = [
  // ===== SALES CONTEXT =====
  {
    eventType: 'sales_order.created', version: '1.0',
    publisher: 'Sales', consumers: ['Audit'],
    payloadFields: ['orderNumber', 'customerPartyId', 'totalAmount', 'lineCount'],
    retryPolicy: 'exponential', idempotencyKey: 'orderId',
  },
  {
    eventType: 'sales_order.approved', version: '1.0',
    publisher: 'Sales', consumers: ['Inventory', 'Saga', 'Audit'],
    payloadFields: ['orderNumber', 'customerPartyId', 'totalAmount', 'currencyCode'],
    retryPolicy: 'exponential', idempotencyKey: 'orderId',
  },
  {
    eventType: 'sales_order.cancelled', version: '1.0',
    publisher: 'Sales', consumers: ['Inventory', 'Saga', 'Audit'],
    payloadFields: ['orderNumber', 'previousStatus', 'reason'],
    retryPolicy: 'exponential', idempotencyKey: 'orderId',
  },

  // ===== FULFILLMENT CONTEXT =====
  {
    eventType: 'shipment.created', version: '1.0',
    publisher: 'Fulfillment', consumers: ['Audit'],
    payloadFields: ['shipmentNumber', 'salesOrderId', 'customerPartyId'],
    retryPolicy: 'exponential', idempotencyKey: 'shipmentId',
  },
  {
    eventType: 'shipment.shipped', version: '1.0',
    publisher: 'Fulfillment', consumers: ['Billing', 'Saga', 'Audit'],
    payloadFields: ['shipmentNumber', 'ledgerEntriesCreated', 'salesOrderId'],
    retryPolicy: 'exponential', idempotencyKey: 'shipmentId',
  },
  {
    eventType: 'shipment.delivered', version: '1.0',
    publisher: 'Fulfillment', consumers: ['Sales', 'Saga', 'Audit'],
    payloadFields: ['shipmentNumber'],
    retryPolicy: 'exponential', idempotencyKey: 'shipmentId',
  },

  // ===== BILLING CONTEXT =====
  {
    eventType: 'invoice.created', version: '1.0',
    publisher: 'Billing', consumers: ['Audit'],
    payloadFields: ['invoiceNumber', 'salesOrderId', 'totalAmount'],
    retryPolicy: 'exponential', idempotencyKey: 'invoiceId',
  },
  {
    eventType: 'invoice.issued', version: '1.0',
    publisher: 'Billing', consumers: ['Financial', 'Audit'],
    payloadFields: ['invoiceNumber', 'customerPartyId', 'totalAmount', 'currencyCode'],
    retryPolicy: 'exponential', idempotencyKey: 'invoiceId',
  },
  {
    eventType: 'invoice.cancelled', version: '1.0',
    publisher: 'Billing', consumers: ['Financial', 'Audit'],
    payloadFields: ['invoiceNumber', 'reason'],
    retryPolicy: 'exponential', idempotencyKey: 'invoiceId',
  },
  {
    eventType: 'payment.allocated', version: '1.0',
    publisher: 'Billing', consumers: ['Financial', 'Saga', 'Audit'],
    payloadFields: ['paymentNumber', 'totalAllocated', 'paymentStatus', 'allocations'],
    retryPolicy: 'exponential', idempotencyKey: 'paymentId',
  },
  {
    eventType: 'payment.received', version: '1.0',
    publisher: 'Billing', consumers: ['Financial', 'Saga', 'Audit'],
    payloadFields: ['paymentNumber', 'amount', 'currencyCode', 'customerPartyId'],
    retryPolicy: 'exponential', idempotencyKey: 'paymentId',
  },
  {
    eventType: 'credit_note.issued', version: '1.0',
    publisher: 'Billing', consumers: ['Financial', 'Audit'],
    payloadFields: ['creditNoteNumber', 'invoiceId', 'customerPartyId', 'totalAmount'],
    retryPolicy: 'exponential', idempotencyKey: 'creditNoteId',
  },

  // ===== RETURNS CONTEXT =====
  {
    eventType: 'return_order.created', version: '1.0',
    publisher: 'Returns', consumers: ['Audit'],
    payloadFields: ['returnNumber', 'customerPartyId', 'totalAmount'],
    retryPolicy: 'exponential', idempotencyKey: 'returnOrderId',
  },
  {
    eventType: 'return_order.approved', version: '1.0',
    publisher: 'Returns', consumers: ['Audit'],
    payloadFields: ['returnNumber', 'refundAmount'],
    retryPolicy: 'exponential', idempotencyKey: 'returnOrderId',
  },
  {
    eventType: 'return_order.received', version: '1.0',
    publisher: 'Returns', consumers: ['Saga', 'Audit'],
    payloadFields: ['returnNumber', 'ledgerEntriesCreated'],
    retryPolicy: 'exponential', idempotencyKey: 'returnOrderId',
  },
  {
    eventType: 'return_order.closed', version: '1.0',
    publisher: 'Returns', consumers: ['Saga', 'Audit'],
    payloadFields: ['returnNumber'],
    retryPolicy: 'exponential', idempotencyKey: 'returnOrderId',
  },
  {
    eventType: 'refund.completed', version: '1.0',
    publisher: 'Returns', consumers: ['Financial', 'Audit'],
    payloadFields: ['refundNumber', 'amount', 'currencyCode', 'customerPartyId', 'refundMethod'],
    retryPolicy: 'exponential', idempotencyKey: 'refundId',
  },

  // ===== INVENTORY CONTEXT =====
  {
    eventType: 'stock_adjustment.posted', version: '1.0',
    publisher: 'Inventory', consumers: ['Financial', 'Audit'],
    payloadFields: ['adjustmentNumber', 'productId', 'quantity', 'reason'],
    retryPolicy: 'exponential', idempotencyKey: 'adjustmentId',
  },

  // ===== SAGA CONTEXT =====
  {
    eventType: 'saga.started', version: '1.0',
    publisher: 'Saga', consumers: ['Audit'],
    payloadFields: ['sagaKey', 'correlationId', 'totalSteps'],
    retryPolicy: 'none', idempotencyKey: 'sagaInstanceId',
  },
  {
    eventType: 'saga.step_completed', version: '1.0',
    publisher: 'Saga', consumers: ['Audit'],
    payloadFields: ['sagaInstanceId', 'stepNumber', 'stepName'],
    retryPolicy: 'none', idempotencyKey: 'sagaInstanceId',
  },
  {
    eventType: 'saga.completed', version: '1.0',
    publisher: 'Saga', consumers: ['Audit'],
    payloadFields: ['sagaInstanceId', 'correlationId'],
    retryPolicy: 'none', idempotencyKey: 'sagaInstanceId',
  },
  {
    eventType: 'saga.compensated', version: '1.0',
    publisher: 'Saga', consumers: ['Audit'],
    payloadFields: ['sagaInstanceId', 'failedStep', 'compensationActions'],
    retryPolicy: 'none', idempotencyKey: 'sagaInstanceId',
  },
]

/**
 * Get event definition by type.
 */
export function getEventDefinition(eventType: string): EventDefinition | undefined {
  return EVENT_CATALOG.find((e) => e.eventType === eventType)
}

/**
 * Get all events published by a context.
 */
export function getEventsByPublisher(publisher: string): EventDefinition[] {
  return EVENT_CATALOG.filter((e) => e.publisher === publisher)
}

/**
 * Get all events consumed by a context.
 */
export function getEventsByConsumer(consumer: string): EventDefinition[] {
  return EVENT_CATALOG.filter((e) => e.consumers.includes(consumer))
}
