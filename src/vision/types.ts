/**
 * Types for vision API resilience (F-004-FIX).
 * Consumed by T-010 Vision Batcher.
 */

/** Single component extraction result for checkpoint partial results. */
export interface ComponentMention {
  componentId: string;
  assetId?: string;
  name?: string;
  /** Pass that produced this result (e.g. Pass0A, Pass0B). */
  pass?: string;
  [key: string]: unknown;
}

/** Checkpoint for partial batch recovery after timeout. */
export interface BatchCheckpoint {
  batchId: string;
  /** Component IDs successfully extracted before timeout. */
  completedComponents: string[];
  /** Component IDs still pending. */
  remainingComponents: string[];
  /** Partial extraction results (component-by-component). */
  partialResults: ComponentMention[];
  /** ISO 8601 timestamp. */
  timestamp: string;
}
