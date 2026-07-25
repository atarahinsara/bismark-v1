import { db } from '@/lib/db'
import { getTenantId } from '@/lib/api-helpers'
import type {
  IProductQueryService,
  ProductDTO,
  ProductInstanceDTO,
} from '../contracts/product-query-service'
import { NotFoundException } from '@/lib/shared'

/**
 * Product Query Service — Prisma implementation.
 *
 * Implements IProductQueryService for the sandbox (Next.js + Prisma).
 * In production (Laravel), this is replaced by Eloquent-based implementation.
 *
 * LAW-04: Inventory Context imports this Contract, NOT ProductRepository.
 */
export class ProductQueryService implements IProductQueryService {
  async findProduct(productId: string): Promise<ProductDTO | null> {
    const tenantId = await getTenantId()
    const product = await db.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      include: { model: { include: { brand: true } } },
    })
    if (!product) return null
    return this.toDTO(product)
  }

  async findProductOrFail(productId: string): Promise<ProductDTO> {
    const dto = await this.findProduct(productId)
    if (!dto) throw new NotFoundException('Product', productId)
    return dto
  }

  async findProductInstance(instanceId: string): Promise<ProductInstanceDTO | null> {
    const tenantId = await getTenantId()
    const instance = await db.productInstance.findFirst({
      where: { id: instanceId, tenantId, deletedAt: null },
    })
    if (!instance) return null
    return {
      id: instance.id,
      serialNumber: instance.serialNumber,
      productId: instance.productId,
      status: instance.status,
      condition: instance.condition,
    }
  }

  async findProductInstanceBySerial(serialNumber: string): Promise<ProductInstanceDTO | null> {
    const tenantId = await getTenantId()
    const instance = await db.productInstance.findFirst({
      where: { serialNumber, tenantId, deletedAt: null },
    })
    if (!instance) return null
    return {
      id: instance.id,
      serialNumber: instance.serialNumber,
      productId: instance.productId,
      status: instance.status,
      condition: instance.condition,
    }
  }

  async isSerialized(productId: string): Promise<boolean> {
    const product = await this.findProduct(productId)
    if (!product) return false
    return product.productType === 'serialized'
  }

  private toDTO(product: any): ProductDTO {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      productType: product.productType,
      status: product.status,
      modelId: product.modelId,
      modelName: product.model?.name ?? null,
      brandName: product.model?.brand?.name ?? null,
    }
  }
}

// Singleton instance
let instance: ProductQueryService | null = null

export function getProductQueryService(): IProductQueryService {
  if (!instance) {
    instance = new ProductQueryService()
  }
  return instance
}
