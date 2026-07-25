/**
 * LAW-45 — Tax Rules Are Versioned And Effective-Dated
 *
 * Tax Rules have effectiveFrom and effectiveTo dates.
 * When a tax rate changes, a new TaxRule version is created;
 * the old rule's effectiveTo is set to the day before.
 *
 * This ensures:
 *   - Historical transactions retain their original tax calculation
 *   - New transactions use the current effective rule
 *   - Tax audits can reconstruct any historical calculation
 *
 * Query for effective rule:
 *   SELECT * FROM tax_rules
 *   WHERE taxCodeId = ?
 *     AND effectiveFrom <= transactionDate
 *     AND (effectiveTo IS NULL OR effectiveTo >= transactionDate)
 *   ORDER BY priority DESC
 *   LIMIT 1
 */
export const LAW_45_DESCRIPTION = `
LAW-45: Tax Rules Are Versioned And Effective-Dated

Fields:
  - effectiveFrom: DateTime (required)
  - effectiveTo: DateTime? (null = currently active)
  - version: Int (incremented on each change)
  - priority: Int (higher = more specific, evaluated first)

Rule change flow:
  1. Old rule: effectiveTo = dayBefore(newRule.effectiveFrom)
  2. New rule: effectiveFrom = changeDate, effectiveTo = null
  3. Old rule version preserved (never deleted — LAW-14)
`
