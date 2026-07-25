import { DomainException } from '../exceptions/domain-exception'

/**
 * Optimistic Lock Helper — LAW-07 implementation.
 *
 * Provides utilities for optimistic concurrency control on aggregate roots.
 *
 * Usage in PATCH endpoints:
 *   const ifMatch = request.headers.get('If-Match')
 *   const expectedVersion = ifMatch ? parseInt(ifMatch) : null
 *   const updated = await OptimisticLockHelper.updateWithLock(
 *     db.stockItem, id, tenantId, data, expectedVersion
 *   )
 */
export class OptimisticLockHelper {
  /**
   * Extract expected version from If-Match header.
   */
  static extractVersion(request: Request): number | null {
    const ifMatch = request.headers.get('If-Match')
    if (!ifMatch) return null
    const version = parseInt(ifMatch, 10)
    return isNaN(version) ? null : version
  }

  /**
   * Update an entity with optimistic locking.
   * Throws ConflictException if version mismatch.
   *
   * @param model - Prisma model delegate
   * @param id - Entity ID
   * @param tenantId - Tenant ID
   * @param data - Update data (without version)
   * @param expectedVersion - Version from If-Match header (null = skip lock check)
   * @returns Updated entity
   */
  static async updateWithLock<T extends { id: string; version: number }>(
    model: any,
    id: string,
    tenantId: string,
    data: Record<string, unknown>,
    expectedVersion: number | null,
  ): Promise<T> {
    if (expectedVersion === null) {
      // No If-Match header — update without lock check (backward compat)
      return await model.update({
        where: { id },
        data: { ...data, version: { increment: 1 } },
      })
    }

    // Optimistic lock: update WHERE version = expected
    const result = await model.updateMany({
      where: { id, tenantId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    })

    if (result.count === 0) {
      // Either not found or version mismatch
      const existing = await model.findFirst({ where: { id, tenantId } })
      if (!existing) {
        throw new DomainException(
          `Entity not found: ${id}`,
          'NOT_FOUND',
          404,
        )
      }
      throw new OptimisticLockConflictException(id, expectedVersion, existing.version)
    }

    return await model.findUnique({ where: { id } })
  }
}

/**
 * Thrown when optimistic lock version mismatch occurs (LAW-07).
 */
export class OptimisticLockConflictException extends DomainException {
  constructor(
    entityId: string,
    expectedVersion: number,
    actualVersion: number,
  ) {
    super(
      `Optimistic lock conflict for entity ${entityId}: expected version ${expectedVersion}, but current version is ${actualVersion}. The entity was modified by another request.`,
      'OPTIMISTIC_LOCK_FAILED',
      409,
    )
  }
}
