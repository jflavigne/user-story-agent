/**
 * Circuit breaker for vision API (F-004-FIX).
 * After 3 consecutive batch timeouts, opens circuit and exposes user message.
 * Consumed by T-010 Vision Batcher; CLI handles user choice (Wait/Cancel).
 */

/** Default threshold: open circuit after this many consecutive timeouts. */
export const CIRCUIT_BREAKER_THRESHOLD = 3;

/** User-facing message when circuit is open (from ticket). */
export const CIRCUIT_OPEN_MESSAGE = `⚠️  Vision API experiencing delays

3 consecutive batches timed out. This usually means:
- Claude API under heavy load
- Your network experiencing latency
- Image batch too complex for current timeout

Options:
1. Wait 5 minutes and retry (recommended)
2. Reduce batch size (--max-batch-size 10)
3. Cancel pipeline

Your choice? [1/2/3]`;

export interface CircuitBreakerOptions {
  /** Consecutive timeouts before opening (default 3). */
  threshold?: number;
  /** Optional logger: (event, payload) => void. */
  log?: (event: string, payload: Record<string, unknown>) => void;
  /** Optional alert callback when circuit opens (e.g. emit VisionAPICircuitOpen). */
  onCircuitOpen?: () => void;
}

export interface VisionCircuitBreaker {
  /** Record a successful batch (resets consecutive timeouts). */
  recordSuccess(): void;
  /** Record a batch timeout (increments counter; opens circuit at threshold). */
  recordTimeout(): void;
  /** Returns true if circuit is open (pipeline should pause). */
  isOpen(): boolean;
  /** Returns the user-facing message when circuit is open. */
  getMessage(): string;
  /** Reset circuit state (e.g. after user chooses Wait). */
  reset(): void;
}

/**
 * Creates a circuit breaker for vision API timeouts.
 */
export function createVisionCircuitBreaker(
  options: CircuitBreakerOptions = {}
): VisionCircuitBreaker {
  const threshold = options.threshold ?? CIRCUIT_BREAKER_THRESHOLD;
  const log = options.log;
  const onCircuitOpen = options.onCircuitOpen;

  let consecutiveTimeouts = 0;
  let circuitOpen = false;

  return {
    recordSuccess(): void {
      consecutiveTimeouts = 0;
    },

    recordTimeout(): void {
      consecutiveTimeouts += 1;
      if (consecutiveTimeouts >= threshold) {
        circuitOpen = true;
        if (log) log("vision.circuit_opened", { consecutiveTimeouts, threshold });
        if (onCircuitOpen) onCircuitOpen();
      }
    },

    isOpen(): boolean {
      return circuitOpen;
    },

    getMessage(): string {
      return CIRCUIT_OPEN_MESSAGE;
    },

    reset(): void {
      consecutiveTimeouts = 0;
      circuitOpen = false;
    },
  };
}
