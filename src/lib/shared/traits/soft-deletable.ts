/**
 * Soft Deletable Trait — adds soft delete support.
 * Mirrors IsSoftDeletable concern in Laravel.
 */
export interface SoftDeletable {
  deletedAt: Date | null
}

export function isDeleted(entity: SoftDeletable): boolean {
  return entity.deletedAt !== null
}
