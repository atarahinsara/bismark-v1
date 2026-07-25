/**
 * LAW-54 — Rule Execution Must Be Fully Auditable
 *
 * Every rule evaluation MUST be recorded with:
 *   - Input snapshot (context, event, payload)
 *   - Rule version used
 *   - Evaluation result (matched rules, actions, decision)
 *   - Execution duration
 *   - Step-by-step audit (each condition evaluated + result)
 *
 * This ensures complete traceability for compliance and debugging.
 */
export const LAW_54_DESCRIPTION = `
LAW-54: Rule Execution Must Be Fully Auditable

Every evaluation produces:
  RuleExecution: { input, result, duration, ruleVersion }
  RuleAudit: [{ step, expression, result, duration }]

Stored permanently (append-only — like audit_logs).
Can be queried for compliance audits.
`
