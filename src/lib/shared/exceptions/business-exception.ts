import { DomainException } from './domain-exception'

/**
 * Base class for business-domain exceptions (e.g., WARRANTY_EXPIRED, STOCK_INSUFFICIENT).
 */
export class BusinessException extends DomainException {
  constructor(message: string, code: string, statusCode: number = 422) {
    super(message, code, statusCode)
  }
}

export class WarrantyExpiredException extends BusinessException {
  constructor(warrantyCode: string) {
    super(`Warranty ${warrantyCode} has expired`, 'WARRANTY_EXPIRED', 422)
  }
}

export class StockInsufficientException extends BusinessException {
  constructor(productId: string, requested: number, available: number) {
    super(
      `Insufficient stock for product ${productId}: requested ${requested}, available ${available}`,
      'STOCK_INSUFFICIENT',
      422,
    )
  }
}

export class ImmutableFieldException extends BusinessException {
  constructor(field: string, entityId: string) {
    super(
      `Field '${field}' is immutable and cannot be changed after creation (entity: ${entityId})`,
      'IMMUTABLE_FIELD',
      422,
    )
  }
}

export class BusinessCodeConflictException extends BusinessException {
  constructor(code: string) {
    super(`Business code '${code}' already exists`, 'DUPLICATE_BUSINESS_CODE', 409)
  }
}
