/**
 * Asset version manager with file locking (F-007-FIX).
 * Lock acquired before version decision, held during file operations (atomic rename).
 * Extends T-027 / design: hash check + version decision + atomic rename.
 */

import { mkdir, readFile, rename, stat } from "fs/promises";
import { dirname } from "path";
import { acquireLock, type VersionLockOptions } from "./version-lock.js";

/** Result of version decision: new asset id (e.g. A-014 or A-014-v2) and version number. */
export interface VersionDecision {
  /** Final asset id (base or base-vN). */
  newAssetId: string;
  /** Version number (1 = no suffix, 2+ = -vN). */
  version: number;
}

export interface VersionManagerOptions {
  /** Directory containing assets (e.g. evidence/assets). */
  assetsDir: string;
  /** Function to compute SHA-256 hash of file contents (T-028). */
  computeHash: (filePath: string) => Promise<string>;
  /** Lock options: stale, retries, metrics. */
  lock?: Omit<VersionLockOptions, "assetsDir">;
}

/**
 * Computes the version decision for an asset: if existing file has same hash, keep base id;
 * otherwise choose next version (A-014-v2, A-014-v3, ...).
 * Caller must hold the lock when calling this.
 */
export async function computeVersionDecision(
  assetId: string,
  newFilePath: string,
  options: VersionManagerOptions
): Promise<VersionDecision> {
  const baseId = assetId.replace(/-v\d+$/, "") || assetId;
  const ext = getExtension(newFilePath);
  const candidatePath = `${options.assetsDir.replace(/\/$/, "")}/${baseId}${ext}`;

  let existingHash: string | null = null;
  try {
    await stat(candidatePath);
    existingHash = await options.computeHash(candidatePath);
  } catch {
    // No existing file or unreadable → use base id, version 1
    return { newAssetId: baseId, version: 1 };
  }

  const newHash = await options.computeHash(newFilePath);
  if (existingHash === newHash) {
    return { newAssetId: baseId, version: 1 };
  }

  // Hashes differ: find next version slot (v2, v3, ...)
  let version = 2;
  for (;;) {
    const versionedPath = `${options.assetsDir.replace(/\/$/, "")}/${baseId}-v${version}${ext}`;
    try {
      await stat(versionedPath);
      const existingVersionHash = await options.computeHash(versionedPath);
      if (existingVersionHash === newHash) {
        return { newAssetId: `${baseId}-v${version}`, version };
      }
      version += 1;
    } catch {
      break;
    }
  }

  return { newAssetId: `${baseId}-v${version}`, version };
}

/**
 * Applies the version decision atomically: renames source to target path.
 * Caller must hold the lock. Uses fs.rename (atomic on same filesystem).
 */
export async function applyVersionAtomic(
  _assetId: string,
  sourcePath: string,
  decision: VersionDecision,
  options: VersionManagerOptions
): Promise<void> {
  const ext = getExtension(sourcePath);
  const targetPath = `${options.assetsDir.replace(/\/$/, "")}/${decision.newAssetId}${ext}`;
  await mkdirIfNeeded(dirname(targetPath));
  await rename(sourcePath, targetPath);
}

/**
 * Versions an asset under lock: acquire lock → compute decision → apply atomic rename → release lock.
 * Lock is always released in finally (even on error).
 *
 * @param assetId - Asset identifier (e.g. A-014)
 * @param newFilePath - Path to the new asset file (will be moved)
 * @param options - assetsDir, computeHash, lock options
 * @returns Version decision applied
 */
export async function versionAsset(
  assetId: string,
  newFilePath: string,
  options: VersionManagerOptions
): Promise<VersionDecision> {
  const lockOptions: VersionLockOptions = {
    assetsDir: options.assetsDir,
    ...options.lock,
  };
  const result = await acquireLock(assetId, lockOptions);
  const metrics = options.lock?.metrics;
  const log = metrics?.log;

  try {
    if (log) log("asset.version_locked", { assetId });
    const decision = await computeVersionDecision(assetId, newFilePath, options);
    await applyVersionAtomic(assetId, newFilePath, decision, options);
    return decision;
  } finally {
    await result.release();
  }
}

/** Stub hash for tests when T-028 not available: use file size + first bytes. */
export async function stubComputeHash(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  const len = buf.length;
  const head = buf.subarray(0, 32);
  return `stub-${len}-${Buffer.from(head).toString("hex").slice(0, 16)}`;
}

function getExtension(filePath: string): string {
  const i = filePath.lastIndexOf(".");
  return i >= 0 ? filePath.slice(i) : "";
}

async function mkdirIfNeeded(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}
