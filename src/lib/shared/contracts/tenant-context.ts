/**
 * Tenant Context — provides current tenant ID for multi-tenant queries.
 * Mirrors App\Shared\Kernel\Contracts\TenantContextInterface in Laravel.
 */
export interface TenantContextInterface {
  getTenantId(): string | null
  getTenantSlug(): string | null
  setTenant(tenantId: string, slug: string): void
  clear(): void
}

/**
 * Default in-memory tenant context (sandbox).
 * In production, this is set by SetTenantContext middleware from JWT claims.
 */
class InMemoryTenantContext implements TenantContextInterface {
  private tenantId: string | null = null
  private slug: string | null = null

  getTenantId(): string | null {
    return this.tenantId
  }

  getTenantSlug(): string | null {
    return this.slug
  }

  setTenant(tenantId: string, slug: string): void {
    this.tenantId = tenantId
    this.slug = slug
  }

  clear(): void {
    this.tenantId = null
    this.slug = null
  }
}

let contextInstance: TenantContextInterface | null = null

export function getTenantContext(): TenantContextInterface {
  if (!contextInstance) {
    contextInstance = new InMemoryTenantContext()
  }
  return contextInstance
}

/**
 * Get the current tenant ID or throw.
 * Used by repositories that require a tenant scope.
 */
export function requireTenantId(): string {
  const id = getTenantContext().getTenantId()
  if (!id) throw new Error('No tenant context set')
  return id
}
