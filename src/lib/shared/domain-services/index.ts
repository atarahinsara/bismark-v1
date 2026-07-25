/**
 * Domain Services — shared business logic that doesn't belong to a single entity.
 *
 * Domain Services are stateless and operate on multiple aggregates.
 * They live in the Shared Kernel when the logic is cross-cutting
 * (e.g., BusinessCodeGenerator, PricingCalculator).
 *
 * Context-specific domain services live in their module's /services/ folder.
 */

// BusinessCodeGenerator is the primary shared domain service.
// It uses BusinessCodeRepository (Shared Kernel) for data access.
export { BusinessCodeGenerator } from '../helpers/business-code-generator'
