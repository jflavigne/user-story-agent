/**
 * Adaptive timeout escalation for vision API (F-004-FIX).
 * Attempt 1: 120s, Retry 1: 180s, Retry 2: 240s.
 * Consumed by T-010 Vision Batcher.
 */

/** Timeouts in ms: [attempt0, attempt1, attempt2]. */
export const ADAPTIVE_TIMEOUTS_MS: readonly number[] = [120_000, 180_000, 240_000];

/** Backoff delays in ms between retries (5s, 10s). */
export const BACKOFF_DELAYS_MS: readonly number[] = [5_000, 10_000];

/** Max retries after initial attempt (2 retries = 3 total attempts). */
export const MAX_RETRIES = 2;

export interface AdaptiveTimeoutOptions {
  /** Optional logger: (event, payload) => void. */
  log?: (event: string, payload: Record<string, unknown>) => void;
  /** Optional metrics: increment counter. */
  incrementTimeout?: (labels: { batch_id: string; attempt: number }) => void;
}

/**
 * Returns true if the error is a timeout (code === 'TIMEOUT' or name/message indicates timeout).
 */
export function isTimeoutError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const e = error as { code?: string; name?: string; message?: string };
    if (e.code === "TIMEOUT") return true;
    if (e.name === "AbortError" || e.name === "TimeoutError") return true;
    if (typeof e.message === "string" && /timeout|timed out/i.test(e.message)) return true;
  }
  return false;
}

/**
 * Sleep for the given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an async operation with adaptive timeout and retries.
 * - Attempt 0: timeout 120s; on TIMEOUT, wait 5s and retry.
 * - Attempt 1: timeout 180s; on TIMEOUT, wait 10s and retry.
 * - Attempt 2: timeout 240s; on TIMEOUT, throw.
 *
 * @param fn - Function that receives current timeout (ms) and returns a promise. Must support AbortSignal if timeout is enforced by caller.
 * @param options - batchId for logging/metrics, and optional log/incrementTimeout
 * @returns Result of fn
 */
export async function executeWithAdaptiveTimeout<T>(
  fn: (timeoutMs: number, attempt: number) => Promise<T>,
  options: {
    batchId: string;
    log?: (event: string, payload: Record<string, unknown>) => void;
    incrementTimeout?: (labels: { batch_id: string; attempt: number }) => void;
  }
): Promise<T> {
  const { batchId, log, incrementTimeout } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const timeoutMs = ADAPTIVE_TIMEOUTS_MS[Math.min(attempt, ADAPTIVE_TIMEOUTS_MS.length - 1)]!;
    try {
      return await fn(timeoutMs, attempt);
    } catch (error) {
      lastError = error;
      if (incrementTimeout) incrementTimeout({ batch_id: batchId, attempt });
      if (log) log("vision.batch_timeout", { batchId, attempt, error: String(error), timeoutMs });
      if (!isTimeoutError(error) || attempt === MAX_RETRIES) throw error;
      const backoffMs = BACKOFF_DELAYS_MS[Math.min(attempt, BACKOFF_DELAYS_MS.length - 1)] ?? 5_000;
      if (log) log("vision.retry", { batchId, attempt, backoffMs });
      await sleep(backoffMs);
    }
  }
  throw lastError;
}
