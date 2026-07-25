/**
 * BISMARK ERP — Shared Kernel
 *
 * No business logic. Only technical primitives used across all modules.
 * Mirrors the Laravel Shared Kernel structure (ADR-016).
 */

// Value Objects
export * from './value-objects/uuid-v7'
export * from './value-objects/money'
export * from './value-objects/date-range'
export * from './value-objects/locale'

// Exceptions
export * from './exceptions/domain-exception'
export * from './exceptions/not-found-exception'
export * from './exceptions/validation-exception'
export * from './exceptions/business-exception'
export * from './exceptions/conflict-exception'

// Events
export * from './events/domain-event'
export * from './events/event-bus'

// Contracts (interfaces for cross-module communication — LAW-03/04)
export * from './contracts/tenant-context'
export * from './contracts/repository'
export * from './contracts/event-bus-interface'

// Specifications
export * from './specifications/specification'

// Traits (TypeScript mixins/helpers)
export * from './traits/auditable'
export * from './traits/soft-deletable'

// Helpers
export * from './helpers/persian-calendar'
export * from './helpers/business-code-generator'

// Infrastructure
export * from './infra/prisma-event-bus'
export * from './infra/idempotency-helper'
export * from './infra/optimistic-lock-helper'
export * from './infra/unit-of-work'

// Outbox (LAW-08)
export * from './outbox'

// Snapshot Engine (LAW-10)
export * from './snapshot'

// Domain Services (shared business logic)
export * from './domain-services'

// Repositories (shared data access — cross-cutting)
export * from './repositories'

// Architecture Laws
export * from './laws/law-04'
export * from './laws/law-05'
export * from './laws/law-06'
export * from './laws/law-07'
export * from './laws/law-08'
export * from './laws/law-09'
export * from './laws/law-10'
export * from './laws/law-11'
export * from './laws/law-12'
export * from './laws/law-13'
export * from './laws/law-14'
export * from './laws/law-15'
export * from './laws/law-16'
export * from './laws/law-17'
export * from './laws/law-18'
