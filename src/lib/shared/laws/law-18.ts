/**
 * LAW-18 — Shipment Immutable After Shipping
 *
 * Once a shipment's status reaches 'shipped', it becomes immutable.
 * No direct edits to shipment or its lines are allowed.
 *
 * Corrections must be done via:
 *   - Return Shipment (for delivered items that need to come back)
 *   - Adjustment (for discrepancies found during delivery)
 *
 * This is a specific application of LAW-14 (Immutable Business Documents)
 * to the Shipment aggregate.
 *
 * Immutable statuses: shipped, delivered, returned
 * Editable statuses: draft, picking, packing
 *
 * Allowed status transitions:
 *   draft → picking → packing → shipped → delivered → returned
 *                                  ↓
 *                             (immutable from here)
 */
export const LAW_18_DESCRIPTION = `
LAW-18: Shipment Immutable After Shipping

Status flow:
  draft → picking → packing → shipped → delivered → returned
                                ↓
                          IMMUTABLE

After 'shipped':
  - PATCH /shipments/{id} → 409 Conflict
  - POST /shipments/{id}/return → creates return shipment (reversal)

Implementation:
  immutable_statuses = ['shipped', 'delivered', 'returned']
  
  On PATCH:
    if shipment.status in immutable_statuses:
      throw 409 (LAW-18: Shipment is immutable after shipping)
`
