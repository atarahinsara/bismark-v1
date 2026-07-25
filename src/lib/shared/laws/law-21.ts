/**
 * LAW-21 — Invoices Become Immutable After Issue
 *
 * Once an invoice's status reaches 'issued', it becomes immutable.
 * No direct edits to invoice or its lines are allowed.
 *
 * Corrections must be done via:
 *   - Credit Note (for partial/full reversal)
 *   - Cancellation (for full reversal before payment)
 *
 * This is a specific application of LAW-14 to the Invoice aggregate.
 *
 * Immutable statuses: issued, partially_paid, paid, cancelled, reversed
 * Editable statuses: draft
 *
 * Allowed status transitions:
 *   draft → issued → partially_paid → paid
 *                → cancelled (before payment)
 *                → reversed (via credit note)
 */
export const LAW_21_DESCRIPTION = `
LAW-21: Invoices Become Immutable After Issue

Status flow:
  draft → issued → partially_paid → paid
              ↓
         IMMUTABLE from here

After 'issued':
  - PATCH /invoices/{id} → 409 Conflict
  - POST /invoices/{id}/credit-note → creates credit note (reversal)
  - POST /invoices/{id}/cancel → cancels (only if unpaid)

Implementation:
  immutable_statuses = ['issued', 'partially_paid', 'paid', 'cancelled', 'reversed']
  
  On PATCH:
    if invoice.status in immutable_statuses:
      throw 409 (LAW-21: Invoice is immutable after issue)
`
