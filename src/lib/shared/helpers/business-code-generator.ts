import { db } from '@/lib/db'
import { persianYear } from './persian-calendar'
import { BusinessCodeConflictException } from '../exceptions/business-exception'

/**
 * Business Code Generator Service — LAW-02 enforcement.
 *
 * ALL business codes in BISMARK ERP MUST be generated through this service.
 * No code should ever be hardcoded as "SO-0001" or similar.
 *
 * Pattern: {PREFIX}-{PERSIAN_YEAR}-{ZERO_PADDED_SEQUENCE}
 * Examples:
 *   PRT-1403-00001  (Party)
 *   SO-1403-00125   (Sales Order)
 *   INV-1403-01125  (Invoice)
 *
 * Mirrors App\Modules\Configuration\Services\BusinessCodeGenerator in Laravel.
 *
 * ⚠️ CRITICAL (User Rule): NEVER construct business codes manually. Always use this service.
 */
export class BusinessCodeGenerator {
  /**
   * Generate the next business code for a given definition key.
   *
   * @param definitionKey - e.g., "party", "sales_order", "product_category"
   * @param tenantId - current tenant
   * @param contextKey - optional context (e.g., year, branch) — defaults to "default"
   * @returns The generated business code string (e.g., "PRT-1403-00001")
   */
  static async generate(
    definitionKey: string,
    tenantId: string,
    contextKey: string = 'default',
  ): Promise<string> {
    const def = BUSINESS_CODE_DEFINITIONS[definitionKey]
    if (!def) {
      throw new Error(`Unknown business code definition: ${definitionKey}`)
    }

    const year = persianYear(new Date())
    // Context key includes year so sequence resets each year
    const fullContextKey = `${contextKey}:${year}`

    // Atomically increment sequence
    const sequence = await db.$transaction(async (tx) => {
      const existing = await tx.businessCodeSequence.findUnique({
        where: {
          definitionKey_tenantId_contextKey: {
            definitionKey,
            tenantId,
            contextKey: fullContextKey,
          },
        },
      })

      const nextValue = (existing?.lastValue ?? 0) + 1

      if (existing) {
        await tx.businessCodeSequence.update({
          where: { id: existing.id },
          data: {
            lastValue: nextValue,
            lastGeneratedAt: new Date(),
          },
        })
      } else {
        await tx.businessCodeSequence.create({
          data: {
            definitionKey,
            tenantId,
            contextKey: fullContextKey,
            lastValue: nextValue,
            lastGeneratedAt: new Date(),
          },
        })
      }

      return nextValue
    })

    // Format: PREFIX-YEAR-PADDED_SEQUENCE
    const padded = String(sequence).padStart(def.padding, '0')
    return `${def.prefix}-${year}-${padded}`
  }

  /**
   * Generate multiple business codes in a single transaction.
   * Useful for batch operations.
   */
  static async generateMany(
    definitionKey: string,
    tenantId: string,
    count: number,
    contextKey: string = 'default',
  ): Promise<string[]> {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      codes.push(await this.generate(definitionKey, tenantId, contextKey))
    }
    return codes
  }

  /**
   * Preview the next business code WITHOUT incrementing the sequence.
   * Useful for UI display before form submission.
   */
  static async preview(
    definitionKey: string,
    tenantId: string,
    contextKey: string = 'default',
  ): Promise<string> {
    const def = BUSINESS_CODE_DEFINITIONS[definitionKey]
    if (!def) throw new Error(`Unknown business code definition: ${definitionKey}`)

    const year = persianYear(new Date())
    const fullContextKey = `${contextKey}:${year}`

    const existing = await db.businessCodeSequence.findUnique({
      where: {
        definitionKey_tenantId_contextKey: {
          definitionKey,
          tenantId,
          contextKey: fullContextKey,
        },
      },
    })

    const nextValue = (existing?.lastValue ?? 0) + 1
    const padded = String(nextValue).padStart(def.padding, '0')
    return `${def.prefix}-${year}-${padded}`
  }

  /**
   * Validate that a business code follows the correct format.
   */
  static validate(code: string, definitionKey: string): boolean {
    const def = BUSINESS_CODE_DEFINITIONS[definitionKey]
    if (!def) return false

    const regex = new RegExp(`^${def.prefix}-\\d{4}-\\d{${def.padding},}$`)
    return regex.test(code)
  }
}

/**
 * Business Code Definitions (LAW-02 catalog).
 * Mirrors config/bismark.php → business_codes.definitions in Laravel.
 */
export const BUSINESS_CODE_DEFINITIONS: Record<
  string,
  { prefix: string; padding: number }
> = {
  // Sprint 1
  party: { prefix: 'PRT', padding: 5 },

  // Sprint 2.1 — Product Context
  product_category: { prefix: 'CAT', padding: 4 },
  product_brand: { prefix: 'BRD', padding: 4 },
  product_model: { prefix: 'MDL', padding: 5 },
  product: { prefix: 'PRD', padding: 5 },
  product_instance: { prefix: 'SN', padding: 7 },

  // Sales (Sprint 3)
  sales_order: { prefix: 'SO', padding: 5 },
  shipment: { prefix: 'SHP', padding: 5 },
  sales_invoice: { prefix: 'INV', padding: 5 },
  payment: { prefix: 'PAY', padding: 5 },
  sales_return: { prefix: 'RET', padding: 5 },
  price_list: { prefix: 'PL', padding: 3 },

  // Warranty (Sprint 4)
  warranty_card: { prefix: 'WAR', padding: 5 },
  warranty_claim: { prefix: 'WCL', padding: 5 },
  warranty_extension: { prefix: 'WEX', padding: 5 },
  warranty_transfer: { prefix: 'WTR', padding: 5 },

  // Service (Sprint 5)
  service_request: { prefix: 'SR', padding: 5 },
  service_order: { prefix: 'RO', padding: 5 },
  quality_check: { prefix: 'QC', padding: 5 },
  service_report: { prefix: 'RPT', padding: 5 },
  service_estimate: { prefix: 'EST', padding: 5 },

  // Financial (Sprint 6)
  journal_entry: { prefix: 'JE', padding: 5 },
  ap_invoice: { prefix: 'API', padding: 5 },
  ar_invoice: { prefix: 'ARI', padding: 5 },
  settlement: { prefix: 'STL', padding: 5 },
  cost_center: { prefix: 'CC', padding: 3 },

  // Inventory (Sprint 2.2+)
  stock_transfer: { prefix: 'TR', padding: 5 },
  stock_count: { prefix: 'SC', padding: 5 },
}
