/**
 * Auditable Trait — adds audit metadata to entities.
 * Mirrors HasAuditability concern in Laravel.
 */
export interface Auditable {
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  updatedBy: string | null
}
