/**
 * Observability for vision API resilience (F-004-FIX).
 * In-memory counters and alert callback; T-010 can replace with real metrics.
 */

/** Counter: vision_api_timeouts_total{batch_id, attempt} */
export interface VisionTimeoutCounter {
  increment(labels: { batch_id: string; attempt: number }): void;
}

/** Counter: vision_api_partial_recoveries_total */
export interface VisionPartialRecoveryCounter {
  increment(): void;
}

/** Alert: VisionAPICircuitOpen (Critical) when circuit breaker opens. */
export interface VisionCircuitOpenAlert {
  fire(): void;
}

/** In-memory implementation for tests and default use. */
export function createInMemoryVisionMetrics(): {
  timeouts: VisionTimeoutCounter & { getTotal(): number; getCounts(): Map<string, number> };
  partialRecoveries: VisionPartialRecoveryCounter & { getTotal(): number };
  circuitOpenAlert: VisionCircuitOpenAlert & { getFired(): boolean };
} {
  const timeoutCounts = new Map<string, number>();
  let partialRecoveriesTotal = 0;
  let circuitOpenFired = false;

  return {
    timeouts: {
      increment(labels: { batch_id: string; attempt: number }): void {
        const key = `${labels.batch_id}:${labels.attempt}`;
        timeoutCounts.set(key, (timeoutCounts.get(key) ?? 0) + 1);
      },
      getTotal(): number {
        return [...timeoutCounts.values()].reduce((a, b) => a + b, 0);
      },
      getCounts(): Map<string, number> {
        return new Map(timeoutCounts);
      },
    },
    partialRecoveries: {
      increment(): void {
        partialRecoveriesTotal += 1;
      },
      getTotal(): number {
        return partialRecoveriesTotal;
      },
    },
    circuitOpenAlert: {
      fire(): void {
        circuitOpenFired = true;
      },
      getFired(): boolean {
        return circuitOpenFired;
      },
    },
  };
}
