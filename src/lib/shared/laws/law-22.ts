/**
 * LAW-22 — No Return Receipt Without Physical Inspection
 *
 * No returned goods may be received into inventory without a documented
 * physical inspection. The inspection records the condition of each item
 * (new, used, damaged, defective) before the return is marked as 'received'.
 *
 * Flow:
 *   Return Order (approved)
 *     → Physical Inspection (record condition per line)
 *     → Return Receipt (create IN ledger entry — LAW-16)
 *
 * FORBIDDEN:
 *   - Receiving return without inspection
 *   - Creating IN InventoryTransaction before inspection is recorded
 */
export const LAW_22_DESCRIPTION = `
LAW-22: No Return Receipt Without Physical Inspection

Return workflow:
  1. Return Order created (draft → submitted → approved)
  2. Physical Inspection (condition: new|used|damaged|defective)
  3. Return Receipt (IN InventoryTransaction — LAW-16)
  4. Close

Inspection fields per line:
  - inspectedCondition: new|used|damaged|defective
  - inspectionNotes: string
  - inspectedBy: string
  - inspectedAt: timestamp

Validation:
  POST /return-orders/{id}/receive
    → All lines must have inspectionCondition set
    → If any line uninspected → 422 (LAW-22)
`
