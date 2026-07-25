/**
 * LAW-04 — No Direct Cross-Context Repository Imports
 *
 * No Context may directly import a Repository belonging to another Context.
 * Cross-context communication is ONLY allowed via:
 *   - Query Service (read)
 *   - Published DTO (data transfer)
 *   - Domain Event (async, via EventBus)
 *   - Application Service (orchestration)
 *
 * This prevents dangerous coupling between Bounded Contexts.
 *
 * Related: LAW-01 (no cross-context JOIN), LAW-03 (no cross-context repo access from endpoints).
 */
export const LAW_04_DESCRIPTION = `
LAW-04: No Direct Cross-Context Repository Imports

A module in src/lib/modules/{Context}/ may NOT import from src/lib/modules/{OtherContext}/repositories/.

Allowed cross-context imports:
  - src/lib/modules/{Context}/contracts/        (Query/Command Service interfaces)
  - src/lib/modules/{Context}/contracts/dtos/   (DTOs)
  - src/lib/shared/                              (Shared Kernel)

Example VIOLATION (forbidden):
  import { UserRepository } from '@/lib/modules/identity/repositories/user-repository'
  // ↑ Sales module directly accessing Identity repository

Example CORRECT:
  import { UserQueryService } from '@/lib/modules/identity/contracts/user-query-service'
  // ↑ Sales module accessing Identity via Contract (Application Service)
`
