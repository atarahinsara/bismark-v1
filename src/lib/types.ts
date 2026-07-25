// BISMARK ERP — TypeScript Types (mirrors Laravel entities)
// Auto-generated pattern: these match the design/sprint-1-entities.yaml

export type UserType = 'customer' | 'representative' | 'technician' | 'service_center' | 'staff'
export type UserStatus = 'active' | 'suspended' | 'locked' | 'deleted'
export type PartyType = 'person' | 'organization'
export type PartyStatus = 'active' | 'inactive' | 'suspended' | 'blacklisted'

export interface User {
  id: string
  tenant_id: string
  username: string
  display_name: string
  email: string | null
  phone: string | null
  user_type: UserType
  status: UserStatus
  locale: string
  is_active: boolean
  locked_until: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  roles?: Role[]
}

export interface Role {
  id: string
  tenant_id: string
  key: string
  name: string
  description: string | null
  is_system: boolean
  created_at: string
  permissions?: Permission[]
  user_count?: number
}

export interface Permission {
  id: string
  key: string
  module: string
  action: string
  description: string | null
  is_system: boolean
}

export interface Party {
  id: string
  tenant_id: string
  business_code: string
  party_type: PartyType
  display_name: string
  status: PartyStatus
  tax_id: string | null
  registration_no: string | null
  created_at: string
  updated_at: string
  person?: Person | null
  organization?: Organization | null
}

export interface Person {
  first_name: string
  last_name: string
  national_id: string | null
  birth_date: string | null
  gender: 'male' | 'female' | 'other' | null
  nationality: string
}

export interface Organization {
  legal_name: string
  legal_name_en: string | null
  organization_type: string | null
  established_date: string | null
  industry_code: string | null
  employee_count: number | null
}

export interface Branch {
  id: string
  name: string
  code: string
  parent_id: string | null
  address: any
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  status: 'active' | 'expired' | 'revoked'
  ip_address: string
  user_agent: string | null
  device_fingerprint: string | null
  issued_at: string
  last_activity_at: string
  expires_at: string
  revoked_at: string | null
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  user: User
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    per_page: number
    total: number
    last_page: number
  }
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  code: string
  correlation_id: string
  timestamp: string
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}
