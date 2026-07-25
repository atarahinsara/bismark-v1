/**
 * LAW-19 — Only Financial Context Creates Accounting Entries
 *
 * This is the enforcement rule for LAW-13 (Financial Integrity).
 * No Context other than Financial may create Journal Entries or
 * any accounting record (AR Invoice, AP Invoice, Journal Entry).
 *
 * Sales/Billing Contexts publish events:
 *   - 'invoice.issued' → Financial creates AR Invoice + Journal Entry
 *   - 'payment.received' → Financial creates Journal Entry (debit Cash)
 *   - 'credit_note.issued' → Financial creates reversal Journal Entry
 *
 * The Financial Context subscribes to these events and is the SOLE
 * creator of accounting records.
 */
export const LAW_19_DESCRIPTION = `
LAW-19: Only Financial Context Creates Accounting Entries

FORBIDDEN in Sales/Billing/Inventory/Service/Warranty:
  - db.journalEntry.create()
  - db.arInvoice.create()
  - db.apInvoice.create()

ALLOWED:
  - Any module: outbox.append({ eventType: 'invoice.issued', ... })
  - Financial module: listens to events and creates Journal Entries

This ensures:
  - Single source of truth for accounting
  - All entries pass through Financial validation
  - No module can bypass accounting rules
`
