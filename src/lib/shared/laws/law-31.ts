/**
 * LAW-31 — No Part Consumption Without Inventory Ledger Event
 *
 * When a technician consumes a part during repair, an OUT InventoryTransaction
 * MUST be created in the same UnitOfWork. No direct stock quantity updates.
 *
 * This is a specific application of LAW-16 to the Service context.
 *
 * Flow:
 *   Technician consumes part
 *     → Create OUT InventoryTransaction (negative quantity)
 *     → Update ServiceOrderPart (quantityUsed)
 *     Both in same UnitOfWork (LAW-12)
 *
 * FORBIDDEN:
 *   - Updating StockItem.quantity directly
 *   - Consuming parts without ledger entry
 */
export const LAW_31_DESCRIPTION = `
LAW-31: No Part Consumption Without Inventory Ledger Event

When technician uses a part:
  1. Create OUT InventoryTransaction (append-only — LAW-05)
  2. Update ServiceOrderPart.quantityUsed
  3. Both in same UnitOfWork (LAW-12)

Same principle as LAW-16 but enforced in Service context.
`
