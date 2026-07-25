/**
 * Product Query Service Contract — Cross-Context Read Interface.
 *
 * LAW-04: Inventory Context uses this interface to read Product data
 * WITHOUT directly importing ProductRepository.
 *
 * In production (Laravel), this is bound to ProductQueryService in Product Module.
 * In sandbox (Next.js), we use a Prisma-based implementation.
 */
export interface ProductDTO {
  id: string
  sku: string
  name: string
  productType: string  // serialized|batch|bulk
  status: string
  modelId: string
  modelName?: string | null
  brandName?: string | null
}

export interface ProductInstanceDTO {
  id: string
  serialNumber: string
  productId: string
  status: string
  condition: string
}

export interface IProductQueryService {
  /** Find a product by ID */
  findProduct(productId: string): Promise<ProductDTO | null>

  /** Find a product by ID or throw */
  findProductOrFail(productId: string): Promise<ProductDTO>

  /** Find a product instance by ID */
  findProductInstance(instanceId: string): Promise<ProductInstanceDTO | null>

  /** Find a product instance by serial number */
  findProductInstanceBySerial(serialNumber: string): Promise<ProductInstanceDTO | null>

  /** Check if a product is serialized */
  isSerialized(productId: string): Promise<boolean>
}
