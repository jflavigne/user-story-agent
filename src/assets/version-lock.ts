/**
 * OS-level file locking for asset versioning (F-007-FIX).
 * Uses proper-lockfile: exclusive lock before version decision, held during file ops.
 * Stale lock detection (60s), retry strategy (30 attempts, 1s intervals).
 */

import { mkdir, stat } from "fs/promises";
import { dirname } from "path";
import type { AssetLockMetricsOptions } from "./asset-metrics.js";

/** Default stale lock threshold (ms). */
export const LOCK_STALE_MS = 60_000;

/** Default retries: 30 attempts, 1s min interval. */
export const LOCK_RETRIES = { retries: 30, minTimeout: 1000 };

/** User-facing message when lock is held by another process. */
export const CONCURRENT_RUN_MESSAGE = `⚠️  Another pipeline run in progress

Lock file detected. Another process is versioning assets.

Options:
1. Wait for other run to complete (recommended)
2. Cancel this run
3. Force (breaks lock - use only if other run crashed)

Your choice? [1/2/3]`;

export interface VersionLockOptions {
  /** Stale lock threshold in ms (default 60_000). */
  stale?: number;
  /** Retry config: { retries, minTimeout } (default 30, 1000). */
  retries?: { retries: number; minTimeout: number };
  /** Assets directory (e.g. evidence/assets). Lock files live here. */
  assetsDir: string;
  /** Optional metrics and logging. */
  metrics?: AssetLockMetricsOptions;
}

export interface AcquireLockResult {
  /** Call this to release the lock (must be called in finally). */
  release: () => Promise<void>;
}

const normalizedAssetsDir = (d: string): string => d.replace(/\/$/, "");

/**
 * Resolves the path to lock for an asset. proper-lockfile creates {path}.lock.
 * So we use evidence/assets/{assetId} and the lock file becomes {assetId}.lock.
 */
export function getLockPath(assetsDir: string, assetId: string): string {
  return `${normalizedAssetsDir(assetsDir)}/${assetId}`;
}

/** Path of the actual lock file on disk (getLockPath + '.lock'). */
export function getLockFilePath(assetsDir: string, assetId: string): string {
  return `${getLockPath(assetsDir, assetId)}.lock`;
}

/**
 * Acquires an exclusive lock for the given asset.
 * Waits up to retries * minTimeout ms; treats lock as stale after stale ms.
 * On success: records lock_waits{result=success}, optional duration.
 * On timeout: records lock_waits{result=timeout}, lock_timeouts, logs WARN.
 *
 * @param assetId - Asset identifier (e.g. A-014)
 * @param options - assetsDir, stale, retries, metrics
 * @returns { release } - Call release() in finally to free the lock
 * @throws Error with message suitable for user when lock timeout
 */
export async function acquireLock(
  assetId: string,
  options: VersionLockOptions
): Promise<AcquireLockResult> {
  const stale = options.stale ?? LOCK_STALE_MS;
  const retries = options.retries ?? LOCK_RETRIES;
  const lockPath = getLockPath(options.assetsDir, assetId);
  const metrics = options.metrics;
  const log = metrics?.log;

  await mkdir(dirname(lockPath), { recursive: true });

  // Create dummy lock resource file if it doesn't exist (proper-lockfile requires resource to exist)
  const { writeFile } = await import("fs/promises");
  try {
    await stat(lockPath);
  } catch {
    await writeFile(lockPath, "", "utf-8");
  }

  const start = Date.now();
  let releaseFn: (() => Promise<void>) | undefined;

  try {
    const lockfile = await import("proper-lockfile");
    const lock = typeof lockfile.default?.lock === "function" ? lockfile.default : lockfile;
    releaseFn = await lock.lock(lockPath, { stale, retries });
    const waitMs = Date.now() - start;
    if (log) log("asset.lock_acquired", { assetId, wait_time_ms: waitMs });
    if (metrics?.lockWaits) metrics.lockWaits.increment({ result: "success" });
    if (metrics?.lockDuration) metrics.lockDuration.observe(waitMs / 1000);

    return {
      async release(): Promise<void> {
        if (releaseFn) {
          try {
            await releaseFn();
          } catch (err) {
            if (log) log("asset.lock_release_error", { assetId, error: String(err) });
          }
          releaseFn = undefined;
        }
      },
    };
  } catch (err) {
    const waitMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);

    // Check if this is actually a timeout (retries exhausted) vs other errors (EACCES, ENOSPC, etc.)
    const isTimeout = message.toLowerCase().includes("lock") &&
                      (message.includes("retries") || message.includes("timeout") || message.includes("held"));

    if (isTimeout) {
      if (metrics?.lockWaits) metrics.lockWaits.increment({ result: "timeout" });
      if (metrics?.lockTimeouts) metrics.lockTimeouts.increment();
      if (log) log("asset.lock_timeout", { assetId, wait_ms: waitMs });
      throw new Error(
        `Asset version lock timeout for ${assetId} after ${waitMs}ms. ${message}. ${CONCURRENT_RUN_MESSAGE}`
      );
    } else {
      // Other lock acquisition errors (permissions, disk space, etc.)
      if (metrics?.lockWaits) metrics.lockWaits.increment({ result: "error" });
      if (log) log("asset.lock_error", { assetId, error: message, wait_ms: waitMs });
      throw new Error(`Asset version lock failed for ${assetId}: ${message}`);
    }
  }
}

/**
 * Checks if a lock file exists and is not stale (modified within stale ms).
 * Used for concurrent run detection on startup.
 *
 * @param assetsDir - Assets directory
 * @param assetId - Asset identifier
 * @param staleMs - Consider lock stale if mtime older than this (default LOCK_STALE_MS)
 * @returns true if lock file exists and is not stale
 */
export async function isLockHeld(
  assetsDir: string,
  assetId: string,
  staleMs: number = LOCK_STALE_MS
): Promise<boolean> {
  const lockFilePath = getLockFilePath(assetsDir, assetId);
  try {
    const st = await stat(lockFilePath);
    // Use Math.max to avoid negative age due to timestamp precision differences
    const ageMs = Math.max(0, Date.now() - st.mtimeMs);
    return ageMs < staleMs;
  } catch {
    return false;
  }
}
