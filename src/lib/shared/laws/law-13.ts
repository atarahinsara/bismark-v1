/**
 * LAW-13 — Financial Integrity
 *
 * NO module other than Financial may create Journal Entries.
 * Other Contexts (Sales, Service, Inventory, Warranty) only publish
 * Domain Events. The Financial Context listens to those events and
 * creates the appropriate accounting entries.
 *
 * This enforces single-responsibility for accounting and ensures
 * all financial records are consistent and auditable.
 *
 * Pattern:
 *   Sales Context:
 *     → publishes 'sales_invoice.issued' event
 *   Financial Context:
 *     → listens to 'sales_invoice.issued'
 *     → creates JournalEntry (debit AR, credit Revenue)
 *
 * FORBIDDEN:
 *   - Sales module calling JournalEntry.create()
 *   - Service module calling JournalEntry.create()
 *   - Inventory module calling JournalEntry.create()
 *
 * ALLOWED:
 *   - Financial module creating JournalEntry
 *   - Any module publishing events that Financial consumes
 */
export const LAW_13_DESCRIPTION = `
LAW-13: Financial Integrity

ONLY the Financial Context may create Journal Entries.

Other contexts publish Domain Events:
  - Sales → 'sales_invoice.issued', 'payment.received'
  - Service → 'service_order.completed'
  - Inventory → 'stock_adjustment.posted'
  - Warranty → 'warranty_claim.approved'

Financial Context consumes events and creates Journal Entries:
  - On 'sales_invoice.issued' → JournalEntry (debit AR, credit Revenue)
  - On 'payment.received' → JournalEntry (debit Cash, credit AR)
  - On 'stock_adjustment.posted' → JournalEntry (debit Inventory Adj, credit Inventory)

This ensures:
  - Single source of truth for accounting
  - All entries pass through Financial validation
  - No double-counting or missing entries
  - Clean audit trail
`
