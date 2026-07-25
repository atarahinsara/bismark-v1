/**
 * LAW-50 — Business Rules Are Declarative And Versioned
 *
 * Business rules are defined as DATA (not code).
 * They are versioned with effective dates (like TaxRule — LAW-45).
 *
 * Rules are evaluated by the Rule Engine, not hardcoded in domain logic.
 *
 * Rule structure:
 *   { condition: "amount > 1000000", action: "require_approval", priority: 100 }
 *
 * Versioning:
 *   - Old rules preserved (never deleted — audit trail)
 *   - New rules created with new version number
 *   - Effective dates control which rule is active
 */
export const LAW_50_DESCRIPTION = `
LAW-50: Business Rules Are Declarative And Versioned

Rules = data (JSON conditions + actions), NOT hardcoded in domain logic.
Versioned: effectiveFrom, effectiveTo, version (like LAW-45 for Tax).
Evaluated by Rule Engine at runtime.
`
