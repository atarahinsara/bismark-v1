/**
 * LAW-32 — Every Repair Must Pass Quality Control Before Delivery
 *
 * No service order may transition to 'ready' or 'delivered' without
 * a documented Quality Control check (pass/fail/conditional).
 *
 * Flow:
 *   Repair completed → QC → Pass → Ready → Delivered
 *   Repair completed → QC → Fail → Back to Repair
 *
 * FORBIDDEN:
 *   - Skipping QC step
 *   - Delivering without QC pass
 */
export const LAW_32_DESCRIPTION = `
LAW-32: Every Repair Must Pass Quality Control Before Delivery

Service Order workflow:
  open → diagnosis → repair → qc → ready → delivered → closed
                                    ↓
                              pass|fail|conditional
                                    ↓
                              fail → back to repair

Validation:
  POST /service-orders/{id}/ready
    → QC must exist with result = 'pass' or 'conditional'
    → if no QC → 422 (LAW-32)
`
