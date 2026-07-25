/**
 * Shared Repositories — data access for cross-cutting concerns.
 *
 * These repositories serve multiple Bounded Contexts and therefore
 * live in the Shared Kernel (not in any specific module).
 *
 * Examples:
 *   - BusinessCodeRepository (used by all modules for LAW-02)
 *
 * Context-specific repositories live in their module's /repositories/ folder
 * and are NOT imported by other contexts (LAW-04).
 */
export { BusinessCodeRepository } from './business-code-repository'
