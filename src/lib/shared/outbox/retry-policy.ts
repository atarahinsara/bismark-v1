/**
 * Retry Policy — exponential backoff for Outbox message delivery.
 *
 * LAW-08: After max retries, message moves to Dead Letter Queue.
 */

export interface RetryDecision {
  shouldRetry: boolean
  delaySeconds: number
  nextAttempt: number
}

const MAX_ATTEMPTS = 8
const BASE_DELAY = 2 // seconds
const MAX_DELAY = 3600 // 1 hour

export class RetryPolicy {
  /**
   * Calculate the retry delay for a given attempt number.
   * Exponential backoff: 2^attempt seconds, capped at MAX_DELAY.
   */
  static calculateDelay(attempt: number): number {
    const delay = Math.pow(BASE_DELAY, attempt)
    return Math.min(delay, MAX_DELAY)
  }

  /**
   * Decide whether to retry or move to dead letter queue.
   */
  static decide(currentAttempts: number): RetryDecision {
    if (currentAttempts >= MAX_ATTEMPTS) {
      return {
        shouldRetry: false,
        delaySeconds: 0,
        nextAttempt: currentAttempts,
      }
    }

    const nextAttempt = currentAttempts + 1
    return {
      shouldRetry: true,
      delaySeconds: this.calculateDelay(nextAttempt),
      nextAttempt,
    }
  }

  static get maxAttempts(): number {
    return MAX_ATTEMPTS
  }
}
