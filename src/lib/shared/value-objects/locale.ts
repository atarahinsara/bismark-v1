/**
 * Locale Value Object
 */
export class Locale {
  static readonly FA_IR = new Locale('fa-IR', 'rtl')
  static readonly EN_US = new Locale('en-US', 'ltr')

  static readonly SUPPORTED = [Locale.FA_IR, Locale.EN_US]

  constructor(
    public readonly code: string,
    public readonly direction: 'ltr' | 'rtl',
  ) {}

  static fromCode(code: string): Locale {
    const locale = Locale.SUPPORTED.find((l) => l.code === code)
    if (!locale) throw new Error(`Unsupported locale: ${code}`)
    return locale
  }

  get isRtl(): boolean {
    return this.direction === 'rtl'
  }

  get isLtr(): boolean {
    return this.direction === 'ltr'
  }
}
