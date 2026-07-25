/**
 * UUID v7 Generator (time-ordered, sortable, globally unique)
 * Mirrors App\Shared\Kernel\Support\UuidV7Generator in Laravel.
 *
 * Why UUID v7?
 * - Time-ordered → optimal B-tree index performance
 * - Globally unique → safe for offline-first mobile clients
 * - No coordination needed → can be generated client-side
 */
export class UuidV7 {
  /**
   * Generate a new UUID v7 string.
   */
  static generate(): string {
    const unixTsMs = Date.now()

    // 48-bit timestamp (6 bytes) — high 32 bits + low 16 bits
    const tsHigh = Math.floor(unixTsMs / 2 ** 16)
    const tsLow = unixTsMs & 0xffff

    // 10 random bytes (as hex)
    const randBytes = new Uint8Array(10)
    crypto.getRandomValues(randBytes)

    // Set version 7 (top 4 bits of byte 6 = 0111)
    randBytes[0] = (randBytes[0] & 0x0f) | 0x70
    // Set variant 10xx (top 2 bits of byte 8 = 10)
    randBytes[2] = (randBytes[2] & 0x3f) | 0x80

    const tsHighHex = tsHigh.toString(16).padStart(8, '0')
    const tsLowHex = tsLow.toString(16).padStart(4, '0')
    const randHex = Array.from(randBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    return `${tsHighHex}-${tsLowHex}-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 20)}`
  }

  /**
   * Validate UUID v7 format.
   */
  static isValid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  }
}
