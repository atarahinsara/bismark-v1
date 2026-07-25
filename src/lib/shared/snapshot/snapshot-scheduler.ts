/**
 * Snapshot Scheduler — triggers snapshot creation based on policy.
 *
 * In production, this would be a cron job or scheduled task.
 * In sandbox, it can be triggered via API endpoint.
 */

import { SnapshotWorker } from './snapshot-worker'
import { SnapshotPolicy, type SnapshotPolicyConfig } from './snapshot-policy'

export class SnapshotScheduler {
  private static intervalHandle: NodeJS.Timeout | null = null

  /**
   * Start the scheduler.
   * Checks every 5 minutes if a snapshot should be created.
   */
  static start(intervalMinutes: number = 5): void {
    if (this.intervalHandle) return

    const run = async () => {
      const policy = SnapshotPolicy.getEffectivePolicy()

      if (policy.type === 'nightly') {
        // Check if nightly snapshot should run
        const lastRun = await this.getLastNightlyRun()
        if (SnapshotPolicy.shouldRunNightly(lastRun, policy.nightlyTime)) {
          console.log('[SNAPSHOT] Starting nightly snapshot...')
          const result = await SnapshotWorker.createNightlySnapshots()
          console.log(`[SNAPSHOT] Nightly complete: ${result.processed} processed, ${result.failed} failed`)
          await this.recordNightlyRun()
        }
      }
    }

    // Run immediately, then on interval
    run()
    this.intervalHandle = setInterval(run, intervalMinutes * 60 * 1000)
  }

  static stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }

  /**
   * Trigger a manual snapshot for a specific stock item.
   */
  static async triggerManual(stockItemId: string, tenantId: string): Promise<void> {
    await SnapshotWorker.createSnapshot(stockItemId, tenantId, 'manual')
  }

  /**
   * Trigger snapshots for all stock items (manual bulk).
   */
  static async triggerBulkManual(tenantId?: string): Promise<{
    processed: number
    failed: number
  }> {
    return SnapshotWorker.createNightlySnapshots(tenantId)
  }

  private static async getLastNightlyRun(): Promise<Date | null> {
    // In production, this would be stored in a settings/config table
    // For sandbox, we check the latest nightly snapshot
    const { db } = await import('@/lib/db')
    const latest = await db.stockBalanceSnapshot.findFirst({
      where: { snapshotType: 'nightly' },
      orderBy: { snapshotAt: 'desc' },
      select: { snapshotAt: true },
    })
    return latest?.snapshotAt ?? null
  }

  private static async recordNightlyRun(): Promise<void> {
    // In production, update a config table with last_run_at
    // For sandbox, the snapshot itself serves as the record
  }
}
