/**
 * RT-CRIT-002: Tenant Guard — Prisma Client Extension
 *
 * Enforces that ALL business-logic queries include `tenantId` in their
 * WHERE clause (reads) or DATA (creates). Prevents silent data leaks
 * when a developer forgets to scope by tenant.
 *
 * Usage:
 *   import { guardedDb as db } from '@/lib/db-guarded'
 *   // This throws:  db.user.findMany({ where: { status: 'active' } })
 *   // This works:   db.user.findMany({ where: { tenantId, status: 'active' } })
 *
 * Exempt models (global, no tenant scoping):
 *   - Tenant
 *   - Permission
 *   - IdempotencyKey (checked separately)
 *
 * For legitimate cross-tenant lookups (e.g., auth login), use the raw
 * `db` from '@/lib/db' instead.
 */

import { db } from './db'

// Models that legitimately don't have tenantId
const EXEMPT_MODELS = new Set([
  'Tenant',
  'Permission',
])

// Operations that don't need tenantId (e.g., count for health checks)
const EXEMPT_OPERATIONS = new Set([
  '$queryRaw',
  '$executeRaw',
  '$queryRawUnsafe',
  '$executeRawUnsafe',
])

/**
 * Check if a query's `where` clause includes `tenantId`.
 */
function hasTenantIdInWhere(args: any): boolean {
  if (!args || !args.where) return false
  return args.where.tenantId !== undefined
}

/**
 * Check if a create's `data` includes `tenantId`.
 */
function hasTenantIdInData(args: any): boolean {
  if (!args || !args.data) return false
  if (Array.isArray(args.data)) {
    return args.data.every((item: any) => item?.tenantId !== undefined)
  }
  return args.data.tenantId !== undefined
}

/**
 * Check if an updateMany/deleteMany's `where` includes `tenantId`.
 */
function hasTenantIdInWhereForMutation(args: any): boolean {
  return hasTenantIdInWhere(args)
}

/**
 * The guarded Prisma client. Use this in ALL business-logic API routes.
 *
 * Throws `TenantGuardError` if a query lacks `tenantId` on a non-exempt model.
 */
export const guardedDb = db.$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      // Skip raw operations
      if (EXEMPT_OPERATIONS.has(operation)) {
        return query(args)
      }

      // Skip if model is exempt (global tables)
      if (model && EXEMPT_MODELS.has(model)) {
        return query(args)
      }

      // Skip if no model (e.g., $transaction, $connect)
      if (!model) {
        return query(args)
      }

      // Read operations: check where.tenantId
      if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
        if (!hasTenantIdInWhere(args)) {
          throw new TenantGuardError(
            `Query ${model}.${operation} is missing tenantId in WHERE clause. ` +
            `This is a security violation (RT-CRIT-002). ` +
            `Use db (raw) from '@/lib/db' for system operations, ` +
            `or add tenantId to the where clause.`
          )
        }
      }

      // Create operations: check data.tenantId
      if (operation === 'create') {
        if (!hasTenantIdInData(args)) {
          throw new TenantGuardError(
            `Create ${model}.${operation} is missing tenantId in data. ` +
            `This is a security violation (RT-CRIT-002).`
          )
        }
      }

      // CreateMany: check each item
      if (operation === 'createMany') {
        if (!hasTenantIdInData(args)) {
          throw new TenantGuardError(
            `CreateMany ${model}.${operation} is missing tenantId in data. ` +
            `This is a security violation (RT-CRIT-002).`
          )
        }
      }

      // Update/Delete: check where.tenantId
      if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
        if (!hasTenantIdInWhereForMutation(args)) {
          throw new TenantGuardError(
            `${operation} ${model}.${operation} is missing tenantId in WHERE clause. ` +
            `This is a security violation (RT-CRIT-002).`
          )
        }
      }

      return query(args)
    },
  },
})

/**
 * Error thrown when a query violates the tenant guard.
 */
export class TenantGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantGuardError'
  }
}
