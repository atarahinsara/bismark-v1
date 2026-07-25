import { DomainException } from './domain-exception'

export class ConflictException extends DomainException {
  constructor(message: string, code: string = 'CONFLICT') {
    super(message, code, 409)
  }
}
