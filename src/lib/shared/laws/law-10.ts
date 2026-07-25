/**
 * LAW-10 — Snapshot Policy for Ledger Scalability
 *
 * LAW-05 requires balances to be derived from the ledger. However, after
 * millions of transactions, SUM(quantity) becomes slow.
 *
 * Solution: periodically create snapshots. Balance = snapshot + transactions_after_snapshot.
 *
 * Snapshot Policy:
 *   - Time-based: nightly snapshot at 02:00 AM
 *   - Count-based: every 1000 transactions per stock item
 *   - Manual: admin can trigger snapshot on demand
 *
 * Calculation:
 *   balance = snapshot.on_hand_quantity
 *           + SUM(transactions.quantity WHERE occurred_at > snapshot.snapshot_at)
 *
 * Table: stock_balance_snapshots
 *   - id (UUID)
 *   - stock_item_id (UUID)
 *   - on_hand_quantity (float) — frozen balance at snapshot time
 *   - reserved_quantity (float)
 *   - last_transaction_id (UUID) — last transaction included in snapshot
 *   - snapshot_at (timestamp)
 *   - snapshot_type (nightly | threshold | manual)
 *
 * Query optimization:
 *   SELECT
 *     s.on_hand_quantity + COALESCE(SUM(t.quantity), 0) AS on_hand
 *   FROM stock_balance_snapshots s
 *   LEFT JOIN inventory_transactions t
 *     ON t.stock_item_id = s.stock_item_id
 *     AND t.occurred_at > s.snapshot_at
 *   WHERE s.stock_item_id = ?
 *   ORDER BY s.snapshot_at DESC
 *   LIMIT 1
 */
export const LAW_10_DESCRIPTION = `
LAW-10: Snapshot Policy

Table: stock_balance_snapshots
  - stock_item_id (FK)
  - on_hand_quantity (frozen at snapshot time)
  - reserved_quantity
  - last_transaction_id
  - snapshot_at
  - snapshot_type: nightly | threshold | manual

Balance calculation:
  on_hand = latest_snapshot.on_hand
         + SUM(transactions AFTER latest_snapshot)

Snapshot triggers:
  1. Nightly cron (02:00 AM) — for all active stock items
  2. Threshold — when transaction_count % 1000 == 0
  3. Manual — admin endpoint

Cleanup:
  - Keep last 7 snapshots per stock item
  - Older snapshots archived to cold storage
`
