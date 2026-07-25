import { db } from '@/lib/db'

/**
 * Business Code Repository — data access for business code sequences.
 *
 * CRITICAL (User Requirement): Tenant-Scoped with Unique Constraint.
 * - Unique key: (tenantId, module, prefix, fiscalYear)
 * - Concurrency Lock: via Prisma transaction + unique constraint
 *   (if two concurrent requests try to insert same key, one fails → retry)
 *
 * In production (Laravel), this is replaced by Eloquent repository.
 * The BusinessCodeGenerator depends on this interface, not Prisma directly.
 */
export class BusinessCodeRepository {
  /**
   * Atomically increment and return the next sequence value for a given key.
   * Uses UPSERT pattern with retry on conflict.
   *
   * @returns The next sequence number (1, 2, 3, ...)
   */
  static async nextSequence(params: {
    tenantId: string
    module: string
    prefix: string
    fiscalYear: number
  }): Promise<number> {
    const { tenantId, module, prefix, fiscalYear } = params

    // Try up to 3 times in case of concurrent conflict
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await db.$transaction(async (tx) => {
          const existing = await tx.businessCodeSequence.findUnique({
            where: {
              tenantId_module_prefix_fiscalYear: {
                tenantId,
                module,
                prefix,
                fiscalYear,
              },
            },
          })

          if (existing) {
            const nextValue = existing.lastValue + 1
            await tx.businessCodeSequence.update({
              where: { id: existing.id },
              data: {
                lastValue: nextValue,
                lastGeneratedAt: new Date(),
              },
            })
            return nextValue
          } else {
            await tx.businessCodeSequence.create({
              data: {
                tenantId,
                module,
                prefix,
                fiscalYear,
                lastValue: 1,
                lastGeneratedAt: new Date(),
              },
            })
            return 1
          }
        })
        return result
      } catch (e: any) {
        // If unique constraint violation, retry (another concurrent request won)
        if (e?.code === 'P2002' && attempt < 2) {
          continue
        }
        throw e
      }
    }
    throw new Error('Failed to acquire business code sequence after 3 attempts')
  }

  /**
   * Preview the next sequence without incrementing.
   */
  static async previewSequence(params: {
    tenantId: string
    module: string
    prefix: string
    fiscalYear: number
  }): Promise<number> {
    const existing = await db.businessCodeSequence.findUnique({
      where: {
        tenantId_module_prefix_fiscalYear: {
          tenantId: params.tenantId,
          module: params.module,
          prefix: params.prefix,
          fiscalYear: params.fiscalYear,
        },
      },
    })
    return (existing?.lastValue ?? 0) + 1
  }
}
