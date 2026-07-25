import { BusinessCodeRepository } from '../repositories/business-code-repository'
import { persianYear } from './persian-calendar'

/**
 * Business Code Generator Service — LAW-02 enforcement.
 *
 * ALL business codes in BISMARK ERP MUST be generated through this service.
 * No code should ever be hardcoded as "SO-0001" or similar.
 *
 * Pattern: {PREFIX}-{PERSIAN_YEAR}-{ZERO_PADDED_SEQUENCE}
 *
 * CRITICAL FIXES (User Requirements):
 * 1. Tenant-Scoped: unique key = (tenantId, module, prefix, fiscalYear)
 * 2. Concurrency Lock: via Repository transaction + DB unique constraint
 * 3. Uses Repository pattern (not Prisma directly) — Laravel can replace later
 *
 * Mirrors App\Modules\Configuration\Services\BusinessCodeGenerator in Laravel.
 */
export class BusinessCodeGenerator {
  /**
   * Generate the next business code for a given module key.
   *
   * @param moduleKey - e.g., "party", "sales_order", "product_category"
   * @param tenantId - current tenant
   * @returns The generated business code string (e.g., "PRT-1403-00001")
   */
  static async generate(moduleKey: string, tenantId: string): Promise<string> {
    const def = BUSINESS_CODE_DEFINITIONS[moduleKey]
    if (!def) {
      throw new Error(`Unknown business code definition: ${moduleKey}`)
    }

    const fiscalYear = persianYear(new Date())

    // Atomically get next sequence via Repository (with concurrency lock)
    const sequence = await BusinessCodeRepository.nextSequence({
      tenantId,
      module: moduleKey,
      prefix: def.prefix,
      fiscalYear,
    })

    const padded = String(sequence).padStart(def.padding, '0')
    return `${def.prefix}-${fiscalYear}-${padded}`
  }

  /**
   * Generate multiple business codes (each gets a unique sequence).
   */
  static async generateMany(moduleKey: string, tenantId: string, count: number): Promise<string[]> {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      codes.push(await this.generate(moduleKey, tenantId))
    }
    return codes
  }

  /**
   * Preview the next business code WITHOUT incrementing the sequence.
   * Useful for UI display before form submission.
   */
  static async preview(moduleKey: string, tenantId: string): Promise<string> {
    const def = BUSINESS_CODE_DEFINITIONS[moduleKey]
    if (!def) throw new Error(`Unknown business code definition: ${moduleKey}`)

    const fiscalYear = persianYear(new Date())
    const nextValue = await BusinessCodeRepository.previewSequence({
      tenantId,
      module: moduleKey,
      prefix: def.prefix,
      fiscalYear,
    })

    const padded = String(nextValue).padStart(def.padding, '0')
    return `${def.prefix}-${fiscalYear}-${padded}`
  }

  /**
   * Validate that a business code follows the correct format.
   */
  static validate(code: string, moduleKey: string): boolean {
    const def = BUSINESS_CODE_DEFINITIONS[moduleKey]
    if (!def) return false
    const regex = new RegExp(`^${def.prefix}-\\d{4}-\\d{${def.padding},}$`)
    return regex.test(code)
  }
}

/**
 * Business Code Definitions (LAW-02 catalog).
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

  // Sprint 2.2A — Inventory Structure
  warehouse: { prefix: 'WH', padding: 4 },
  location: { prefix: 'LOC', padding: 5 },

  // Sprint 2.2B — Inventory Ledger
  inventory_transaction: { prefix: 'IT', padding: 6 },
  stock_reservation: { prefix: 'RES', padding: 6 },

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

  // Service (Sprint 5)
  service_request: { prefix: 'SR', padding: 5 },
  service_order: { prefix: 'RO', padding: 5 },

  // Financial (Sprint 6)
  journal_entry: { prefix: 'JE', padding: 5 },
  ap_invoice: { prefix: 'API', padding: 5 },
  ar_invoice: { prefix: 'ARI', padding: 5 },
  settlement: { prefix: 'STL', padding: 5 },

  // Inventory operations (Sprint 2.2C+)
  stock_transfer: { prefix: 'TR', padding: 5 },
  stock_count: { prefix: 'SC', padding: 5 },
}
