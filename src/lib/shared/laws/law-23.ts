/**
 * LAW-23 — Refund Requires Approved Return
 *
 * No Refund or Credit Note may be created without an approved Return Order.
 * This ensures that money is never returned without goods being returned
 * and the return being formally approved.
 *
 * Flow:
 *   Return Order (approved) → Refund (created)
 *   Return Order (approved) → Credit Note (auto-created on approval)
 *
 * FORBIDDEN:
 *   - Creating Refund without approved Return Order
 *   - Creating Credit Note without approved Return Order
 */
export const LAW_23_DESCRIPTION = `
LAW-23: Refund Requires Approved Return

Validation:
  POST /refunds
    → returnOrderId required
    → returnOrder.status must be 'approved' or 'received' or 'closed'
    → refund amount ≤ return order total

  POST /return-orders/{id}/approve
    → Auto-creates Credit Note (linked to original Invoice)
    → Publishes 'credit_note.issued' event (Financial creates reversal JE — LAW-19)
`
