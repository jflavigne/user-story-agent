/**
 * Metrics for asset version locking (F-007-FIX).
 * Tracks lock waits, timeouts, and duration for observability.
 */

/** Counter: asset_version_lock_waits_total{result=success|timeout|error} */
export interface AssetLockWaitsCounter {
  increment(labels: { result: "success" | "timeout" | "error" }): void;
}

/** Counter: asset_version_lock_timeouts_total */
export interface AssetLockTimeoutsCounter {
  increment(): void;
}

/** Histogram: asset_version_lock_duration_seconds (optional) */
export interface AssetLockDurationHistogram {
  observe(seconds: number): void;
}

/** Optional logger for lock events (DEBUG/WARN). */
export interface AssetLockMetricsOptions {
  lockWaits?: AssetLockWaitsCounter;
  lockTimeouts?: AssetLockTimeoutsCounter;
  lockDuration?: AssetLockDurationHistogram;
  log?: (event: string, payload: Record<string, unknown>) => void;
}

/** In-memory implementation for tests and default use. */
export function createInMemoryAssetMetrics(): {
  lockWaits: AssetLockWaitsCounter & {
    getTotal(): number;
    getCounts(): Map<string, number>;
  };
  lockTimeouts: AssetLockTimeoutsCounter & { getTotal(): number };
  lockDuration: AssetLockDurationHistogram & { getObservations(): number[] };
} {
  const waitCounts = new Map<string, number>();
  let timeoutsTotal = 0;
  const durationObservations: number[] = [];

  return {
    lockWaits: {
      increment(labels: { result: "success" | "timeout" | "error" }): void {
        const key = labels.result;
        waitCounts.set(key, (waitCounts.get(key) ?? 0) + 1);
      },
      getTotal(): number {
        return [...waitCounts.values()].reduce((a, b) => a + b, 0);
      },
      getCounts(): Map<string, number> {
        return new Map(waitCounts);
      },
    },
    lockTimeouts: {
      increment(): void {
        timeoutsTotal += 1;
      },
      getTotal(): number {
        return timeoutsTotal;
      },
    },
    lockDuration: {
      observe(seconds: number): void {
        durationObservations.push(seconds);
      },
      getObservations(): number[] {
        return [...durationObservations];
      },
    },
  };
}
