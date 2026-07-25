/**
 * LAW-48 — Reporting Never Mutates Accounting Data
 *
 * Financial reporting endpoints are strictly read-only.
 * They NEVER create, update, or delete any accounting records.
 *
 * Allowed: reading JE lines, aggregating, formatting output
 * FORBIDDEN: db.journalEntry.create(), db.journalEntry.update(), etc.
 *
 * Exception: Outbox events for 'report.generated' are allowed
 * (they don't mutate accounting data — they're metadata).
 */
export const LAW_48_DESCRIPTION = `
LAW-48: Reporting Never Mutates Accounting Data

Report endpoints: GET only (read-only).
No INSERT/UPDATE/DELETE on journal_entries, chart_of_accounts, etc.
Outbox events (report.generated) are allowed (metadata, not accounting).
`
