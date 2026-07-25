/**
 * LAW-16 — No Physical Movement Without Ledger Event
 *
 * No physical stock movement (pick, pack, ship, receive, transfer, adjust)
 * may occur without a corresponding InventoryTransaction ledger entry.
 *
 * This ensures complete traceability: every physical movement has a
 * permanent record in the ledger (LAW-05).
 *
 * Pattern:
 *   When shipping:
 *     1. Create OUT InventoryTransaction (ledger entry)
 *     2. Update Shipment status to 'shipped'
 *     Both in same UnitOfWork transaction (LAW-12)
 *
 * FORBIDDEN:
 *   - Updating Shipment status to 'shipped' without creating ledger entries
 *   - Updating StockItem quantities directly (LAW-05)
 *   - Physical movement without audit trail
 */
export const LAW_16_DESCRIPTION = `
LAW-16: No Physical Movement Without Ledger Event

Every physical stock movement MUST create an InventoryTransaction:
  - Pick → no ledger (just reservation update)
  - Pack → no ledger (just status change)
  - Ship → OUT InventoryTransaction (LAW-16 enforced here)
  - Receive → IN InventoryTransaction
  - Transfer → OUT + IN InventoryTransaction pair
  - Adjust → ADJUSTMENT InventoryTransaction
  - Count → ADJUSTMENT InventoryTransaction (on approval)

Implementation:
  Ship operation MUST:
    1. Begin UnitOfWork (LAW-12)
    2. Create OUT InventoryTransaction for each line
    3. Update Shipment status to 'shipped'
    4. Append Outbox event (LAW-08)
    5. Commit

  If step 2 is skipped → data inconsistency (physical moved, ledger not updated)
`
