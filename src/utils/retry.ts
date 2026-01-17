/**
 * Retry utility with exponential backoff and jitter
 *
 * Provides a generic retry wrapper for async operations with configurable
 * retry attempts, exponential backoff, and jitter to prevent thundering herd.
 */

import { logger } from './logger.js';

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of attempts (including the first attempt) */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (caps the exponential backoff) */
  maxDelayMs: number;
  /** Optional callback to determine if an error should be retried */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Sleeps for the specified number of milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the backoff delay for a given attempt number
 *
 * Uses exponential backoff formula: baseDelayMs * 2^(attempt-1) + jitter
 * Jitter is random(0, 0.3 * exponentialDelay) to prevent thundering herd
 *
 * Note: The formula means:
 * - First retry (attempt=1): baseDelayMs * 2^0 = baseDelayMs (1x base)
 * - Second retry (attempt=2): baseDelayMs * 2^1 = baseDelayMs * 2 (2x base)
 * - Third retry (attempt=3): baseDelayMs * 2^2 = baseDelayMs * 4 (4x base)
 * This is standard exponential backoff where the first retry uses the base delay.
 *
 * @param attempt - Current attempt number (1-indexed)
 * @param options - Retry options
 * @returns Delay in milliseconds (capped at maxDelayMs)
 */
function calculateBackoff(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt - 1);
  // 30% jitter window to spread out retries and prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay;
  const totalDelay = exponentialDelay + jitter;
  return Math.min(totalDelay, options.maxDelayMs);
}

/**
 * Wraps an async function with retry logic using exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Promise resolving to the function's return value
 * @throws The last error encountered if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => apiCall(),
 *   { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error should be retried (default to true if not specified)
      const shouldRetry = options.shouldRetry?.(lastError) ?? true;
      if (!shouldRetry) {
        throw lastError;
      }

      // If this was the last attempt, throw the error
      if (attempt >= options.maxAttempts) {
        throw lastError;
      }

      // Calculate backoff delay and wait
      const delay = calculateBackoff(attempt, options);
      const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
      logger.warn(
        `Attempt ${attempt}/${options.maxAttempts} failed, retrying in ${Math.round(delay)}ms: ${errorMsg}`
      );
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}
