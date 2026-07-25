/**
 * LAW-38 — Financial Period Close Requires Zero Validation Errors
 *
 * Before closing a fiscal period, ALL validations must pass.
 * If any validation fails, the close operation MUST rollback.
 *
 * Validations:
 *   1. Trial Balance difference = 0
 *   2. No draft Journal Entries in the period
 *   3. No pending postings (Outbox messages for Financial)
 *   4. No open accruals
 *   5. No pending reversals
 */
export const LAW_38_DESCRIPTION = `
LAW-38: Financial Period Close Requires Zero Validation Errors

Pre-close checklist:
  ✓ Trial Balance balanced (LAW-35)
  ✓ No draft JEs in period
  ✓ No pending Financial events in Outbox
  ✓ No unposted accruals
  ✓ No pending reversal requests

If ANY check fails → close rejected (422) → rollback
`
