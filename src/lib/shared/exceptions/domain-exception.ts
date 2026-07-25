/**
 * Base Domain Exception
 */
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toApiError() {
    return {
      type: `https://docs.bismark.api/errors/${this.code.toLowerCase()}`,
      title: this.name,
      status: this.statusCode,
      detail: this.message,
      code: this.code,
      correlation_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
  }
}
