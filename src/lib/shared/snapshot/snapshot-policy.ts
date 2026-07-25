/**
 * Snapshot Policy — determines WHEN to create snapshots.
 *
 * LAW-10: Snapshots prevent SUM() over millions of ledger entries from being slow.
 *
 * Policies:
 *   - nightly: create snapshot every night at 02:00 AM for all active stock items
 *   - threshold: create snapshot every N transactions (default: 1000)
 *   - manual: admin triggers snapshot on demand
 *   - interval: create snapshot every N hours
 *
 * Configuration is stored in settings table (configurable, not hardcoded).
 */

export type SnapshotPolicyType = 'nightly' | 'threshold' | 'manual' | 'interval'

export interface SnapshotPolicyConfig {
  type: SnapshotPolicyType
  threshold?: number       // for 'threshold' type: transactions per snapshot
  intervalHours?: number   // for 'interval' type: hours between snapshots
  nightlyTime?: string     // for 'nightly' type: HH:MM format
  keepLastN?: number       // keep last N snapshots per stock item (default: 7)
}

export const DEFAULT_SNAPSHOT_POLICY: SnapshotPolicyConfig = {
  type: 'nightly',
  nightlyTime: '02:00',
  keepLastN: 7,
}

export class SnapshotPolicy {
  /**
   * Check if a snapshot should be created for a stock item
   * based on the threshold policy.
   */
  static shouldSnapshotByThreshold(
    transactionCount: number,
    lastSnapshotTransactionCount: number,
    threshold: number = 1000,
  ): boolean {
    const transactionsSinceSnapshot = transactionCount - lastSnapshotTransactionCount
    return transactionsSinceSnapshot >= threshold
  }

  /**
   * Check if nightly snapshot should run (based on current time).
   */
  static shouldRunNightly(
    lastRunAt: Date | null,
    nightlyTime: string = '02:00',
  ): boolean {
    if (!lastRunAt) return true

    const now = new Date()
    const [hours, minutes] = nightlyTime.split(':').map(Number)
    const targetTime = new Date()
    targetTime.setHours(hours, minutes, 0, 0)

    // If last run was before today's target time and now is after target time
    if (lastRunAt < targetTime && now >= targetTime) {
      return true
    }

    return false
  }

  /**
   * Get the effective policy (from config or default).
   */
  static getEffectivePolicy(config?: Partial<SnapshotPolicyConfig>): SnapshotPolicyConfig {
    return { ...DEFAULT_SNAPSHOT_POLICY, ...config }
  }
}
