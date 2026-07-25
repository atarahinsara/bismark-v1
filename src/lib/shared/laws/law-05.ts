/**
 * LAW-05 — No Aggregate Quantity as Source of Truth
 *
 * No Context may maintain aggregate quantities (stock, balance, points, etc.)
 * as the Source of Truth. All aggregate quantities MUST be derived from:
 *   - An immutable Ledger (append-only transactions), OR
 *   - A Snapshot explicitly marked as derived
 *
 * This applies to:
 *   - Inventory (stock quantities → derived from InventoryTransaction ledger)
 *   - Financial (account balances → derived from JournalEntry ledger)
 *   - Loyalty (point balances → derived from PointTransaction ledger)
 *   - BI dashboards (all aggregates → derived from ledgers)
 *
 * Rationale:
 *   - Auditability: every quantity change has a traceable transaction
 *   - No race conditions: ledger is append-only, no UPDATE on balances
 *   - Reporting: simple SQL aggregation over ledger
 *   - Historical accuracy: balances at any point in time can be reconstructed
 *
 * Enforcement:
 *   - Database: balance columns must NOT exist on entity tables
 *   - Generated columns are allowed ONLY for deterministic derivations
 *     (e.g., available = on_hand - reserved, where on_hand is itself derived)
 *   - StockItem has NO on_hand_quantity column — it's derived from ledger
 */
export const LAW_05_DESCRIPTION = `
LAW-05: No Aggregate Quantity as Source of Truth

FORBIDDEN:
  - StockItem { on_hand_quantity: number }  ← Source of Truth violation
  - Account { balance: number }             ← Source of Truth violation
  - LoyaltyCard { points: number }          ← Source of Truth violation

REQUIRED:
  - InventoryTransaction (append-only ledger) → StockItem.on_hand derived
  - JournalEntry (append-only ledger) → Account.balance derived
  - PointTransaction (append-only ledger) → LoyaltyCard.points derived

ALLOWED:
  - Generated columns for deterministic derivations (e.g., available = on_hand - reserved)
  - Snapshot tables explicitly marked as derived (e.g., StockBalance with snapshot_at)
  - Materialized views for read-optimized queries
`
