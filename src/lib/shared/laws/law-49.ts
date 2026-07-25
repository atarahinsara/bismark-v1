/**
 * LAW-49 — Only Workflow Engine May Change Workflow State
 *
 * No context may directly update the status of a WorkflowInstance.
 * All state transitions MUST go through the Workflow Engine API.
 *
 * This centralizes workflow logic and ensures:
 *   - All transitions are validated (guards, rules)
 *   - All transitions produce audit trail (events)
 *   - No bypass of approval flows
 */
export const LAW_49_DESCRIPTION = `
LAW-49: Only Workflow Engine May Change Workflow State

FORBIDDEN:
  db.workflowInstance.update({ data: { status: 'approved' } })  // from Sales context

ALLOWED:
  POST /api/v1/workflow/instances/{id}/transition
  → Workflow Engine validates guard → updates state → publishes event
`
