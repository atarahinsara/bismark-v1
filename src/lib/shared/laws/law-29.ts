/**
 * LAW-29 — Every Warranty Claim Must Pass Inspection Before Approval
 *
 * No warranty claim may be approved without a documented physical inspection.
 * The inspection records the defect type, severity, and validity assessment.
 *
 * Flow:
 *   Claim (submitted) → Inspection → Approved/Rejected
 *
 * FORBIDDEN:
 *   - Approving a claim without inspection
 *   - Skipping inspection step
 */
export const LAW_29_DESCRIPTION = `
LAW-29: Every Warranty Claim Must Pass Inspection Before Approval

Claim workflow:
  draft → submitted → inspection → approved|rejected → service_order → closed

Inspection fields:
  - defectType: string
  - defectSeverity: minor|moderate|major|critical
  - isCovered: boolean
  - inspectionNotes: string
  - inspectedBy: string
  - inspectedAt: timestamp

Validation:
  POST /warranty-claims/{id}/approve
    → claim must have inspection (isInspected = true)
    → if not inspected → 422 (LAW-29)
`
