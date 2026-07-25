/**
 * LAW-43 — Tax Is Always Derived From Tax Rules
 *
 * Tax amounts are NEVER stored as a source of truth.
 * They are always calculated from TaxRule definitions at the time of transaction.
 *
 * TaxCalculation records store a SNAPSHOT of the calculation result (for audit),
 * but the authoritative tax amount is always derivable from:
 *   TaxRule(formula, rate) × taxableAmount
 *
 * This is a specific application of LAW-05 (No Aggregate Quantity as Source of Truth)
 * to the Tax domain.
 */
export const LAW_43_DESCRIPTION = `
LAW-43: Tax Is Always Derived From Tax Rules

TaxCalculation = snapshot (for audit trail)
Authoritative tax = TaxRule.effectiveAt(date).formula(taxableAmount)

If tax rules change, historical calculations are NOT recalculated
(snapshot preserves the original calculation context).
But new transactions always use the current effective rule.
`
