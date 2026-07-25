/**
 * LAW-17 — Reservation Before Shipment
 *
 * No shipment may be created or processed without an active stock reservation.
 * The workflow MUST be: Reserve → Pick → Pack → Ship → Release/Consume.
 *
 * This prevents overselling and ensures stock availability is guaranteed
 * before fulfillment begins.
 *
 * Pattern:
 *   Sales Order (approved)
 *     → Create StockReservation (reserve quantity)
 *     → Create Shipment (references reservation)
 *     → Pick (update pick status)
 *     → Pack (update pack status)
 *     → Ship (create OUT ledger, consume reservation)
 *     → Release unused reservation (if partial)
 *
 * FORBIDDEN:
 *   - Creating Shipment without checking reservation exists
 *   - Shipping more than reserved quantity
 *   - Releasing reservation before shipment is complete
 */
export const LAW_17_DESCRIPTION = `
LAW-17: Reservation Before Shipment

Workflow: Reserve → Pick → Pack → Ship → Consume/Release

Checks:
  1. Shipment creation requires approved Sales Order with reservation
  2. Pick quantity ≤ reserved quantity
  3. Ship consumes reservation (decrements reservedQuantity on StockItem)
  4. Partial shipment → release unused reservation portion

Implementation:
  POST /shipments:
    - Verify Sales Order status = 'approved'
    - Verify StockReservation exists and is active
    - Shipment quantity ≤ reservation.quantity - already_shipped

  POST /shipments/{id}/ship:
    - Create OUT ledger entries (LAW-16)
    - Consume reservation (mark as 'consumed' or decrement)
    - Update Sales Order line quantityShipped
`
