/**
 * LAW-34 — Only Financial Context May Post To General Ledger
 *
 * No Context other than Financial may create, update, or delete
 * Journal Entries or post to the General Ledger.
 *
 * This is the enforcement of LAW-13/LAW-19 for the Financial context.
 * All other contexts publish Domain Events. Financial consumes them
 * via Inbox and creates the appropriate Journal Entries.
 *
 * FORBIDDEN:
 *   - Sales calling db.journalEntry.create()
 *   - Billing calling db.journalEntry.create()
 *   - Inventory calling db.journalEntry.create()
 *   - Service calling db.journalEntry.create()
 *
 * ALLOWED:
 *   - Financial Inbox handler receives 'invoice.issued'
 *   → Financial creates JournalEntry (debit AR, credit Revenue)
 */
export const LAW_34_DESCRIPTION = `
LAW-34: Only Financial Context May Post To General Ledger

ONLY Financial Context:
  - db.journalEntry.create()
  - db.journalEntryLine.create()
  - db.journalEntry.update()

ALL other contexts:
  - Publish events → Financial consumes → creates JE

This is enforced at code level (no imports of Financial repos from other contexts).
`
