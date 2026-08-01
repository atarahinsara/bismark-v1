import { requireAuth, requirePermission, unauthorizedResponse } from '@/lib/rbac'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getTenantId, jsonResponse, errorResponse } from '@/lib/api-helpers'
import { IdempotencyHelper, UnitOfWork } from '@/lib/shared'
import { DomainException, ValidationException, NotFoundException, BusinessException } from '@/lib/shared'

/**
 * POST /api/v1/rules/evaluate
 * LAW-52: Only Rule Engine evaluates business rules.
 * LAW-53: Deterministic (same input + same rule version = same output).
 * LAW-54: Fully auditable (RuleExecution + RuleAuditStep records).
 *
 * Input: { context, event, payload, workflowInstanceId? }
 * Output: { matchedRules, actions, decision, executionId }
 *
 * Flow:
 *   1. Find published RuleSets for the given context (effective at now)
 *   2. Sort by priority (highest first)
 *   3. For each RuleSet, load enabled Rules sorted by priority
 *   4. For each Rule, evaluate conditionDsl against payload
 *   5. First match wins (or collect all matches — configurable)
 *   6. Collect actions from matched rules
 *   7. Determine final decision (deny > requireApproval > escalate > notify > allow)
 *   8. Record RuleExecution + RuleAuditSteps (LAW-54)
 *   9. Publish 'rule.evaluated' event
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = requireAuth(request)
    if (!ctx) return unauthorizedResponse()
    await requirePermission(ctx, 'rule.evaluate')

    const idempotent = await IdempotencyHelper.check(request)
    if (idempotent.cached && idempotent.response) return idempotent.response

    const tenantId = await getTenantId()
    const body = await request.json()

    if (!body.context) throw new ValidationException('Context is required', [{ field: 'context', message: 'Required', code: 'REQUIRED' }])
    if (!body.event) throw new ValidationException('Event is required', [{ field: 'event', message: 'Required', code: 'REQUIRED' }])
    if (!body.payload) throw new ValidationException('Payload is required', [{ field: 'payload', message: 'Required', code: 'REQUIRED' }])

    const startTime = Date.now()

    // LAW-52: Find published rulesets for this context
    const ruleSets = await db.ruleSet.findMany({
      where: { tenantId, context: body.context, status: 'published', deletedAt: null,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }],
      },
      include: { rules: { where: { enabled: true, deletedAt: null }, orderBy: { priority: 'desc' } } },
      orderBy: { priority: 'desc' },
    })

    if (ruleSets.length === 0) {
      // No rulesets — default allow
      const response = jsonResponse({
        data: {
          decision: 'allow', matchedRules: [], actions: [],
          executionTime: Date.now() - startTime,
          message: 'No published rulesets found for this context — defaulting to allow.',
        },
      })
      const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
      return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
    }

    const auditSteps: any[] = []
    let stepNumber = 0
    const matchedRules: any[] = []
    const actions: any[] = []
    let firstMatchedRuleDefId: string | null = null
    let matchedRuleSetCode = ''
    let matchedRuleSetVersion = 1

    // Evaluate rules
    for (const rs of ruleSets) {
      for (const rule of rs.rules) {
        stepNumber++
        const stepStart = Date.now()
        const condition = rule.conditionDsl as any
        const expressionStr = JSON.stringify(condition)

        try {
          const matched = evaluateCondition(condition, body.payload)
          const stepDuration = Date.now() - stepStart

          auditSteps.push({
            stepNumber, ruleName: rule.name,
            expression: expressionStr,
            result: matched ? 'true' : 'false',
            duration: stepDuration,
          })

          if (matched) {
            matchedRules.push({ id: rule.id, name: rule.name, ruleSet: rs.code, action: rule.actionDsl })
            actions.push(rule.actionDsl)
            if (!firstMatchedRuleDefId) {
              firstMatchedRuleDefId = rule.id
              matchedRuleSetCode = rs.code
              matchedRuleSetVersion = rs.version
            }
          }
        } catch (err: any) {
          auditSteps.push({
            stepNumber, ruleName: rule.name,
            expression: expressionStr,
            result: 'error',
            duration: Date.now() - stepStart,
            notes: err.message,
          })
        }
      }
    }

    // Determine final decision (priority: deny > requireApproval > escalate > notify > allow)
    const decisionPriority: Record<string, number> = { deny: 5, requireApproval: 4, escalate: 3, notify: 2, allow: 1, autoApprove: 1 }
    let finalDecision = 'allow'
    for (const action of actions) {
      const type = (action as any)?.type || 'allow'
        const priority = decisionPriority[type] || 0
      if (priority > (decisionPriority[finalDecision] || 0)) {
        finalDecision = type
      }
    }

    const executionTime = Date.now() - startTime

    // LAW-54: Record execution + audit steps
    const execution = await UnitOfWork.execute(async (uow) => {
      const exec = await uow.tx.ruleExecution.create({
        data: {
          tenantId,
          ruleDefinitionId: firstMatchedRuleDefId,
          ruleSetCode: matchedRuleSetCode || ruleSets[0].code,
          ruleSetVersion: matchedRuleSetVersion || ruleSets[0].version,
          workflowInstanceId: body.workflowInstanceId ?? null,
          eventType: body.event,
          inputSnapshot: body.payload,
          result: finalDecision,
          actions: actions as any,
          matchedRules: matchedRules as any,
          executionTime,
        },
      })

      for (const step of auditSteps) {
        await uow.tx.ruleAuditStep.create({
          data: { executionId: exec.id, stepNumber: step.stepNumber, ruleName: step.ruleName, expression: step.expression, result: step.result, duration: step.duration, notes: step.notes ?? null },
        })
      }

      await uow.outbox.append({
        tenantId, aggregateType: 'RuleExecution', aggregateId: exec.id,
        eventType: 'rule.evaluated', eventVersion: '1.0',
        payload: { context: body.context, event: body.event, decision: finalDecision, matchedRuleCount: matchedRules.length, executionTime },
        actorId: null,
      })

      return exec
    })

    const response = jsonResponse({
      data: {
        executionId: execution.id,
        decision: finalDecision,
        matchedRules,
        actions,
        executionTime,
        auditSteps: auditSteps.length,
      },
    })

    const responseBody = await response.text()
    await IdempotencyHelper.store(request, responseBody, 200, JSON.stringify(body || {}))
    return new Response(responseBody, { status: response.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    if (e instanceof DomainException) return errorResponse({ code: e.code, message: e.message, statusCode: e.statusCode, errors: (e as ValidationException).errors })
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to evaluate rules', statusCode: 500 })
  }
}

/**
 * Evaluate a condition DSL against a payload.
 * LAW-53: Deterministic (no random, no time-dependent, no side effects).
 *
 * Supported structures:
 *   { all: [...] } — AND all sub-conditions
 *   { any: [...] } — OR all sub-conditions
 *   { field, operator, value } — leaf condition
 *
 * Supported operators: >, <, >=, <=, ==, !=, in, notIn, contains, startsWith, endsWith
 */
function evaluateCondition(condition: any, payload: any): boolean {
  if (condition.all) {
    return condition.all.every((c: any) => evaluateCondition(c, payload))
  }
  if (condition.any) {
    return condition.any.some((c: any) => evaluateCondition(c, payload))
  }
  // Leaf condition
  const { field, operator, value } = condition
  const fieldValue = getNestedValue(payload, field)

  switch (operator) {
    case '>': return fieldValue > value
    case '<': return fieldValue < value
    case '>=': return fieldValue >= value
    case '<=': return fieldValue <= value
    case '==': return fieldValue === value
    case '!=': return fieldValue !== value
    case 'in': return Array.isArray(value) && value.includes(fieldValue)
    case 'notIn': return Array.isArray(value) && !value.includes(fieldValue)
    case 'contains': return typeof fieldValue === 'string' && fieldValue.includes(value)
    case 'startsWith': return typeof fieldValue === 'string' && fieldValue.startsWith(value)
    case 'endsWith': return typeof fieldValue === 'string' && fieldValue.endsWith(value)
    case 'exists': return fieldValue !== undefined && fieldValue !== null
    case 'notExists': return fieldValue === undefined || fieldValue === null
    default: throw new Error(`Unknown operator: ${operator}`)
  }
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}
