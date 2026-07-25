import { describe, it, expect } from 'vitest'
import { BUSINESS_CODE_DEFINITIONS, BusinessCodeGenerator } from '@/lib/shared/helpers/business-code-generator'
import { persianYear } from '@/lib/shared/helpers/persian-calendar'
import { EVENT_CATALOG, getEventDefinition, getEventsByPublisher, getEventsByConsumer } from '@/lib/event-catalog'
import { SAGA_DEFINITIONS } from '@/lib/saga/saga-manager'

// ============================================================
// Business Code Generator Tests (LAW-02)
// ============================================================
describe('BusinessCodeGenerator', () => {
  it('should have definitions for all critical modules', () => {
    const requiredKeys = [
      'party', 'product_category', 'product_brand', 'product_model', 'product',
      'warehouse', 'inventory_transaction', 'stock_transfer', 'stock_count',
      'sales_order', 'shipment', 'sales_invoice', 'payment', 'credit_note',
      'return_order', 'refund',
      'warranty_card', 'warranty_claim',
      'service_request', 'service_order', 'quality_check',
    ]
    for (const key of requiredKeys) {
      expect(BUSINESS_CODE_DEFINITIONS[key], `Missing business code definition: ${key}`).toBeDefined()
    }
  })

  it('should validate business codes correctly', () => {
    expect(BusinessCodeGenerator.validate('PRT-1403-00001', 'party')).toBe(true)
    expect(BusinessCodeGenerator.validate('PRT-1403-00001', 'sales_order')).toBe(false)
    expect(BusinessCodeGenerator.validate('INVALID', 'party')).toBe(false)
  })

  it('should have consistent prefix and padding for all definitions', () => {
    for (const [key, def] of Object.entries(BUSINESS_CODE_DEFINITIONS)) {
      expect(def.prefix, `Prefix for ${key}`).toMatch(/^[A-Z]{2,5}$/)
      expect(def.padding, `Padding for ${key}`).toBeGreaterThanOrEqual(3)
      expect(def.padding, `Padding for ${key}`).toBeLessThanOrEqual(7)
    }
  })
})

// ============================================================
// Persian Calendar Tests
// ============================================================
describe('PersianCalendar', () => {
  it('should return a 4-digit year', () => {
    const year = persianYear(new Date('2025-01-15'))
    expect(year).toBeGreaterThan(1300)
    expect(year).toBeLessThan(1500)
  })

  it('should return consistent year for same date', () => {
    const date = new Date('2025-06-15')
    expect(persianYear(date)).toBe(persianYear(date))
  })
})

// ============================================================
// Event Catalog Tests (LAW-15: versioning, LAW-25: cross-context)
// ============================================================
describe('Event Catalog', () => {
  it('should have at least 30 events', () => {
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(30)
  })

  it('should have version for every event (LAW-15)', () => {
    for (const event of EVENT_CATALOG) {
      expect(event.version, `Version for ${event.eventType}`).toMatch(/^\d+\.\d+$/)
    }
  })

  it('should have at least one consumer for every event', () => {
    for (const event of EVENT_CATALOG) {
      expect(event.consumers.length, `Consumers for ${event.eventType}`).toBeGreaterThan(0)
    }
  })

  it('should have idempotency key for every event (LAW-26)', () => {
    for (const event of EVENT_CATALOG) {
      expect(event.idempotencyKey, `Idempotency key for ${event.eventType}`).toBeTruthy()
    }
  })

  it('should have payload fields for every event', () => {
    for (const event of EVENT_CATALOG) {
      expect(event.payloadFields.length, `Payload fields for ${event.eventType}`).toBeGreaterThan(0)
    }
  })

  it('should find event by type', () => {
    const event = getEventDefinition('sales_order.approved')
    expect(event).toBeDefined()
    expect(event!.publisher).toBe('Sales')
    expect(event!.consumers).toContain('Inventory')
  })

  it('should find events by publisher', () => {
    const salesEvents = getEventsByPublisher('Sales')
    expect(salesEvents.length).toBeGreaterThan(0)
    expect(salesEvents.every((e) => e.publisher === 'Sales')).toBe(true)
  })

  it('should find events by consumer', () => {
    const financialEvents = getEventsByConsumer('Financial')
    expect(financialEvents.length).toBeGreaterThan(0)
  })

  it('should have Financial as consumer for billing events (LAW-19)', () => {
    const invoiceIssued = getEventDefinition('invoice.issued')
    expect(invoiceIssued!.consumers).toContain('Financial')
  })

  it('should have Service as consumer for warranty events (LAW-33)', () => {
    const claimApproved = getEventDefinition('warranty.claim.approved')
    expect(claimApproved!.consumers).toContain('Service')
  })

  it('should have DeviceTimeline as consumer for lifecycle events (LAW-30)', () => {
    const warrantyActivated = getEventDefinition('warranty.activated')
    expect(warrantyActivated!.consumers).toContain('DeviceTimeline')
  })
})

// ============================================================
// Saga Definition Tests (LAW-27)
// ============================================================
describe('Saga Definitions', () => {
  it('should have sales_order_fulfillment saga', () => {
    expect(SAGA_DEFINITIONS.sales_order_fulfillment).toBeDefined()
    expect(SAGA_DEFINITIONS.sales_order_fulfillment.steps.length).toBeGreaterThan(0)
  })

  it('should have return_processing saga', () => {
    expect(SAGA_DEFINITIONS.return_processing).toBeDefined()
    expect(SAGA_DEFINITIONS.return_processing.steps.length).toBeGreaterThan(0)
  })

  it('should have compensation action for every step (LAW-27)', () => {
    for (const [key, saga] of Object.entries(SAGA_DEFINITIONS)) {
      for (const step of saga.steps) {
        expect(step.compensationAction, `Compensation for ${key} step ${step.step}`).toBeDefined()
      }
    }
  })

  it('should have sequential step numbers', () => {
    for (const [key, saga] of Object.entries(SAGA_DEFINITIONS)) {
      for (let i = 0; i < saga.steps.length; i++) {
        expect(saga.steps[i].step, `Step number for ${key} at index ${i}`).toBe(i + 1)
      }
    }
  })

  it('should have trigger and completion events for every step', () => {
    for (const [key, saga] of Object.entries(SAGA_DEFINITIONS)) {
      for (const step of saga.steps) {
        expect(step.triggerEvent, `Trigger event for ${key} step ${step.step}`).toBeTruthy()
        expect(step.completionEvent, `Completion event for ${key} step ${step.step}`).toBeTruthy()
      }
    }
  })
})
