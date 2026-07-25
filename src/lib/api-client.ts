/**
 * BISMARK ERP — API Client
 *
 * Real HTTP API client. No mock data.
 * All pages MUST use this client (Sprint 2 rule).
 */

const API_BASE = '/api/v1'

export interface PaginatedResponse<T> {
  data: T[]
  meta: { page: number; per_page: number; total: number; last_page: number }
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  code: string
  correlation_id: string
  timestamp: string
  errors?: Array<{ field: string; message: string; code: string }>
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let error: ApiError
    try {
      error = await response.json()
    } catch {
      error = {
        type: '',
        title: 'Request Failed',
        status: response.status,
        detail: response.statusText,
        code: 'REQUEST_FAILED',
        correlation_id: '',
        timestamp: new Date().toISOString(),
      }
    }
    throw error
  }

  if (response.status === 204) return null as T
  return response.json()
}

// ============================================================
// Product Categories
// ============================================================

export interface ProductCategory {
  id: string
  tenantId: string
  name: string
  code: string
  parentId: string | null
  level: number
  path: string | null
  isActive: boolean
  description: string | null
  attributes: any[]
  createdAt: string
  updatedAt: string
  children?: ProductCategory[]
}

export const productCategoriesApi = {
  list: (format: 'tree' | 'flat' = 'tree') =>
    request<{ data: ProductCategory[] }>(`/product-categories?format=${format}`),
  get: (id: string) =>
    request<{ data: ProductCategory }>(`/product-categories/${id}`),
  create: (data: Partial<ProductCategory>) =>
    request<{ data: ProductCategory }>(`/product-categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProductCategory>) =>
    request<{ data: ProductCategory }>(`/product-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/product-categories/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Product Brands
// ============================================================

export interface ProductBrand {
  id: string
  tenantId: string
  name: string
  nameEn: string | null
  code: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const productBrandsApi = {
  list: (page = 1, perPage = 20, search = '') =>
    request<PaginatedResponse<ProductBrand>>(
      `/product-brands?page=${page}&per_page=${perPage}${search ? `&search=${search}` : ''}`,
    ),
  get: (id: string) =>
    request<{ data: ProductBrand }>(`/product-brands/${id}`),
  create: (data: Partial<ProductBrand>) =>
    request<{ data: ProductBrand }>(`/product-brands`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProductBrand>) =>
    request<{ data: ProductBrand }>(`/product-brands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/product-brands/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Product Models
// ============================================================

export interface ProductModel {
  id: string
  tenantId: string
  brandId: string
  categoryId: string
  name: string
  modelCode: string
  description: string | null
  warrantyMonths: number
  isSerialized: boolean
  attributes: Record<string, unknown>
  status: string
  createdAt: string
  updatedAt: string
}

export const productModelsApi = {
  list: (page = 1, perPage = 20, search = '') =>
    request<PaginatedResponse<ProductModel>>(
      `/product-models?page=${page}&per_page=${perPage}${search ? `&search=${search}` : ''}`,
    ),
  get: (id: string) =>
    request<{ data: ProductModel }>(`/product-models/${id}`),
  create: (data: Partial<ProductModel>) =>
    request<{ data: ProductModel }>(`/product-models`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<ProductModel>) =>
    request<{ data: ProductModel }>(`/product-models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/product-models/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Products
// ============================================================

export interface Product {
  id: string
  tenantId: string
  modelId: string
  sku: string
  name: string
  productType: string
  barcodeValue: string | null
  unitOfMeasure: string
  status: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export const productsApi = {
  list: (page = 1, perPage = 20, search = '') =>
    request<PaginatedResponse<Product>>(
      `/products?page=${page}&per_page=${perPage}${search ? `&search=${search}` : ''}`,
    ),
  get: (id: string) => request<{ data: Product }>(`/products/${id}`),
  create: (data: Partial<Product>) =>
    request<{ data: Product }>(`/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Product>) =>
    request<{ data: Product }>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
}

// ============================================================
// Warehouses (Sprint 2.2A)
// ============================================================

export interface Warehouse {
  id: string
  code: string
  name: string
  warehouseType: string
  branchId: string | null
  isActive: boolean
  isDefault: boolean
  capacityCubic: number | null
  zoneCount: number
  locationCount: number
  createdAt: string
  updatedAt: string
}

export interface WarehouseZone {
  id: string
  warehouseId: string
  code: string
  name: string
  zoneType: string | null
  isActive: boolean
  locationCount: number
  createdAt: string
}

export const warehousesApi = {
  list: (page = 1, perPage = 20, search = '', warehouseType?: string) =>
    request<PaginatedResponse<Warehouse>>(
      `/warehouses?page=${page}&per_page=${perPage}${search ? `&search=${search}` : ''}${warehouseType ? `&warehouse_type=${warehouseType}` : ''}`,
    ),
  get: (id: string) => request<{ data: Warehouse & { zones: WarehouseZone[] } }>(`/warehouses/${id}`),
  create: (data: Partial<Warehouse>) =>
    request<{ data: Warehouse }>(`/warehouses`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Warehouse>) =>
    request<{ data: Warehouse }>(`/warehouses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/warehouses/${id}`, { method: 'DELETE' }),
  listZones: (warehouseId: string) =>
    request<{ data: WarehouseZone[] }>(`/warehouses/${warehouseId}/zones`),
  createZone: (warehouseId: string, data: Partial<WarehouseZone>) =>
    request<{ data: WarehouseZone }>(`/warehouses/${warehouseId}/zones`, { method: 'POST', body: JSON.stringify(data) }),
}

// ============================================================
// Stock Items + Ledger (Sprint 2.2B — LAW-05 Ledger Pattern)
// ============================================================

export interface StockItem {
  id: string
  warehouseId: string
  warehouseName: string | null
  warehouseCode: string | null
  locationId: string | null
  locationPath: string | null
  productId: string
  productInstanceId: string | null
  batchNumber: string | null
  reservedQuantity: number
  status: string
  receivedDate: string | null
  expiryDate: string | null
  lastTransactionAt: string | null
  // Derived from ledger (LAW-05)
  onHandQuantity?: number
  availableQuantity?: number
  isAvailable?: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: string
  transactionNumber: string
  transactionType: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'COUNT' | 'RESERVATION' | 'RELEASE'
  stockItemId: string
  productId: string
  productInstanceId: string | null
  fromWarehouseId: string | null
  toWarehouseId: string | null
  quantity: number
  unitCost: number | null
  reason: string | null
  referenceType: string | null
  referenceId: string | null
  occurredAt: string
  createdAt: string
}

export interface StockReservation {
  id: string
  reservationNumber: string
  stockItemId: string
  productId: string
  warehouseId: string
  reservedQuantity: number
  reservationType: string
  referenceType: string | null
  referenceId: string | null
  reservedAt: string
  expiresAt: string
  releasedAt: string | null
  consumedAt: string | null
  status: string
}

export const stockItemsApi = {
  list: (page = 1, perPage = 20, filters: { warehouseId?: string; productId?: string } = {}) =>
    request<PaginatedResponse<StockItem>>(
      `/stock-items?page=${page}&per_page=${perPage}${filters.warehouseId ? `&warehouse_id=${filters.warehouseId}` : ''}${filters.productId ? `&product_id=${filters.productId}` : ''}`,
    ),
  getBalance: (id: string) =>
    request<{ data: StockItem & { transactionCount: number; lastTransactionNumber: string | null } }>(`/stock-items/${id}/balance`),
  create: (data: Partial<StockItem>) =>
    request<{ data: StockItem }>(`/stock-items`, { method: 'POST', body: JSON.stringify(data) }),
}

export const inventoryTransactionsApi = {
  list: (page = 1, perPage = 20, filters: { stockItemId?: string; productId?: string; transactionType?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.stockItemId) params.set('stock_item_id', filters.stockItemId)
    if (filters.productId) params.set('product_id', filters.productId)
    if (filters.transactionType) params.set('transaction_type', filters.transactionType)
    return request<PaginatedResponse<InventoryTransaction>>(`/inventory-transactions?${params}`)
  },
  create: (data: Partial<InventoryTransaction>) =>
    request<{ data: InventoryTransaction }>(`/inventory-transactions`, { method: 'POST', body: JSON.stringify(data) }),
}

export const stockReservationsApi = {
  list: (page = 1, perPage = 20, filters: { status?: string; stockItemId?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.status) params.set('status', filters.status)
    if (filters.stockItemId) params.set('stock_item_id', filters.stockItemId)
    return request<PaginatedResponse<StockReservation>>(`/stock-reservations?${params}`)
  },
  create: (data: Partial<StockReservation>) =>
    request<{ data: StockReservation }>(`/stock-reservations`, { method: 'POST', body: JSON.stringify(data) }),
  release: (id: string) =>
    request<{ data: { id: string; status: string } }>(`/stock-reservations/${id}/release`, { method: 'POST', body: '{}' }),
}

// ============================================================
// Stock Transfers (Sprint 2.2C — Idempotent + Optimistic Lock)
// ============================================================

export interface StockTransfer {
  id: string
  transferNumber: string
  transferType: string // warehouse|zone|bin
  fromWarehouseId: string
  toWarehouseId: string | null
  fromLocationId: string | null
  toLocationId: string | null
  status: string // draft|in_transit|received|partial|cancelled
  transferDate: string
  expectedArrival: string | null
  actualArrival: string | null
  notes: string | null
  version: number
  lineCount: number
  lines?: StockTransferLine[]
}

export interface StockTransferLine {
  id: string
  stockItemId: string
  productId: string
  quantity: number
  quantityReceived: number
  unitCost: number | null
}

export const stockTransfersApi = {
  list: (page = 1, perPage = 20, filters: { status?: string; transferType?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.status) params.set('status', filters.status)
    if (filters.transferType) params.set('transfer_type', filters.transferType)
    return request<PaginatedResponse<StockTransfer>>(`/stock-transfers?${params}`)
  },
  get: (id: string) => request<{ data: StockTransfer }>(`/stock-transfers/${id}`),
  create: (data: Partial<StockTransfer>, idempotencyKey?: string) =>
    request<{ data: StockTransfer }>(`/stock-transfers`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  addLine: (transferId: string, data: Partial<StockTransferLine>) =>
    request<{ data: StockTransferLine }>(`/stock-transfers/${transferId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  ship: (id: string, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string; ledgerEntriesCreated: number } }>(`/stock-transfers/${id}/ship`, {
      method: 'POST',
      body: '{}',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  receive: (id: string, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string; ledgerEntriesCreated: number } }>(`/stock-transfers/${id}/receive`, {
      method: 'POST',
      body: '{}',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

// ============================================================
// Movement History (Sprint 2.2C)
// ============================================================

export interface Movement {
  id: string
  movementNumber: string
  movementType: string
  productId: string
  productInstanceId: string | null
  fromWarehouseId: string | null
  toWarehouseId: string | null
  quantity: number
  unitCost: number | null
  reason: string | null
  referenceType: string | null
  referenceId: string | null
  occurredAt: string
}

export const movementsApi = {
  list: (page = 1, perPage = 20, filters: { productId?: string; warehouseId?: string; transactionType?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.productId) params.set('product_id', filters.productId)
    if (filters.warehouseId) params.set('warehouse_id', filters.warehouseId)
    if (filters.transactionType) params.set('transaction_type', filters.transactionType)
    return request<PaginatedResponse<Movement>>(`/movements?${params}`)
  },
}
