import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/auth-service'
import {
  getSettings,
  setSettings,
  type SettingInput,
} from '@/lib/settings/settings-service'

/**
 * Check whether the authenticated context has admin (super_admin) role.
 * `super_admin` bypasses all RBAC checks in the project (see src/lib/rbac.ts).
 */
function isAdmin(roles: string[]): boolean {
  return roles.includes('super_admin')
}

/**
 * GET /api/v1/settings
 *
 * List system settings (admin only).
 *
 * Query: ?category=<category>
 *
 * Response:
 *   200: { settings: SystemSetting[] }
 *   403: Not an admin
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(ctx.roles)) {
      return NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    const url = new URL(req.url)
    const category = url.searchParams.get('category') || undefined

    const settings = await getSettings({ category })

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[settings GET] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/settings
 *
 * Bulk upsert system settings (admin only).
 *
 * Request body:
 *   { settings: Array<{ key, value, type?, category?, description?, isPublic?, tenantId? }> }
 *
 * Response:
 *   200: { settings: SystemSetting[] }
 *   403: Not an admin
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = getAuthContext(req)
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin(ctx.roles)) {
      return NextResponse.json(
        { error: 'Forbidden: admin access required', code: 'FORBIDDEN' },
        { status: 403 },
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'Body must contain a "settings" array', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    const inputs: SettingInput[] = []
    for (const item of body.settings) {
      if (!item || typeof item.key !== 'string' || typeof item.value === 'undefined') {
        return NextResponse.json(
          { error: 'Each setting must have "key" and "value"', code: 'VALIDATION_ERROR' },
          { status: 400 },
        )
      }
      inputs.push({
        key: item.key,
        value: String(item.value),
        type: typeof item.type === 'string' ? (item.type as SettingInput['type']) : undefined,
        category: typeof item.category === 'string' ? item.category : undefined,
        description: typeof item.description === 'string' ? item.description : undefined,
        isPublic: typeof item.isPublic === 'boolean' ? item.isPublic : undefined,
        tenantId: typeof item.tenantId === 'string' ? item.tenantId : null,
        updatedBy: ctx.userId,
      })
    }

    const results = await setSettings(inputs)

    return NextResponse.json({ settings: results })
  } catch (err) {
    console.error('[settings POST] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
