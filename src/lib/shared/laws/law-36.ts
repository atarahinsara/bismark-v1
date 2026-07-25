/**
 * LAW-36 — Closed Fiscal Period Is Immutable
 *
 * After a Fiscal Period is closed, no Journal Entries may be posted
 * to that period. All postings are rejected.
 *
 * Corrections to closed periods must use Reversal Journal Entries
 * posted to the CURRENT open period (not the closed one).
 *
 * Flow:
 *   Fiscal Period: open → temporarily_closed → closed
 *   On 'closed': reject all JE postings with entryDate in that period
 *
 * Validation:
 *   POST /journal-entries
 *     → Check entryDate against Fiscal Periods
 *     → If period is 'closed' → 422 (LAW-36)
 *     → If period is 'temporarily_closed' → allow only admin override
 */
export const LAW_36_DESCRIPTION = `
LAW-36: Closed Fiscal Period Is Immutable

Fiscal Period statuses:
  open → temporarily_closed → closed

On Journal Entry creation:
  IF fiscal_period.status === 'closed' → 422 (LAW-36)
  IF fiscal_period.status === 'temporarily_closed' → 422 (unless admin override)

Corrections:
  - Create Reversal JE in CURRENT open period
  - Reference original JE (reversed_entry_id)
  - Never edit or delete closed-period entries
`
