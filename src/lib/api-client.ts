/**
 * BISMARK ERP — API Client
 *
 * Real HTTP API client. No mock data.
 * All pages MUST use this client (Sprint 2 rule).
 *
 * Sprint 11 (Auth): Automatically attaches Bearer token to all requests.
 * Token is stored in localStorage after login.
 */

const API_BASE = '/api/v1'
const TOKEN_KEY = 'bismark_access_token'
const REFRESH_TOKEN_KEY = 'bismark_refresh_token'

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

// ============================================================
// Auth Token Management
// ============================================================

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setAuthTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function clearAuthTokens(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return !!getAccessToken()
}

// ============================================================
// Auth API
// ============================================================

export const authApi = {
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw error
    }
    const json = await response.json()
    setAuthTokens(json.data.accessToken, json.data.refreshToken)
    return json.data
  },

  logout: async () => {
    const token = getAccessToken()
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: '{}',
      }).catch(() => {})
    }
    clearAuthTokens()
  },

  me: async () => {
    return request<{ data: { user: any; roles: string[]; permissions: string[] } }>('/auth/me')
  },

  refresh: async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      clearAuthTokens()
      throw new Error('Refresh failed')
    }
    const json = await response.json()
    setAuthTokens(json.data.accessToken, json.data.refreshToken)
    return json.data
  },
}

// ============================================================
// HTTP Request Helper (auto-attaches auth token)
// ============================================================

