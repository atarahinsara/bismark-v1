/**
 * Snapshot Worker — creates stock balance snapshots.
 *
 * LAW-10: Snapshots are derived from the ledger (not a separate source of truth).
 *
 * Snapshot creation:
 *   1. Calculate current on_hand from ledger (SUM of all transactions)
 *   2. Store snapshot with: on_hand, reserved, last_transaction_id, snapshot_at
 *   3. Future balance queries use: snapshot.on_hand + SUM(transactions after snapshot)
 *
 * Cleanup:
 *   - Keep last N snapshots per stock item (configurable, default: 7)
 *   - Older snapshots are deleted (or archived in production)
 */

import { db } from '@/lib/db'
import { SnapshotPolicy, type SnapshotPolicyConfig } from './snapshot-policy'

export class SnapshotWorker {
  /**
   * Create a snapshot for a single stock item.
   */
  static async createSnapshot(
    stockItemId: string,
    tenantId: string,
    snapshotType: 'nightly' | 'threshold' | 'manual' = 'manual',
  ): Promise<void> {
    // Calculate current balance from ledger (LAW-05)
    const ledgerSum = await db.inventoryTransaction.aggregate({
      where: { stockItemId },
      _sum: { quantity: true },
    })

    const stockItem = await db.stockItem.findUnique({ where: { id: stockItemId } })
    if (!stockItem) return

    const onHand = ledgerSum._sum.quantity ?? 0

    // Get last transaction ID
    const lastTxn = await db.inventoryTransaction.findFirst({
      where: { stockItemId },
      orderBy: { occurredAt: 'desc' },
      select: { id: true },
    })

    // Create snapshot
    await db.stockBalanceSnapshot.create({
      data: {
        tenantId,
        stockItemId,
        onHandQuantity: onHand,
        reservedQuantity: stockItem.reservedQuantity,
        lastTransactionId: lastTxn?.id ?? null,
        snapshotType,
      },
    })

    // Cleanup old snapshots (keep last N)
    await this.cleanupOldSnapshots(stockItemId, tenantId)
  }

  /**
   * Create snapshots for all active stock items (used by nightly job).
   */
  static async createNightlySnapshots(tenantId?: string): Promise<{
    processed: number
    failed: number
  }> {
    const where = {
      deletedAt: null,
      ...(tenantId ? { tenantId } : {}),
    }

    const stockItems = await db.stockItem.findMany({
      where,
      select: { id: true, tenantId: true },
    })

    let processed = 0
    let failed = 0

    for (const item of stockItems) {
      try {
        await this.createSnapshot(item.id, item.tenantId, 'nightly')
        processed++
      } catch (e) {
        console.error(`[SNAPSHOT] Failed for stock item ${item.id}:`, e)
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * Get the latest snapshot for a stock item.
   */
  static async getLatestSnapshot(stockItemId: string) {
    return db.stockBalanceSnapshot.findFirst({
      where: { stockItemId },
      orderBy: { snapshotAt: 'desc' },
    })
  }

  /**
   * Calculate balance using snapshot + transactions after snapshot (LAW-10).
   * This is the optimized query path for large ledgers.
   */
  static async getBalanceWithSnapshot(stockItemId: string): Promise<{
    onHand: number
    reserved: number
    snapshotAt: Date | null
    transactionsAfterSnapshot: number
  }> {
    const snapshot = await this.getLatestSnapshot(stockItemId)

    if (!snapshot) {
      // No snapshot — calculate from full ledger
      const sum = await db.inventoryTransaction.aggregate({
        where: { stockItemId },
        _sum: { quantity: true },
      })
      const stockItem = await db.stockItem.findUnique({ where: { id: stockItemId } })
      return {
        onHand: sum._sum.quantity ?? 0,
        reserved: stockItem?.reservedQuantity ?? 0,
        snapshotAt: null,
        transactionsAfterSnapshot: await db.inventoryTransaction.count({ where: { stockItemId } }),
      }
    }

    // Sum only transactions AFTER the snapshot
    const postSnapshotSum = await db.inventoryTransaction.aggregate({
      where: {
        stockItemId,
        occurredAt: { gt: snapshot.snapshotAt },
      },
      _sum: { quantity: true },
    })

    const transactionsAfterSnapshot = await db.inventoryTransaction.count({
      where: {
        stockItemId,
        occurredAt: { gt: snapshot.snapshotAt },
      },
    })

    return {
      onHand: snapshot.onHandQuantity + (postSnapshotSum._sum.quantity ?? 0),
      reserved: snapshot.reservedQuantity,
      snapshotAt: snapshot.snapshotAt,
      transactionsAfterSnapshot,
    }
  }

  /**
   * Delete old snapshots, keeping only the last N.
   */
  private static async cleanupOldSnapshots(
    stockItemId: string,
    _tenantId: string,
    keepN: number = 7,
  ): Promise<void> {
    const snapshots = await db.stockBalanceSnapshot.findMany({
      where: { stockItemId },
      orderBy: { snapshotAt: 'desc' },
      select: { id: true },
    })

    if (snapshots.length <= keepN) return

    const toDelete = snapshots.slice(keepN).map((s) => s.id)
    await db.stockBalanceSnapshot.deleteMany({
      where: { id: { in: toDelete } },
    })
  }
}
