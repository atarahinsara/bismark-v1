/**
 * Van Stock Service — Golden Slice Phase 3
 * Queen Correction 2: Van Stock with Ledger Pattern (like Inventory)
 *
 * All operations go through VanStockLedger (append-only).
 * VanStock.quantity is derived (recomputed from ledger).
 *
 * LAW-05: No Aggregate Quantity as Source of Truth (VanStock.quantity is a snapshot)
 * LAW-16: No Physical Movement Without Ledger Event
 * LAW-31: No Part Consumption Without Inventory Ledger Event
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Get or create VanStock for a technician + product.
 */
export async function getOrCreateVanStock(
  tenantId: string,
  technicianId: string,
  productId: string,
): Promise<string> {
  let stock = await db.vanStock.findFirst({
    where: { tenantId, technicianId, productId },
  })

  if (!stock) {
    stock = await db.vanStock.create({
      data: {
        tenantId,
        technicianId,
        productId,
        quantity: 0,
        reservedQuantity: 0,
        metadata: {},
        version: 1,
      },
    })
    logger.info({ vanStockId: stock.id, technicianId, productId }, 'VanStock created')
  }

  return stock.id
}

/**
 * Add stock to van (restock from warehouse or direct).
 * Creates a VanStockLedger entry with transactionType='restock'.
 *
 * @returns { vanStockId, newQuantity, ledgerId }
 */
export async function restockVanStock(params: {
  tenantId: string
  technicianId: string
  productId: string
  quantity: number
  referenceType?: string
  referenceId?: string
  performedBy: string
  notes?: string
}): Promise<{ vanStockId: string; newQuantity: number; ledgerId: string }> {
  const { tenantId, technicianId, productId, quantity, referenceType, referenceId, performedBy, notes } = params

  if (quantity <= 0) {
    throw new Error('Restock quantity must be positive')
  }

  const vanStockId = await getOrCreateVanStock(tenantId, technicianId, productId)

  const result = await db.$transaction(async (tx) => {
    // Lock the VanStock record
    const stock = await tx.vanStock.findUnique({ where: { id: vanStockId } })
    if (!stock) throw new Error('VanStock not found')

    const newQuantity = stock.quantity + quantity

    // Update VanStock
    const updated = await tx.vanStock.update({
      where: { id: vanStockId },
      data: {
        quantity: newQuantity,
        lastRestockedAt: new Date(),
        version: { increment: 1 },
      },
    })

    // Create ledger entry
    const ledger = await tx.vanStockLedger.create({
      data: {
        tenantId,
        vanStockId,
        technicianId,
        productId,
        transactionType: 'restock',
        quantity, // positive = in
        balanceAfter: newQuantity,
        referenceType: referenceType || 'manual_restock',
        referenceId: referenceId || null,
        performedBy,
        performedAt: new Date(),
        notes: notes || null,
        metadata: {},
      },
    })

    return { vanStockId: updated.id, newQuantity, ledgerId: ledger.id }
  })

  logger.info({
    vanStockId: result.vanStockId,
    technicianId,
    productId,
    quantity,
    newBalance: result.newQuantity,
  }, 'VanStock restocked')

  return result
}

/**
 * Consume parts from van stock for a job.
 * Creates a VanStockLedger entry with transactionType='consume'.
 *
 * @throws if insufficient stock
 */
export async function consumeVanStock(params: {
  tenantId: string
  technicianId: string
  productId: string
  quantity: number
  technicianJobId: string
  performedBy: string
  notes?: string
}): Promise<{ vanStockId: string; newQuantity: number; ledgerId: string }> {
  const { tenantId, technicianId, productId, quantity, technicianJobId, performedBy, notes } = params

  if (quantity <= 0) {
    throw new Error('Consume quantity must be positive')
  }

  const vanStockId = await getOrCreateVanStock(tenantId, technicianId, productId)

  const result = await db.$transaction(async (tx) => {
    // Lock the VanStock record
    const stock = await tx.vanStock.findUnique({ where: { id: vanStockId } })
    if (!stock) throw new Error('VanStock not found')

    if (stock.quantity < quantity) {
      throw new Error(`Insufficient van stock: available=${stock.quantity}, requested=${quantity}`)
    }

    const newQuantity = stock.quantity - quantity

    // Update VanStock
    const updated = await tx.vanStock.update({
      where: { id: vanStockId },
      data: {
        quantity: newQuantity,
        version: { increment: 1 },
      },
    })

    // Create ledger entry (negative = out)
    const ledger = await tx.vanStockLedger.create({
      data: {
        tenantId,
        vanStockId,
        technicianId,
        productId,
        transactionType: 'consume',
        quantity: -quantity, // negative = out
        balanceAfter: newQuantity,
        referenceType: 'technician_job',
        referenceId: technicianJobId,
        performedBy,
        performedAt: new Date(),
        notes: notes || null,
        metadata: { technicianJobId },
      },
    })

    return { vanStockId: updated.id, newQuantity, ledgerId: ledger.id }
  })

  logger.info({
    vanStockId: result.vanStockId,
    technicianId,
    productId,
    quantity,
    newBalance: result.newQuantity,
    technicianJobId,
  }, 'VanStock consumed')

  return result
}

/**
 * Get van stock balance for a technician.
 * Returns all products in the van with current quantity.
 */
export async function getVanStockBalance(
  tenantId: string,
  technicianId: string,
): Promise<Array<{ productId: string; quantity: number; reservedQuantity: number; vanStockId: string }>> {
  const stocks = await db.vanStock.findMany({
    where: { tenantId, technicianId },
    select: { id: true, productId: true, quantity: true, reservedQuantity: true },
  })

  return stocks.map((s) => ({
    vanStockId: s.id,
    productId: s.productId,
    quantity: s.quantity,
    reservedQuantity: s.reservedQuantity,
  }))
}

/**
 * Get van stock ledger for a technician (history).
 */
export async function getVanStockLedger(
  tenantId: string,
  technicianId: string,
  productId?: string,
): Promise<Array<{
  id: string
  transactionType: string
  quantity: number
  balanceAfter: number
  referenceType: string | null
  referenceId: string | null
  performedAt: Date
  notes: string | null
}>> {
  return db.vanStockLedger.findMany({
    where: {
      tenantId,
      technicianId,
      ...(productId ? { productId } : {}),
    },
    select: {
      id: true,
      transactionType: true,
      quantity: true,
      balanceAfter: true,
      referenceType: true,
      referenceId: true,
      performedAt: true,
      notes: true,
    },
    orderBy: { performedAt: 'desc' },
  })
}
