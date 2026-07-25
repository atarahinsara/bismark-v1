/**
 * LAW-52 — Only Rule Engine Evaluates Business Rules
 *
 * No context may evaluate business rules directly.
 * All rule evaluation MUST go through the Rule Engine API.
 *
 * This centralizes decision logic and ensures:
 *   - Consistent evaluation (same input → same output — LAW-53)
 *   - Full audit trail (LAW-54)
 *   - Version control (LAW-50)
 *   - No hardcoded business rules in domain logic
 */
export const LAW_52_DESCRIPTION = `
LAW-52: Only Rule Engine Evaluates Business Rules

FORBIDDEN:
  if (invoice.total > 50000000 && customer.creditScore < 600) { requireApproval() }

ALLOWED:
  const result = await ruleEngine.evaluate({ context: 'invoice', event: 'invoice.created', payload: {...} })
  if (result.decision === 'requireApproval') { ... }
`
