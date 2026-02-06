/**
 * Vision API resilience (F-004-FIX): adaptive timeout, checkpointing, circuit breaker.
 * Consumed by T-010 Vision Batcher.
 */

export {
  ADAPTIVE_TIMEOUTS_MS,
  BACKOFF_DELAYS_MS,
  MAX_RETRIES,
  executeWithAdaptiveTimeout,
  isTimeoutError,
  sleep,
} from "./adaptive-timeout.js";
export type { AdaptiveTimeoutOptions } from "./adaptive-timeout.js";

export {
  createVisionCircuitBreaker,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_OPEN_MESSAGE,
} from "./circuit-breaker.js";
export type { CircuitBreakerOptions, VisionCircuitBreaker } from "./circuit-breaker.js";

export {
  deleteCheckpoint,
  getCheckpointDir,
  getCheckpointPath,
  readCheckpoint,
  writeCheckpoint,
} from "./checkpoint.js";

export {
  createInMemoryVisionMetrics,
} from "./metrics.js";
export type {
  VisionCircuitOpenAlert,
  VisionPartialRecoveryCounter,
  VisionTimeoutCounter,
} from "./metrics.js";

export type { BatchCheckpoint, ComponentMention } from "./types.js";
