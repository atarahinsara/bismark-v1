/**
 * LAW-24 — Replacement Is Return + New Fulfillment
 *
 * Replacement is NOT a separate entity. It is a composition of:
 *   1. Return Order (receive defective item back)
 *   2. New Shipment (send replacement item)
 *
 * The two are linked via reference fields, not a separate Replacement aggregate.
 *
 * Flow:
 *   Return Order (approved + received)
 *     → Create new Sales Order (type: replacement, references return)
 *     → Create Shipment from replacement order
 *     → Ship replacement
 *
 * This keeps the domain model clean — no separate "Replacement" table.
 * The relationship is tracked via:
 *   - ReturnOrder.replacementSalesOrderId
 *   - SalesOrder.originalReturnOrderId (metadata)
 */
export const LAW_24_DESCRIPTION = `
LAW-24: Replacement Is Return + New Fulfillment

NO separate Replacement entity.

Replacement = Return Order + New Sales Order + New Shipment

Linking:
  ReturnOrder.replacementSalesOrderId → SalesOrder.id
  SalesOrder.metadata.originalReturnOrderId → ReturnOrder.id

API:
  POST /return-orders/{id}/create-replacement
    → Creates new Sales Order (references return)
    → Returns SalesOrder (user then creates Shipment normally)
`
