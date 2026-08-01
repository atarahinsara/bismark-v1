import { db } from '@/lib/db'
import { getTenantContext } from '@/lib/shared'
import { headers } from 'next/headers'

/**
 * Get the current tenant ID.
 *
 * Priority:
 *   1. x-auth-tenant-id header (set by middleware from verified JWT)
 *   2. In-memory context (set by previous call in same request)
 *   3. Default tenant fallback (for public endpoints like health check)
 */
export async function getTenantId(): Promise<string> {
  // 1. Try auth header (set by middleware from verified JWT)
  try {
    const headersList = await headers()
    const authTenantId = headersList.get('x-auth-tenant-id')
    if (authTenantId) {
      getTenantContext().setTenant(authTenantId, 'bismark')
      return authTenantId
    }
  } catch {
    // headers() not available in this context (e.g., outside request)
  }

  // 2. Try in-memory context (set by previous call)
  const ctx = getTenantContext().getTenantId()
  if (ctx) return ctx

  // 3. Sandbox fallback: use default tenant
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
 * Get the authenticated user ID from request headers.
 * Returns null if not authenticated (public route).
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const headersList = await headers()
    return headersList.get('x-auth-user-id')
  } catch {
    return null
  }
}

/**
 * Get the authenticated user's roles from request headers.
 */
export async function getAuthenticatedRoles(): Promise<string[]> {
  try {
    const headersList = await headers()
    const rolesHeader = headersList.get('x-auth-roles')
    return rolesHeader ? rolesHeader.split(',').filter(Boolean) : []
  } catch {
    return []
  }
}

/**
 * F-03 fix (Audit v4): Resolve the Party ID for a customer-portal user.
 *
 * Customer portal routes (e.g., /api/v1/customer/invoices) need to query
 * entities by Party ID (customerPartyId), not User ID. This helper maps
 * the authenticated User to their associated Party.
 *
 * Resolution order:
 *   1. User.metadata.partyId (explicit link — set by admin or self-service)
 *   2. Party matched by User.email (Party.metadata.email)
 *   3. Party matched by User.phone (Party.metadata.phone)
 *
 * Returns null if the user is not linked to a Party (e.g., staff users).
 */
export async function getCustomerPartyId(userId: string, tenantId: string): Promise<string | null> {
  // 1. Look up user
  const user = await db.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true, email: true, phone: true, metadata: true, userType: true },
  })
  if (!user) return null

  // 2. Check User.metadata.partyId (explicit link)
  const metadata = user.metadata as Record<string, unknown> | null
  if (metadata && typeof metadata.partyId === 'string') {
    // Verify the party exists
    const party = await db.party.findFirst({
      where: { id: metadata.partyId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (party) return party.id
  }

  // 3. Try matching by email
  if (user.email) {
    // SQLite has limited JSON query support; fetch person parties and filter in JS.
    // For production (PostgreSQL), use a JSON path query instead.
    const parties = await db.party.findMany({
      where: { tenantId, deletedAt: null, partyType: 'person' },
      select: { id: true, metadata: true, displayName: true },
    })
    for (const p of parties) {
      const pm = p.metadata as Record<string, unknown> | null
      if (pm && typeof pm.email === 'string' && pm.email === user.email) {
        return p.id
      }
    }
  }

  // 4. Try matching by phone
  if (user.phone) {
    const parties = await db.party.findMany({
      where: { tenantId, deletedAt: null, partyType: 'person' },
      select: { id: true, metadata: true, displayName: true },
    })
    for (const p of parties) {
      const pm = p.metadata as Record<string, unknown> | null
      if (pm && typeof pm.phone === 'string' && pm.phone === user.phone) {
        return p.id
      }
    }
  }

  return null
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
