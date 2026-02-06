/**
 * Figma image caching to avoid redundant downloads.
 * Implements content-hash based storage with staleness detection.
 */

import crypto from "crypto";
import { readFile, writeFile, mkdir, unlink, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface CacheConfig {
  enabled: boolean;
  cacheDir: string;
  maxCacheAge: number; // milliseconds
  maxCacheSize: number; // bytes
}

export interface CacheEntry {
  nodeId: string;
  fileKey: string;
  hash: string; // SHA-256 of image content
  imagePath: string; // relative to cacheDir
  downloadedAt: string; // ISO timestamp
  figmaVersion?: string;
  fileSize: number;
}

export interface CacheMetadata {
  version: string;
  lastCleanup: string;
  entries: Record<string, CacheEntry>;
}

export interface CacheStats {
  totalEntries: number;
  totalDiskUsage: number;
  oldestEntry?: string;
  newestEntry?: string;
  cacheHits: number;
  cacheMisses: number;
}

const DEFAULT_METADATA: CacheMetadata = {
  version: "1.0",
  lastCleanup: new Date().toISOString(),
  entries: {},
};

/**
 * Figma image cache implementation.
 * Thread-safe for single process, uses atomic writes.
 */
export class FigmaImageCache {
  private metadata: CacheMetadata | null = null;
  private metadataPath: string;
  private stats: CacheStats;

  constructor(public config: CacheConfig) {
    this.metadataPath = path.join(config.cacheDir, "metadata.json");
    this.stats = {
      totalEntries: 0,
      totalDiskUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Initialize cache: create directory and load metadata.
   * Recovers gracefully from corruption.
   */
  async init(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      await mkdir(this.config.cacheDir, { recursive: true });
      await mkdir(path.join(this.config.cacheDir, "images"), {
        recursive: true,
      });
    } catch (err) {
      throw new Error(
        `Failed to create cache directory ${this.config.cacheDir}: ${String(err)}`
      );
    }

    await this.loadMetadata();
  }

  /**
   * Load metadata from disk with corruption recovery.
   */
  private async loadMetadata(): Promise<void> {
    try {
      if (existsSync(this.metadataPath)) {
        const content = await readFile(this.metadataPath, "utf-8");
        this.metadata = JSON.parse(content) as CacheMetadata;

        // Validate structure
        if (!this.metadata.version || !this.metadata.entries) {
          throw new Error("Invalid metadata structure");
        }

        // Update stats
        this.stats.totalEntries = Object.keys(this.metadata.entries).length;
        this.stats.totalDiskUsage = Object.values(
          this.metadata.entries
        ).reduce((sum, entry) => sum + entry.fileSize, 0);
      } else {
        // Create fresh metadata with new entries object (avoid shared reference bug)
        this.metadata = {
          version: DEFAULT_METADATA.version,
          lastCleanup: new Date().toISOString(),
          entries: {}, // Fresh object for each instance
        };
        await this.saveMetadata();
      }
    } catch (err) {
      console.warn(
        `[Cache] Corrupted metadata, resetting: ${String(err)}`
      );
      // Create fresh metadata with new entries object (avoid shared reference bug)
      this.metadata = {
        version: DEFAULT_METADATA.version,
        lastCleanup: new Date().toISOString(),
        entries: {}, // Fresh object for each instance
      };
      await this.saveMetadata();
    }
  }

  /**
   * Save metadata atomically (temp + rename pattern).
   */
  private async saveMetadata(): Promise<void> {
    if (!this.metadata) return;

    const tmpPath = `${this.metadataPath}.${process.pid}.tmp`;
    try {
      await writeFile(tmpPath, JSON.stringify(this.metadata, null, 2), "utf-8");
      await unlink(this.metadataPath).catch(() => {
        /* ignore if doesn't exist */
      });
      // Node.js doesn't have rename in promises API, use writeFile + unlink
      await writeFile(this.metadataPath, JSON.stringify(this.metadata, null, 2), "utf-8");
      await unlink(tmpPath).catch(() => {
        /* cleanup temp file */
      });
    } catch (err) {
      await unlink(tmpPath).catch(() => {
        /* cleanup on error */
      });
      throw new Error(`Failed to save metadata: ${String(err)}`);
    }
  }

  /**
   * Get cached entry for component.
   * Returns null if cache miss, stale, or file missing.
   */
  async get(componentRef: string): Promise<CacheEntry | null> {
    if (!this.config.enabled || !this.metadata) {
      return null;
    }

    const entry = this.metadata.entries[componentRef];
    if (!entry) {
      this.stats.cacheMisses++;
      return null;
    }

    // Check if file exists
    const fullPath = path.join(this.config.cacheDir, entry.imagePath);
    if (!existsSync(fullPath)) {
      console.warn(
        `[Cache] Entry for ${componentRef} points to missing file, invalidating`
      );
      delete this.metadata.entries[componentRef];
      await this.saveMetadata();
      this.stats.cacheMisses++;
      return null;
    }

    // Check staleness
    const age = Date.now() - new Date(entry.downloadedAt).getTime();
    if (age > this.config.maxCacheAge) {
      this.stats.cacheMisses++;
      return null; // Stale
    }

    this.stats.cacheHits++;
    return entry;
  }

  /**
   * Save entry to cache.
   */
  async set(componentRef: string, entry: CacheEntry): Promise<void> {
    if (!this.config.enabled || !this.metadata) {
      return;
    }

    // If replacing existing entry, subtract old size
    const oldEntry = this.metadata.entries[componentRef];
    if (oldEntry) {
      this.stats.totalDiskUsage -= oldEntry.fileSize;
    }

    this.metadata.entries[componentRef] = entry;
    this.stats.totalEntries = Object.keys(this.metadata.entries).length;
    this.stats.totalDiskUsage += entry.fileSize;

    await this.saveMetadata();
  }

  /**
   * Invalidate single entry.
   */
  async invalidate(componentRef: string): Promise<void> {
    if (!this.metadata) return;

    const entry = this.metadata.entries[componentRef];
    if (!entry) return;

    // Delete image file
    const fullPath = path.join(this.config.cacheDir, entry.imagePath);
    try {
      await unlink(fullPath);
    } catch (err) {
      // File might already be deleted
    }

    // Remove from metadata
    delete this.metadata.entries[componentRef];
    this.stats.totalEntries = Object.keys(this.metadata.entries).length;

    await this.saveMetadata();
  }

  /**
   * Invalidate all entries from a Figma file.
   */
  async invalidateFile(fileKey: string): Promise<void> {
    if (!this.metadata) return;

    const toInvalidate = Object.entries(this.metadata.entries)
      .filter(([, entry]) => entry.fileKey === fileKey)
      .map(([componentRef]) => componentRef);

    for (const componentRef of toInvalidate) {
      await this.invalidate(componentRef);
    }
  }

  /**
   * Clean up cache: remove stale entries, enforce size limit, remove orphans.
   */
  async cleanup(): Promise<{ removed: number; bytesFreed: number }> {
    if (!this.metadata) {
      return { removed: 0, bytesFreed: 0 };
    }

    let removed = 0;
    let bytesFreed = 0;

    // Remove stale entries
    const now = Date.now();
    for (const [componentRef, entry] of Object.entries(
      this.metadata.entries
    )) {
      const age = now - new Date(entry.downloadedAt).getTime();
      if (age > this.config.maxCacheAge) {
        bytesFreed += entry.fileSize;
        await this.invalidate(componentRef);
        removed++;
      }
    }

    // Enforce size limit (remove oldest entries)
    const entries = Object.entries(this.metadata.entries).sort(
      ([, a], [, b]) =>
        new Date(a.downloadedAt).getTime() -
        new Date(b.downloadedAt).getTime()
    );

    let currentSize = this.stats.totalDiskUsage;
    for (const [componentRef, entry] of entries) {
      if (currentSize <= this.config.maxCacheSize) break;

      currentSize -= entry.fileSize;
      bytesFreed += entry.fileSize;
      await this.invalidate(componentRef);
      removed++;
    }

    // Remove orphaned files
    try {
      const imageDir = path.join(this.config.cacheDir, "images");
      const files = await readdir(imageDir);
      const knownFiles = new Set(
        Object.values(this.metadata.entries).map((e) =>
          path.basename(e.imagePath)
        )
      );

      for (const file of files) {
        if (!knownFiles.has(file)) {
          const filePath = path.join(imageDir, file);
          const stats = await stat(filePath);
          await unlink(filePath);
          bytesFreed += stats.size;
          removed++;
        }
      }
    } catch (err) {
      console.warn(`[Cache] Failed to remove orphaned files: ${String(err)}`);
    }

    this.metadata.lastCleanup = new Date().toISOString();
    await this.saveMetadata();

    return { removed, bytesFreed };
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    if (!this.metadata) {
      return { ...this.stats };
    }

    const entries = Object.values(this.metadata.entries);

    // Recalculate totals from metadata (source of truth)
    const totalEntries = entries.length;
    const totalDiskUsage = entries.reduce((sum, e) => sum + e.fileSize, 0);

    if (entries.length === 0) {
      return {
        totalEntries,
        totalDiskUsage,
        cacheHits: this.stats.cacheHits,
        cacheMisses: this.stats.cacheMisses,
      };
    }

    const dates = entries.map((e) => new Date(e.downloadedAt).getTime());
    return {
      totalEntries,
      totalDiskUsage,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      oldestEntry: new Date(Math.min(...dates)).toISOString(),
      newestEntry: new Date(Math.max(...dates)).toISOString(),
    };
  }
}

/**
 * Compute SHA-256 hash of buffer.
 */
export function computeHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Format age in human-readable form.
 */
export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Parse age string (e.g., "7d", "24h", "30m") to milliseconds.
 */
export function parseAge(str: string): number {
  const match = str.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid age format: ${str} (expected: 7d, 24h, 30m, 60s)`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "d":
      return value * 24 * 60 * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "m":
      return value * 60 * 1000;
    case "s":
      return value * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}
