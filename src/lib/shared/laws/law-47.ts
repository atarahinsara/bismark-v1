/**
 * LAW-47 — Financial Reports Must Be Reproducible For Any Historical Date
 *
 * Given the same asOfDate, the report must always produce identical results
 * regardless of when it's run. This is guaranteed because:
 *   - Posted JEs are immutable (LAW-37)
 *   - Closed periods are locked (LAW-36)
 *   - No data is ever deleted from the ledger
 *
 * Reproducibility test:
 *   Report(date=2025-06-30) run on 2025-07-01 === Report(date=2025-06-30) run on 2026-01-01
 */
export const LAW_47_DESCRIPTION = `
LAW-47: Financial Reports Must Be Reproducible For Any Historical Date

Given: same asOfDate, same tenant
Result: always identical (posted JEs are immutable — LAW-37)
`