/**
 * F-06 fix (Audit v4): Public fetch wrapper that auto-attaches the Bearer token.
 *
 * Views that previously used raw `fetch()` without auth headers (returning 401)
 * should use this instead. It mirrors the behaviour of the private `request<T>`
 * helper used by all the typed API singletons.
 *
 * Usage:
 *   const res = await apiFetch('/warranty-cards')
 *   const data = await res.json()
 *
 *   await apiFetch('/warranty-cards', {
 *     method: 'POST',
 *     body: JSON.stringify(form),
 *     headers: { 'Idempotency-Key': crypto.randomUUID() },
 *   })
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Auto-attach Bearer token (F-06 fix)
  const token = getAccessToken()
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 — try refresh, then retry once
  if (response.status === 401 && token) {
    try {
      await authApi.refresh()
      const newToken = getAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        return fetch(`${API_BASE}${path}`, { ...options, headers })
      }
    } catch {
      // refresh failed — fall through to original 401 response
    }
  }

  return response
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Auto-attach Bearer token
  const token = getAccessToken()
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 — try refresh, then retry
  if (response.status === 401 && token) {
    try {
      await authApi.refresh()
      // Retry with new token
      const newToken = getAccessToken()
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`
        const retryResponse = await fetch(`${API_BASE}${path}`, { ...options, headers })
        if (retryResponse.ok) {
          if (retryResponse.status === 204) return null as T
          return retryResponse.json()
        }
      }
    } catch {
      clearAuthTokens()
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

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

// ============================================================
// Cycle Counts (Sprint 2.2D — Full Aggregate: Count → Variance → Approval → Adjustment → Ledger)
// ============================================================

export interface CycleCount {
  id: string
  countNumber: string
  warehouseId: string
  countType: string // full|cycle|spot
  status: string // draft|in_progress|completed|approved|adjusted|cancelled
  scheduledDate: string
  startedAt: string | null
  completedAt: string | null
  approvedAt: string | null
  adjustedAt: string | null
  notes: string | null
  version: number
  lineCount: number
  lines?: CycleCountLine[]
}

export interface CycleCountLine {
  id: string
  stockItemId: string
  productId: string
  productInstanceId: string | null
  batchNumber: string | null
  systemQuantity: number
  countedQuantity: number | null
  variance: number | null // computed: counted - system
  isReconciled: boolean
  varianceReason: string | null
  countedAt: string | null
}

export const cycleCountsApi = {
  list: (page = 1, perPage = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (status) params.set('status', status)
    return request<PaginatedResponse<CycleCount>>(`/cycle-counts?${params}`)
  },
  get: (id: string) => request<{ data: CycleCount & { lines: CycleCountLine[] } }>(`/cycle-counts/${id}`),
  create: (data: Partial<CycleCount>, idempotencyKey?: string) =>
    request<{ data: CycleCount }>(`/cycle-counts`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  start: (id: string, data: { countedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/cycle-counts/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  complete: (id: string, data: { lines: Array<{ lineId: string; countedQuantity: number; reason?: string }> }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/cycle-counts/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  approve: (id: string, data: { approvedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; countNumber: string; status: string; adjustmentsCreated: number; totalVariance: number } }>(`/cycle-counts/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

// ============================================================
// Sales Orders (Sprint 3.1 — Sales Foundation)
// ============================================================

export interface SalesOrder {
  id: string
  orderNumber: string
  customerPartyId: string
  salesRepPartyId: string | null
  branchId: string | null
  orderDate: string
  expectedDelivery: string | null
  actualDelivery: string | null
  status: string // draft|pending_approval|approved|rejected|invoiced|shipped|partially_shipped|completed|cancelled
  paymentStatus: string // unpaid|partial|paid
  subtotal: number
  discountAmount: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  currencyCode: string
  notes: string | null
  version: number
  lineCount: number
  lines?: SalesOrderLine[]
}

export interface SalesOrderLine {
  id: string
  lineNumber: number
  productId: string
  productInstanceId: string | null
  quantityOrdered: number
  quantityReserved: number
  quantityShipped: number
  quantityReturned: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
  notes: string | null
}

export const salesOrdersApi = {
  list: (page = 1, perPage = 20, filters: { status?: string; customerPartyId?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.status) params.set('status', filters.status)
    if (filters.customerPartyId) params.set('customer_party_id', filters.customerPartyId)
    return request<PaginatedResponse<SalesOrder>>(`/sales-orders?${params}`)
  },
  get: (id: string) => request<{ data: SalesOrder & { lines: SalesOrderLine[] } }>(`/sales-orders/${id}`),
  create: (data: {
    customerPartyId: string
    salesRepPartyId?: string
    branchId?: string
    expectedDelivery?: string
    notes?: string
    currencyCode?: string
    shippingAmount?: number
    lines: Array<{
      productId: string
      productInstanceId?: string
      quantityOrdered: number
      unitPrice: number
      discountPercent?: number
      taxPercent?: number
      notes?: string
    }>
  }, idempotencyKey?: string) =>
    request<{ data: SalesOrder }>(`/sales-orders`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  approve: (id: string, data: { approvedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; orderNumber: string; status: string; message: string } }>(`/sales-orders/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  cancel: (id: string, data: { reason?: string; cancelledBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; orderNumber: string; status: string } }>(`/sales-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

// ============================================================
// Shipments / Fulfillment (Sprint 3.2 — LAW-16/17/18)
// ============================================================

export interface Shipment {
  id: string
  shipmentNumber: string
  salesOrderId: string | null
  customerPartyId: string
  fromWarehouseId: string
  toPartyId: string
  status: string // draft|picking|packing|shipped|delivered|returned|cancelled
  shipmentDate: string
  expectedArrival: string | null
  shippedAt: string | null
  deliveredAt: string | null
  shippingMethod: string | null
  trackingNumber: string | null
  shippingCost: number
  version: number
  lineCount: number
  lines?: ShipmentLine[]
}

export interface ShipmentLine {
  id: string
  lineNumber: number
  productId: string
  productInstanceId: string | null
  quantity: number
  quantityPicked: number
  quantityPacked: number
  quantityShipped: number
  quantityDelivered: number
}

export const shipmentsApi = {
  list: (page = 1, perPage = 20, filters: { status?: string; salesOrderId?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.status) params.set('status', filters.status)
    if (filters.salesOrderId) params.set('sales_order_id', filters.salesOrderId)
    return request<PaginatedResponse<Shipment>>(`/shipments?${params}`)
  },
  get: (id: string) => request<{ data: Shipment, lines: ShipmentLine[] }>(`/shipments/${id}`),
  create: (data: { salesOrderId: string; fromWarehouseId: string; shippingMethod?: string; expectedArrival?: string; notes?: string }, idempotencyKey?: string) =>
    request<{ data: Shipment }>(`/shipments`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  pick: (id: string, data: { pickedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/shipments/${id}/pick`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  pack: (id: string, data: { packedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/shipments/${id}/pack`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  ship: (id: string, data: { shippedBy?: string; trackingNumber?: string; shippingMethod?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; shipmentNumber: string; status: string; ledgerEntriesCreated: number; message: string } }>(`/shipments/${id}/ship`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  deliver: (id: string, data: { deliveredBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/shipments/${id}/deliver`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  tracking: (id: string) =>
    request<{ data: { shipmentNumber: string; status: string; trackingNumber: string | null; timeline: Array<{ event: string; timestamp: string; label: string }> } }>(`/shipments/${id}/tracking`),
}

// ============================================================
// Invoices (Sprint 3.3 — Billing, LAW-19/20/21)
// ============================================================

export interface Invoice {
  id: string
  invoiceNumber: string
  salesOrderId: string | null
  customerPartyId: string
  invoiceDate: string
  dueDate: string | null
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  currencyCode: string
  version: number
  lineCount: number
  issuedAt: string | null
  lines?: InvoiceLine[]
}

export interface InvoiceLine {
  id: string
  lineNumber: number
  productId: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export const invoicesApi = {
  list: (page = 1, perPage = 20, filters: { status?: string; customerPartyId?: string } = {}) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (filters.status) params.set('status', filters.status)
    if (filters.customerPartyId) params.set('customer_party_id', filters.customerPartyId)
    return request<PaginatedResponse<Invoice>>(`/invoices?${params}`)
  },
  get: (id: string) => request<{ data: Invoice, lines: InvoiceLine[] }>(`/invoices/${id}`),
  create: (data: { salesOrderId: string; dueDate?: string; notes?: string }, idempotencyKey?: string) =>
    request<{ data: Invoice }>(`/invoices`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  issue: (id: string, data: { issuedBy?: string; taxInvoiceNumber?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; invoiceNumber: string; status: string; message: string } }>(`/invoices/${id}/issue`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  cancel: (id: string, data: { reason?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/invoices/${id}/cancel`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  creditNote: (id: string, data: { amount?: number; reason?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; creditNoteNumber: string; invoiceId: string; status: string; totalAmount: number; message: string } }>(`/invoices/${id}/credit-note`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

// ============================================================
// Payments (Sprint 3.3 — LAW-20: Every Payment Must Be Allocated)
// ============================================================

export interface Payment {
  id: string
  paymentNumber: string
  customerPartyId: string
  paymentDate: string
  amount: number
  currencyCode: string
  paymentMethod: string
  status: string
  referenceNumber: string | null
  version: number
  allocationCount: number
}

export const paymentsApi = {
  list: (page = 1, perPage = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (status) params.set('status', status)
    return request<PaginatedResponse<Payment>>(`/payments?${params}`)
  },
  create: (data: { customerPartyId: string; amount: number; paymentMethod?: string; referenceNumber?: string; notes?: string }, idempotencyKey?: string) =>
    request<{ data: Payment }>(`/payments`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  allocate: (id: string, data: { allocations: Array<{ invoiceId: string; allocatedAmount: number }>; allocatedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; paymentNumber: string; status: string; totalAllocated: number; message: string } }>(`/payments/${id}/allocate`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

// ============================================================
// Returns & Refunds (Sprint 3.4 — LAW-22/23/24)
// ============================================================

export interface ReturnOrder {
  id: string
  returnNumber: string
  salesOrderId: string | null
  invoiceId: string | null
  customerPartyId: string
  returnType: string
  status: string
  returnDate: string
  approvedAt: string | null
  receivedAt: string | null
  closedAt: string | null
  refundAmount: number
  currencyCode: string
  reason: string | null
  version: number
  replacementSalesOrderId: string | null
  lineCount: number
  refundCount: number
}

export interface Refund {
  id: string
  refundNumber: string
  returnOrderId: string
  customerPartyId: string
  amount: number
  currencyCode: string
  refundMethod: string
  status: string
  referenceNumber: string | null
  version: number
}

export const returnsApi = {
  list: (page = 1, perPage = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
    if (status) params.set('status', status)
    return request<PaginatedResponse<ReturnOrder>>(`/return-orders?${params}`)
  },
  get: (id: string) => request<{ data: ReturnOrder }>(`/return-orders/${id}`),
  create: (data: { customerPartyId: string; salesOrderId?: string; invoiceId?: string; returnType?: string; reason?: string; lines: Array<{ productId: string; productInstanceId?: string; quantityReturned: number; unitPrice: number; returnReason?: string }> }, idempotencyKey?: string) =>
    request<{ data: ReturnOrder }>(`/return-orders`, { method: 'POST', body: JSON.stringify(data), headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  approve: (id: string, data: { approvedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; returnNumber: string; status: string; message: string } }>(`/return-orders/${id}/approve`, { method: 'POST', body: JSON.stringify(data), headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  receive: (id: string, data: { warehouseId: string; receivedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; returnNumber: string; status: string; ledgerEntriesCreated: number; message: string } }>(`/return-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(data), headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  close: (id: string, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/return-orders/${id}/close`, { method: 'POST', body: '{}', headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  createReplacement: (id: string, idempotencyKey?: string) =>
    request<{ data: { id: string; returnNumber: string; replacementSalesOrderId: string; replacementOrderNumber: string; message: string } }>(`/return-orders/${id}/create-replacement`, { method: 'POST', body: '{}', headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
}

export const refundsApi = {
  list: (page = 1, perPage = 20) =>
    request<PaginatedResponse<Refund>>(`/refunds?page=${page}&per_page=${perPage}`),
  create: (data: { returnOrderId: string; amount: number; refundMethod?: string; referenceNumber?: string }, idempotencyKey?: string) =>
    request<{ data: Refund }>(`/refunds`, { method: 'POST', body: JSON.stringify(data), headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
  approve: (id: string, data: { approvedBy?: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; refundNumber: string; status: string; message: string } }>(`/refunds/${id}/approve`, { method: 'POST', body: JSON.stringify(data), headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {} }),
}

// ============================================================
// Notification Center (Sprint 7.3 — LAW-55/56/57)
// ============================================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push' | 'inapp'
export type NotificationStatus =
  | 'pending' | 'queued' | 'sending' | 'sent' | 'failed' | 'retrying' | 'cancelled'

export interface NotificationTemplate {
  id: string
  code: string
  name: string
  version: number
  language: string
  channel: NotificationChannel
  subjectTemplate: string | null
  bodyTemplate: string
  variablesSchema: any
  status: 'draft' | 'published' | 'disabled'
  effectiveFrom: string
  effectiveTo: string | null
  publishedAt: string | null
  description: string | null
  notificationCount?: number
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  templateCode: string
  templateVersion: number
  language: string
  recipientId: string | null
  recipientName: string | null
  recipientAddress: string
  channel: NotificationChannel
  status: NotificationStatus
  payload: any
  renderedSubject: string | null
  renderedBody: string
  messageId: string | null
  idempotencyKey: string
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  queuedAt: string | null
  sentAt: string | null
  failedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  cancelReason: string | null
  deliveryCount?: number
  deliveries?: NotificationDelivery[]
  queueItems?: NotificationQueueItem[]
  template?: Pick<NotificationTemplate, 'id' | 'code' | 'version' | 'name' | 'language' | 'channel'>
}

export interface NotificationDelivery {
  id: string
  provider: string
  attempt: number
  status: 'sending' | 'sent' | 'failed'
  response: any
  durationMs: number
  errorMessage: string | null
  createdAt: string
}

export interface NotificationQueueItem {
  id: string
  priority: number
  attempt: number
  maxAttempts: number
  nextRetryAt: string
  inDeadLetter: boolean
  deadLetterAt: string | null
  deadLetterReason: string | null
  lockedBy: string | null
  lockedAt: string | null
  createdAt: string
}

export interface NotificationPreference {
  id: string
  userId: string
  emailEnabled: boolean
  smsEnabled: boolean
  pushEnabled: boolean
  whatsappEnabled: boolean
  inappEnabled: boolean
  language: string
  quietHoursStart: string | null
  quietHoursEnd: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationStats {
  queued: number
  sending: number
  sentToday: number
  failed: number
  retrying: number
  dlq: number
  byChannel: Record<NotificationChannel, number>
  successRate: number
  avgDeliveryMs: number | null
}

export const notificationTemplatesApi = {
  list: (params: { page?: number; perPage?: number; status?: string; channel?: string; language?: string; code?: string } = {}) => {
    const sp = new URLSearchParams()
    sp.set('page', String(params.page ?? 1))
    sp.set('per_page', String(params.perPage ?? 20))
    if (params.status) sp.set('status', params.status)
    if (params.channel) sp.set('channel', params.channel)
    if (params.language) sp.set('language', params.language)
    if (params.code) sp.set('code', params.code)
    return request<PaginatedResponse<NotificationTemplate>>(`/notification/templates?${sp}`)
  },
  get: (id: string) =>
    request<{ data: NotificationTemplate }>(`/notification/templates/${id}`),
  versions: (id: string) =>
    request<{ data: NotificationTemplate[] }>(`/notification/templates/${id}/versions`),
  create: (data: {
    code: string
    name: string
    language: string
    channel: NotificationChannel
    subjectTemplate?: string
    bodyTemplate: string
    variablesSchema?: any
    description?: string
  }, idempotencyKey?: string) =>
    request<{ data: NotificationTemplate; warnings?: string[] }>(`/notification/templates`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  publish: (id: string, idempotencyKey?: string) =>
    request<{ data: NotificationTemplate }>(`/notification/templates/${id}/publish`, {
      method: 'POST', body: '{}',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  preview: (id: string, variables: Record<string, any>, idempotencyKey?: string) =>
    request<{ data: { subject: string | null; body: string; warnings: string[]; issues: string[] } }>(
      `/notification/templates/${id}/preview`, {
        method: 'POST', body: JSON.stringify({ variables }),
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
  seedDefaults: (idempotencyKey?: string) =>
    request<{ data: { seeded: NotificationTemplate[]; alreadySeeded: boolean; message?: string } }>(
      `/notification/templates/seed-defaults`, {
        method: 'POST', body: '{}',
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
}

export const notificationsApi = {
  list: (params: { page?: number; perPage?: number; status?: string; channel?: string; recipientId?: string } = {}) => {
    const sp = new URLSearchParams()
    sp.set('page', String(params.page ?? 1))
    sp.set('per_page', String(params.perPage ?? 20))
    if (params.status) sp.set('status', params.status)
    if (params.channel) sp.set('channel', params.channel)
    if (params.recipientId) sp.set('recipientId', params.recipientId)
    return request<PaginatedResponse<Notification>>(`/notifications?${sp}`)
  },
  get: (id: string) =>
    request<{ data: Notification }>(`/notifications/${id}`),
  send: (data: {
    templateCode: string
    channel?: NotificationChannel
    language?: string
    recipientId?: string
    recipientName?: string
    recipientAddress: string
    variables: Record<string, any>
    priority?: number
    triggeredByEvent?: string
    idempotencyKey?: string
  }, idempotencyKey?: string) =>
    request<{ data: { notificationId: string; status: string; created: boolean; message?: string } }>(
      `/notifications/send`, {
        method: 'POST', body: JSON.stringify(data),
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
  retry: (id: string, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string; message: string } }>(`/notifications/${id}/retry`, {
      method: 'POST', body: '{}',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  cancel: (id: string, data: { reason: string; cancelledBy: string }, idempotencyKey?: string) =>
    request<{ data: { id: string; status: string } }>(`/notifications/${id}/cancel`, {
      method: 'POST', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
  stats: () =>
    request<{ data: NotificationStats }>(`/notifications/stats`),
}

export const notificationPreferencesApi = {
  list: (page = 1, perPage = 20) =>
    request<PaginatedResponse<NotificationPreference>>(`/notification-preferences?page=${page}&per_page=${perPage}`),
  get: (userId: string) =>
    request<{ data: NotificationPreference }>(`/notification-preferences/${userId}`),
  update: (userId: string, data: Partial<{
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
    whatsappEnabled: boolean
    inappEnabled: boolean
    language: string
    quietHoursStart: string | null
    quietHoursEnd: string | null
  }>, idempotencyKey?: string) =>
    request<{ data: NotificationPreference }>(`/notification-preferences/${userId}`, {
      method: 'PUT', body: JSON.stringify(data),
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),
}

export interface NotificationQueueList {
  id: string
  priority: number
  attempt: number
  maxAttempts: number
  nextRetryAt: string
  inDeadLetter: boolean
  deadLetterAt: string | null
  deadLetterReason: string | null
  lockedBy: string | null
  lockedAt: string | null
  notificationId: string
  notification: {
    id: string
    status: NotificationStatus
    channel: NotificationChannel
    recipientAddress: string
    templateCode: string
  }
  createdAt: string
}

export const notificationQueueApi = {
  list: (params: { page?: number; perPage?: number; status?: 'dlq' | 'ready' | 'locked' | 'pending' } = {}) => {
    const sp = new URLSearchParams()
    sp.set('page', String(params.page ?? 1))
    sp.set('per_page', String(params.perPage ?? 20))
    if (params.status) sp.set('status', params.status)
    return request<PaginatedResponse<NotificationQueueList>>(`/notification-queue?${sp}`)
  },
  process: (data: { batchSize?: number; workerId?: string } = {}, idempotencyKey?: string) =>
    request<{ data: { processed: number; results: Array<{ queueItemId: string; notificationId: string; status: string }> } }>(
      `/notification-queue/process`, {
        method: 'POST', body: JSON.stringify(data),
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
}
