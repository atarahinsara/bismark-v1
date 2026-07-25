<?php

declare(strict_types=1);

namespace App\Shared\Http\Middleware;

use App\Modules\Identity\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * EnsureTenantResolved — pick up the tenant id from the configured source and
 * bind it into the container as 'bismark.tenant'.
 *
 * The id then flows to:
 *   - BelongsToTenant global scope
 *   - Audit columns (created_by / updated_by need a tenant context)
 *   - Rate-limit buckets
 */
final class EnsureTenantResolved
{
    public function handle(Request $request, Closure $next): Response
    {
        $enabled = (bool) config('bismark.tenant.enabled', true);
        if (!$enabled) {
            return $next($request);
        }

        $header = (string) config('bismark.tenant.header_name', 'X-Bismark-Tenant');
        $tenantId = $request->headers->get($header)
            ?? $request->query('tenant_id');

        if ($tenantId === null) {
            throw new BadRequestHttpException(
                "Missing tenant header '{$header}'."
            );
        }

        // Light validation only — full existence check is cached in production.
        if (!Tenant::whereKey($tenantId)->exists()) {
            throw new BadRequestHttpException("Unknown tenant '{$tenantId}'.");
        }

        app()->instance('bismark.tenant', $tenantId);

        return $next($request);
    }
}
