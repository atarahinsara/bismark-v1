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
export * from './laws/law-19'
export * from './laws/law-20'
export * from './laws/law-21'
export * from './laws/law-22'
export * from './laws/law-23'
export * from './laws/law-24'
export * from './laws/law-25'
export * from './laws/law-26'
export * from './laws/law-27'
export * from './laws/law-28'
export * from './laws/law-29'
export * from './laws/law-30'
export * from './laws/law-31'
export * from './laws/law-32'
export * from './laws/law-33'
export * from './laws/law-34'
export * from './laws/law-35'
export * from './laws/law-36'
export * from './laws/law-37'
export * from './laws/law-38'
export * from './laws/law-39'
export * from './laws/law-40'
export * from './laws/law-41'
export * from './laws/law-42'
export * from './laws/law-43'
export * from './laws/law-44'
export * from './laws/law-45'
export * from './laws/law-46'
export * from './laws/law-47'
export * from './laws/law-48'
export * from './laws/law-49'
export * from './laws/law-50'
export * from './laws/law-51'
export * from './laws/law-52'
export * from './laws/law-53'
export * from './laws/law-54'
