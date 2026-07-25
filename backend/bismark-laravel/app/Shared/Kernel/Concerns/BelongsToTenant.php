<?php

declare(strict_types=1);

namespace App\Shared\Kernel\Concerns;

/**
 * Trait for models that belong to a tenant (Multi-Tenant, ADR-003).
 *
 * All tenant-scoped models MUST use this trait.
 * It provides:
 * - tenant() belongsTo relation
 * - forTenant($tenantId) query scope
 *
 * LAW: Repository layer MUST always filter by tenant_id.
 */
trait BelongsToTenant
{
    /**
     * Get the tenant that owns this model.
     */
    public function tenant()
    {
        return $this->belongsTo(\App\Modules\Identity\Models\Tenant::class, 'tenant_id');
    }

    /**
     * Scope query to a specific tenant.
     */
    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope query to the current tenant (from context).
     */
    public function scopeForCurrentTenant($query)
    {
        $tenantId = app(\App\Shared\Kernel\Contracts\TenantContextInterface::class)->getTenantId();

        if ($tenantId === null) {
            throw new \RuntimeException('No tenant context set. Cannot query tenant-scoped model without tenant.');
        }

        return $query->where('tenant_id', $tenantId);
    }
}
