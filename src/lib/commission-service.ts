/**
 * BISMARK ERP — Commission Calculation Service (T-3-04)
 *
 * Calculates commission for a sales order based on CommissionRule.
 * Supports 3 types: percentage, fixed, tiered.
 *
 * Tiered commission structure (stored in CommissionRule.metadata):
 *   {
 *     "tiers": [
 *       { "minAmount": 0, "maxAmount": 1000000, "rate": 5 },
 *       { "minAmount": 1000001, "maxAmount": 5000000, "rate": 7 },
 *       { "minAmount": 5000001, "maxAmount": null, "rate": 10 }
 *     ]
 *   }
 *
 * Flow:
 *   1. Sales order completed → event handler calls calculateCommission()
 *   2. Find applicable CommissionRule (by salesRep + productCategory + date)
 *   3. Calculate commission amount based on type
 *   4. Create CommissionTransaction record
 *   5. Emit commission.earned event
 */

import { db } from '@/lib/db'
import { BusinessCodeGenerator } from '@/lib/shared'
import { logger } from '@/lib/logger'

export interface CommissionCalculationResult {
  ruleId: string
  ruleName: string
  commissionType: string
  rate: number
  baseAmount: number
  commissionAmount: number
  tiers?: Array<{ minAmount: number; maxAmount: number | null; rate: number; amount: number }>
}

/**
 * Calculate commission for a sales order.
 *
 * @param salesOrderId - The completed sales order ID
 * @param tenantId - Tenant scope
 * @returns Calculation result or null if no rule applies
 */
export async function calculateCommission(
  salesOrderId: string,
  tenantId: string,
): Promise<CommissionCalculationResult | null> {
  // Find the sales order with lines
  const salesOrder = await db.salesOrder.findFirst({
    where: { id: salesOrderId, tenantId, deletedAt: null },
    include: {
      lines: true,
    },
  })

  if (!salesOrder) {
    logger.warn({ salesOrderId }, 'Commission calc: sales order not found')
    return null
  }

  if (!salesOrder.salesRepPartyId) {
    logger.debug({ salesOrderId }, 'Commission calc: no sales rep assigned')
    return null
  }

  const totalAmount = salesOrder.totalAmount
  if (totalAmount <= 0) {
    return null
  }

  // Find applicable commission rule
  // Priority: specific (rep + category) > rep only > category only > generic
  const rules = await db.commissionRule.findMany({
    where: {
      tenantId,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } },
      ],
      minAmount: { lte: totalAmount },
    },
    orderBy: [{ productCategoryId: 'desc' }, { salesRepPartyId: 'desc' }],
  })

  // Find best matching rule
  let applicableRule = rules.find(
    (r) => r.salesRepPartyId === salesOrder.salesRepPartyId && r.productCategoryId !== null,
  )
  if (!applicableRule) {
    applicableRule = rules.find(
      (r) => r.salesRepPartyId === salesOrder.salesRepPartyId && r.productCategoryId === null,
    )
  }
  if (!applicableRule) {
    applicableRule = rules.find((r) => r.salesRepPartyId === null)
  }

  if (!applicableRule) {
    logger.debug({ salesOrderId }, 'Commission calc: no applicable rule')
    return null
  }

  // Calculate based on type
  let commissionAmount = 0
  let tiers: CommissionCalculationResult['tiers']

  switch (applicableRule.commissionType) {
    case 'percentage':
      commissionAmount = (totalAmount * applicableRule.rate) / 100
      break

    case 'fixed':
      commissionAmount = applicableRule.rate
      break

    case 'tiered':
      const result = calculateTieredCommission(totalAmount, applicableRule.metadata)
      commissionAmount = result.total
      tiers = result.tiers
      break

    default:
      logger.warn({ ruleId: applicableRule.id, type: applicableRule.commissionType }, 'Unknown commission type')
      return null
  }

  // Apply maxAmount cap if set
  if (applicableRule.maxAmount && commissionAmount > applicableRule.maxAmount) {
    commissionAmount = applicableRule.maxAmount
  }

  return {
    ruleId: applicableRule.id,
    ruleName: applicableRule.name,
    commissionType: applicableRule.commissionType,
    rate: applicableRule.rate,
    baseAmount: totalAmount,
    commissionAmount,
    tiers,
  }
}

/**
 * Calculate tiered commission.
 * Each tier applies only to the portion of the amount within that tier's range.
 */
function calculateTieredCommission(
  amount: number,
  metadata: unknown,
): { total: number; tiers: Array<{ minAmount: number; maxAmount: number | null; rate: number; amount: number }> } {
  const meta = metadata as { tiers?: Array<{ minAmount: number; maxAmount: number | null; rate: number }> } | null

  if (!meta?.tiers || !Array.isArray(meta.tiers) || meta.tiers.length === 0) {
    return { total: 0, tiers: [] }
  }

  let total = 0
  const tiers: Array<{ minAmount: number; maxAmount: number | null; rate: number; amount: number }> = []

  for (const tier of meta.tiers) {
    const min = tier.minAmount || 0
    const max = tier.maxAmount // null = infinity

    if (amount <= min) break

    const taxableInTier = Math.min(amount, max || amount) - min
    if (taxableInTier > 0) {
      const tierCommission = (taxableInTier * tier.rate) / 100
      total += tierCommission
      tiers.push({
        minAmount: min,
        maxAmount: max,
        rate: tier.rate,
        amount: tierCommission,
      })
    }
  }

  return { total, tiers }
}

/**
 * Create a CommissionTransaction record.
 * Called after commission is calculated.
 */
export async function recordCommission(
  salesOrderId: string,
  tenantId: string,
  calculation: CommissionCalculationResult,
  actorId: string,
): Promise<string> {
  const salesOrder = await db.salesOrder.findFirst({
    where: { id: salesOrderId, tenantId },
    select: { salesRepPartyId: true },
  })

  if (!salesOrder?.salesRepPartyId) {
    throw new Error('Cannot record commission: no sales rep')
  }

  const txn = await db.commissionTransaction.create({
    data: {
      tenantId,
      salesRepPartyId: salesOrder.salesRepPartyId,
      salesOrderId,
      commissionRuleId: calculation.ruleId,
      amount: calculation.commissionAmount,
      status: 'calculated',
      metadata: {
        ruleName: calculation.ruleName,
        commissionType: calculation.commissionType,
        rate: calculation.rate,
        baseAmount: calculation.baseAmount,
        tiers: calculation.tiers,
      },
    },
  })

  logger.info({
    commissionId: txn.id,
    salesOrderId,
    amount: calculation.commissionAmount,
    type: calculation.commissionType,
  }, 'Commission recorded')

  return txn.id
}
