/**
 * LAW-28 — Warranty Activation Only From Shipment Delivered Event
 *
 * Warranty activation must ONLY occur when the 'shipment.delivered' event
 * is received by the Warranty context. Never from direct Sales calls.
 *
 * Flow:
 *   Sales → Shipment → Ship → Deliver
 *     → publishes 'shipment.delivered' event
 *     → Warranty context (Inbox handler) receives event
 *     → Creates/Activates WarrantyCard
 *
 * FORBIDDEN:
 *   - Sales calling WarrantyCommandService.activate()
 *   - Warranty querying SalesOrder status directly
 *   - Manual warranty activation without shipment proof
 */
export const LAW_28_DESCRIPTION = `
LAW-28: Warranty Activation Only From Shipment Delivered Event

Event flow:
  shipment.delivered (Outbox) → Warranty Inbox Handler → activate warranty

FORBIDDEN:
  - Direct API call from Sales to Warranty
  - Warranty activation without delivery confirmation
  - Manual activation (admin override only for edge cases)
`
