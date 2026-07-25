/**
 * Date Range Value Object
 */
export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    if (end < start) throw new Error('DateRange end must be after start')
  }

  contains(date: Date): boolean {
    return date >= this.start && date <= this.end
  }

  overlaps(other: DateRange): boolean {
    return this.start <= other.end && other.start <= this.end
  }

  get durationMs(): number {
    return this.end.getTime() - this.start.getTime()
  }

  get durationDays(): number {
    return Math.ceil(this.durationMs / (1000 * 60 * 60 * 24))
  }
}
