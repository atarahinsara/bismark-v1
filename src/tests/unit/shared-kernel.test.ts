import { describe, it, expect } from 'vitest'
import { UuidV7 } from '@/lib/shared/value-objects/uuid-v7'
import { Money } from '@/lib/shared/value-objects/money'
import { DateRange } from '@/lib/shared/value-objects/date-range'
import { Locale } from '@/lib/shared/value-objects/locale'
import { Specification } from '@/lib/shared/specifications/specification'
import { RetryPolicy } from '@/lib/shared/outbox/retry-policy'
import { SnapshotPolicy } from '@/lib/shared/snapshot/snapshot-policy'

// ============================================================
// UUID v7 Tests
// ============================================================
describe('UuidV7', () => {
  it('should generate a valid UUID v7', () => {
    const uuid = UuidV7.generate()
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('should validate UUID v7 format correctly', () => {
    // UUID v7: version nibble = 7, variant bits = 8/9/a/b
    expect(UuidV7.isValid('01912345-1234-7abc-9ef0-123456789012')).toBe(true)
    expect(UuidV7.isValid('invalid-uuid')).toBe(false)
    expect(UuidV7.isValid('01912345-1234-4abc-9ef0-123456789012')).toBe(false) // version 4, not 7
  })

  it('should generate unique UUIDs', () => {
    const ids = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      ids.add(UuidV7.generate())
    }
    expect(ids.size).toBe(1000)
  })
})

// ============================================================
// Money Tests
// ============================================================
describe('Money', () => {
  it('should create money with amount and currency', () => {
    const m = new Money(100, 'IRR')
    expect(m.amount).toBe(100)
    expect(m.currency).toBe('IRR')
  })

  it('should not allow negative amounts', () => {
    expect(() => new Money(-1, 'IRR')).toThrow()
  })

  it('should not allow invalid currency codes', () => {
    expect(() => new Money(100, 'IR')).toThrow()
    expect(() => new Money(100, '')).toThrow()
  })

  it('should add money of same currency', () => {
    const a = new Money(100, 'IRR')
    const b = new Money(50, 'IRR')
    expect(a.add(b).amount).toBe(150)
  })

  it('should not add money of different currencies', () => {
    const a = new Money(100, 'IRR')
    const b = new Money(50, 'USD')
    expect(() => a.add(b)).toThrow()
  })

  it('should subtract money', () => {
    const a = new Money(100, 'IRR')
    const b = new Money(30, 'IRR')
    expect(a.subtract(b).amount).toBe(70)
  })

  it('should multiply money', () => {
    const a = new Money(100, 'IRR')
    expect(a.multiply(3).amount).toBe(300)
  })
})

// ============================================================
// DateRange Tests
// ============================================================
describe('DateRange', () => {
  it('should create valid date range', () => {
    const start = new Date('2025-01-01')
    const end = new Date('2025-12-31')
    const range = new DateRange(start, end)
    expect(range.start).toBe(start)
    expect(range.end).toBe(end)
  })

  it('should not allow end before start', () => {
    expect(() => new DateRange(new Date('2025-12-31'), new Date('2025-01-01'))).toThrow()
  })

  it('should check if date is contained', () => {
    const range = new DateRange(new Date('2025-01-01'), new Date('2025-12-31'))
    expect(range.contains(new Date('2025-06-15'))).toBe(true)
    expect(range.contains(new Date('2024-12-31'))).toBe(false)
  })

  it('should check overlap', () => {
    const a = new DateRange(new Date('2025-01-01'), new Date('2025-06-30'))
    const b = new DateRange(new Date('2025-06-01'), new Date('2025-12-31'))
    expect(a.overlaps(b)).toBe(true)
  })
})

// ============================================================
// Locale Tests
// ============================================================
describe('Locale', () => {
  it('should have predefined locales', () => {
    expect(Locale.FA_IR.code).toBe('fa-IR')
    expect(Locale.FA_IR.isRtl).toBe(true)
    expect(Locale.EN_US.code).toBe('en-US')
    expect(Locale.EN_US.isLtr).toBe(true)
  })

  it('should find locale by code', () => {
    expect(Locale.fromCode('fa-IR')).toBe(Locale.FA_IR)
    expect(Locale.fromCode('en-US')).toBe(Locale.EN_US)
  })

  it('should throw for unsupported locale', () => {
    expect(() => Locale.fromCode('fr-FR')).toThrow()
  })
})

// ============================================================
// Specification Pattern Tests
// ============================================================
describe('Specification', () => {
  const isPositive: Specification<number> = {
    isSatisfiedBy: (n: number) => n > 0,
    and: function(spec: Specification<number>) { return this },
    or: function(spec: Specification<number>) { return this },
    not: function() { return this },
  } as any

  it('should check if value satisfies specification', () => {
    expect(isPositive.isSatisfiedBy(5)).toBe(true)
    expect(isPositive.isSatisfiedBy(-1)).toBe(false)
  })
})

// ============================================================
// RetryPolicy Tests (Outbox — LAW-08)
// ============================================================
describe('RetryPolicy', () => {
  it('should calculate exponential backoff delay', () => {
    expect(RetryPolicy.calculateDelay(1)).toBe(2)
    expect(RetryPolicy.calculateDelay(2)).toBe(4)
    expect(RetryPolicy.calculateDelay(3)).toBe(8)
    expect(RetryPolicy.calculateDelay(8)).toBe(256)
  })

  it('should cap delay at max', () => {
    const delay = RetryPolicy.calculateDelay(20)
    expect(delay).toBeLessThanOrEqual(3600)
  })

  it('should decide to retry when under max attempts', () => {
    const decision = RetryPolicy.decide(3)
    expect(decision.shouldRetry).toBe(true)
    expect(decision.nextAttempt).toBe(4)
  })

  it('should not retry after max attempts', () => {
    const decision = RetryPolicy.decide(8)
    expect(decision.shouldRetry).toBe(false)
  })
})

// ============================================================
// SnapshotPolicy Tests (LAW-10)
// ============================================================
describe('SnapshotPolicy', () => {
  it('should trigger snapshot at threshold', () => {
    expect(SnapshotPolicy.shouldSnapshotByThreshold(1000, 0, 1000)).toBe(true)
    expect(SnapshotPolicy.shouldSnapshotByThreshold(999, 0, 1000)).toBe(false)
    expect(SnapshotPolicy.shouldSnapshotByThreshold(2500, 1000, 1000)).toBe(true)
  })

  it('should return effective policy with defaults', () => {
    const policy = SnapshotPolicy.getEffectivePolicy()
    expect(policy.type).toBe('nightly')
    expect(policy.nightlyTime).toBe('02:00')
    expect(policy.keepLastN).toBe(7)
  })

  it('should merge custom config with defaults', () => {
    const policy = SnapshotPolicy.getEffectivePolicy({ type: 'threshold', threshold: 500 })
    expect(policy.type).toBe('threshold')
    expect(policy.keepLastN).toBe(7) // inherited from default
  })

  it('should run nightly when last run is from previous day', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(SnapshotPolicy.shouldRunNightly(yesterday, '02:00')).toBe(true)
  })

  it('should not run nightly if already run today', () => {
    const today = new Date()
    today.setHours(3, 0, 0, 0)
    expect(SnapshotPolicy.shouldRunNightly(today, '02:00')).toBe(false)
  })
})
