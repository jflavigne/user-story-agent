/**
 * Asset versioning with file locking (F-007-FIX).
 * Lock before version decision, atomic rename, stale lock detection.
 */

export {
  createInMemoryAssetMetrics,
} from "./asset-metrics.js";
export type {
  AssetLockDurationHistogram,
  AssetLockMetricsOptions,
  AssetLockTimeoutsCounter,
  AssetLockWaitsCounter,
} from "./asset-metrics.js";

export {
  acquireLock,
  CONCURRENT_RUN_MESSAGE,
  getLockFilePath,
  getLockPath,
  isLockHeld,
  LOCK_RETRIES,
  LOCK_STALE_MS,
} from "./version-lock.js";
export type { AcquireLockResult, VersionLockOptions } from "./version-lock.js";

export {
  applyVersionAtomic,
  computeVersionDecision,
  versionAsset,
  stubComputeHash,
} from "./version-manager.js";
export type {
  VersionDecision,
  VersionManagerOptions,
} from "./version-manager.js";
