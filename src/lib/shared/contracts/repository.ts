/**
 * Repository Contract — base interface for all repositories.
 * Enforces tenant-scoping (ADR-003) and CRUD operations.
 */
export interface RepositoryInterface<T> {
  find(id: string): Promise<T | null>
  findByIds(ids: string[]): Promise<T[]>
  paginate(params: {
    page: number
    perPage: number
    sort?: string
    filters?: Record<string, unknown>
  }): Promise<{ data: T[]; total: number; page: number; perPage: number }>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}
