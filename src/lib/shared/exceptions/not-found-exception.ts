import { DomainException } from './domain-exception'

export class NotFoundException extends DomainException {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404)
  }
}
