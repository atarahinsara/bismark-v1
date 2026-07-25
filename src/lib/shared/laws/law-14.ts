/**
 * LAW-14 — Immutable Business Documents
 *
 * After final approval, business documents (Invoice, Shipment, Payment,
 * JournalEntry, WarrantyCard, etc.) are IMMUTABLE. No direct edits allowed.
 *
 * Any correction must be done via a reversal/correction document:
 *   - Invoice → Credit Note (reversal)
 *   - Payment → Refund (reversal)
 *   - JournalEntry → Reversal Entry
 *   - Shipment → Return Shipment
 *
 * This preserves complete audit history and prevents tampering.
 *
 * Implementation:
 *   - Documents have a 'status' field (draft, approved, issued, etc.)
 *   - Once status reaches 'approved' or 'issued', PATCH is rejected (409)
 *   - Correction requires creating a NEW document linked to the original
 *   - Original document retains its original values forever
 *
 * Example:
 *   POST /sales-invoices/{id}/cancel  ← creates reversal, not edit
 *   POST /payments/{id}/refund        ← creates refund, not edit
 *   POST /journal-entries/{id}/reverse ← creates reversal entry
 */
export const LAW_14_DESCRIPTION = `
LAW-14: Immutable Business Documents

After final approval, documents are IMMUTABLE.

Status transitions:
  draft → pending → approved → issued ← IMMUTABLE from here
                              ↓
                         (correction requires new document)

Correction methods (NOT direct edit):
  Invoice:    Credit Note (reversal invoice)
  Payment:    Refund (reversal payment)
  JournalEntry: Reversal Entry (counter-entry)
  Shipment:   Return Shipment
  SalesOrder: Cancel + new order (if needed)

API pattern:
  PATCH /invoices/{id}     → 409 if status = 'issued'
  POST /invoices/{id}/cancel → creates credit note
`
