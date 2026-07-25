/**
 * LAW-46 — Financial Statements Are Derived From Posted Journal Entries Only
 *
 * All financial statements (Balance Sheet, P&L, Cash Flow, Equity, Trial Balance)
 * are computed exclusively from posted Journal Entries.
 *
 * No pre-computed summary tables, no cached results, no materialized views
 * as source of truth (caching is allowed for performance but must be invalidatable).
 *
 * Query pattern:
 *   SELECT * FROM journal_entries WHERE status = 'posted' AND entryDate <= asOfDate
 *   → aggregate by account type → build statement
 */
export const LAW_46_DESCRIPTION = `
LAW-46: Financial Statements Are Derived From Posted Journal Entries Only

Source: journal_entries WHERE status = 'posted'
NO pre-stored summary tables as truth.
Caching allowed (for performance) but must be invalidatable.
`
