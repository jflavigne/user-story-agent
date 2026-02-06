/**
 * Partial batch checkpointing for vision API (F-004-FIX).
 * Persists to evidence/.checkpoints/batch-{id}.json with atomic write.
 * Consumed by T-010 Vision Batcher.
 */

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import type { BatchCheckpoint } from "./types.js";

const CHECKPOINTS_DIR = ".checkpoints";

/**
 * Resolves the checkpoint directory: {evidenceDir}/.checkpoints.
 */
export function getCheckpointDir(evidenceDir: string): string {
  return join(evidenceDir, CHECKPOINTS_DIR);
}

/**
 * Resolves the checkpoint file path for a batch (without creating it).
 */
export function getCheckpointPath(evidenceDir: string, batchId: string): string {
  const safeId = batchId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return join(getCheckpointDir(evidenceDir), `batch-${safeId}.json`);
}

/**
 * Writes checkpoint atomically (tmp file + rename).
 */
export function writeCheckpoint(
  evidenceDir: string,
  checkpoint: BatchCheckpoint
): void {
  const dir = getCheckpointDir(evidenceDir);
  mkdirSync(dir, { recursive: true });
  const path = getCheckpointPath(evidenceDir, checkpoint.batchId);
  const tmpPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(checkpoint, null, 0), "utf-8");
  renameSync(tmpPath, path);
}

/**
 * Reads checkpoint from disk. Returns null if not found or invalid.
 */
export function readCheckpoint(
  evidenceDir: string,
  batchId: string
): BatchCheckpoint | null {
  const path = getCheckpointPath(evidenceDir, batchId);
  try {
    const raw = readFileSync(path, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (
      data &&
      typeof data === "object" &&
      "batchId" in data &&
      "completedComponents" in data &&
      "remainingComponents" in data &&
      "partialResults" in data &&
      "timestamp" in data &&
      Array.isArray((data as BatchCheckpoint).completedComponents) &&
      Array.isArray((data as BatchCheckpoint).remainingComponents) &&
      Array.isArray((data as BatchCheckpoint).partialResults)
    ) {
      return data as BatchCheckpoint;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deletes checkpoint file. No-op if file does not exist.
 */
export function deleteCheckpoint(evidenceDir: string, batchId: string): void {
  const path = getCheckpointPath(evidenceDir, batchId);
  try {
    rmSync(path, { force: true });
  } catch {
    // Ignore ENOENT and permission errors
  }
}
