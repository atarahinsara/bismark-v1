import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/shared'

/**
 * Get or create the default tenant (sandbox: single-tenant).
 * In production, this is extracted from JWT claims by middleware.
 */
export async function getTenantId(): Promise<string> {
  // Try context first (set by auth middleware)
  const ctx = getTenantContext().getTenantId()
  if (ctx) return ctx

  // Sandbox fallback: use default tenant
  const tenant = await db.tenant.findFirst({
    where: { slug: 'bismark' },
  })

  if (!tenant) {
    throw new Error('No tenant found. Run: bun run src/lib/seed.ts')
  }

  getTenantContext().setTenant(tenant.id, tenant.slug)
  return tenant.id
}

/**
 * Standard JSON API response wrapper.
 */
export function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Standard error response (RFC 7807 Problem Details + correlation_id).
 */
export function errorResponse(
  error: { code: string; message: string; statusCode?: number; errors?: unknown },
): Response {
  const statusCode = error.statusCode ?? 400
  return new Response(
    JSON.stringify({
      type: `https://docs.bismark.api/errors/${error.code.toLowerCase()}`,
      title: error.code,
      status: statusCode,
      detail: error.message,
      code: error.code,
      correlation_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      errors: error.errors,
    }),
    {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

/**
 * Parse query params for pagination/filtering/sorting.
 */
export function parseQueryParams(request: Request) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  return {
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)),
    perPage: Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20', 10))),
    sort: searchParams.get('sort') ?? '-createdAt',
    search: searchParams.get('search') ?? '',
    filters: Object.fromEntries(
      Array.from(searchParams.entries()).filter(([key]) => key.startsWith('filter[')),
    ),
  }
}
