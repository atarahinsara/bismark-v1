import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { DomainException } from '@/lib/shared'

/**
 * GET /api/v1/ar/customers
 * List all customers with AR transactions + derived balance (LAW-42).
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId()
    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    // Get all AR transactions grouped by customer
    const transactions = await db.aRTransaction.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { entryDate: 'desc' },
    })

    // Group by customer and compute balance (LAW-42: derived, not stored)
    const customerMap = new Map<string, { customerPartyId: string; totalDebit: number; totalCredit: number; balance: number; openItems: number; transactionCount: number }>()

    for (const txn of transactions) {
      if (!customerMap.has(txn.customerPartyId)) {
        customerMap.set(txn.customerPartyId, { customerPartyId: txn.customerPartyId, totalDebit: 0, totalCredit: 0, balance: 0, openItems: 0, transactionCount: 0 })
      }
      const c = customerMap.get(txn.customerPartyId)!
      c.transactionCount++
      if (txn.amount > 0) {
        c.totalDebit += txn.amount
      } else {
        c.totalCredit += Math.abs(txn.amount)
      }
      // Open amount = unallocated
      if (txn.openAmount > 0) {
        c.openItems++
        c.balance += txn.openAmount // LAW-42: derived from open amounts
      }
    }

    return jsonResponse({
      data: Array.from(customerMap.values()).sort((a, b) => b.balance - a.balance),
      meta: { totalCustomers: customerMap.size },
    })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list AR customers', statusCode: 500 })
  }
}
