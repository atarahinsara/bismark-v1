/**
 * Money Value Object
 * Immutable representation of a monetary amount + currency.
 */
export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Money amount cannot be negative')
    if (!currency || currency.length !== 3) throw new Error('Currency must be a 3-letter ISO code')
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount + other.amount, this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)
    return new Money(this.amount - other.amount, this.currency)
  }

  multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency)
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`)
    }
  }

  format(locale: string = 'fa-IR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
      maximumFractionDigits: 0,
    }).format(this.amount)
  }

  toJSON() {
    return { amount: this.amount, currency: this.currency }
  }
}
