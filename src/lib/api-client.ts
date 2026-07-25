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
