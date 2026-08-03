import { NextRequest } from 'next/server'
import { jsonResponse } from '@/lib/api-helpers'
import { logout } from '@/lib/auth'

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the current session.
 * Requires: Bearer token (authenticated)
 *
 * This route verifies JWT directly — does NOT depend on middleware x-auth-* headers.
 * This makes logout resilient to middleware changes.
 *
 * Response:
 *   200: { message: "Logged out successfully" }
 *   401: Not authenticated
 */
export async function POST(request: NextRequest) {
  try {
    // Extract token directly from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]

    if (!token) {
      return jsonResponse(
        { data: { message: 'Not authenticated' } },
        401,
      )
    }

    // Logout function verifies JWT and revokes session
    await logout(token)

    return jsonResponse(
      { data: { message: 'Logged out successfully' } },
      200,
    )
  } catch {
    // Token is invalid or already expired — still return success
    // (client should clear token regardless)
    return jsonResponse(
      { data: { message: 'Logged out successfully' } },
      200,
    )
  }
}
