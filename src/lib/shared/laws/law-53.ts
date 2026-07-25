/**
 * LAW-53 — Rule Evaluation Must Be Deterministic
 *
 * Given the same input (context, event, payload, rule version),
 * the Rule Engine MUST always produce the same output.
 *
 * This means:
 *   - No random functions in conditions
 *   - No time-dependent logic (use the event timestamp from payload)
 *   - No external API calls during evaluation
 *   - No side effects during evaluation (only pure functions)
 *
 * Test: evaluate(input) === evaluate(input) for the same rule version
 */
export const LAW_53_DESCRIPTION = `
LAW-53: Rule Evaluation Must Be Deterministic

Same input + same rule version = same output. Always.
No randomness, no time-dependent logic, no side effects, no external calls.
Pure function: (input, rules) → (decision, actions)
`
