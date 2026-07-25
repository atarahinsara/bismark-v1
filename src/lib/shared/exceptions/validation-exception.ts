import { DomainException } from './domain-exception'

export class ValidationException extends DomainException {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string; code: string }> = [],
  ) {
    super(message, 'VALIDATION_FAILED', 422)
  }

  toApiError() {
    return {
      ...super.toApiError(),
      errors: this.errors,
    }
  }
}
