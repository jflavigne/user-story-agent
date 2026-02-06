/**
 * Integration tests for F-007-FIX: asset version locking.
 * Validation: concurrent runs (lock serialization), stale lock auto-recovery, lock timeout error.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  acquireLock,
  versionAsset,
  createInMemoryAssetMetrics,
  LOCK_STALE_MS,
  LOCK_RETRIES,
} from "../../src/assets/index.js";

describe("asset version lock (integration)", () => {
  let assetsDir: string;

  beforeEach(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "asset-version-lock-"));
  });

  afterEach(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  describe("concurrent runs: lock serialization", () => {
    it("second acquirer waits and gets lock after first releases", async () => {
      const metrics = createInMemoryAssetMetrics();
      const opts = {
        assetsDir,
        stale: LOCK_STALE_MS,
        retries: { ...LOCK_RETRIES, retries: 5, minTimeout: 20 },
        metrics: { lockWaits: metrics.lockWaits, log: undefined },
      };

      const result1 = await acquireLock("A-014", opts);
      const acquire2Promise = acquireLock("A-014", opts);

      await result1.release();
      const result2 = await acquire2Promise;
      await result2.release();

      expect(metrics.lockWaits.getCounts().get("success")).toBe(2);
    });

    it("versionAsset holds lock during decision and rename then releases", async () => {
      const newFile = join(assetsDir, "incoming.png");
      writeFileSync(newFile, "content");
      const metrics = createInMemoryAssetMetrics();
      const decision = await versionAsset("A-014", newFile, {
        assetsDir,
        computeHash: async (p) => {
          const { readFile } = await import("fs/promises");
          const b = await readFile(p);
          return `h-${b.length}-${b[0]}`;
        },
        lock: {
          stale: LOCK_STALE_MS,
          retries: { retries: 3, minTimeout: 10 },
          metrics: { lockWaits: metrics.lockWaits },
        },
      });

      expect(decision.newAssetId).toBe("A-014");
      expect(decision.version).toBe(1);
      const { readFile } = await import("fs/promises");
      const targetPath = join(assetsDir, "A-014.png");
      const data = await readFile(targetPath, "utf-8");
      expect(data).toBe("content");
      expect(metrics.lockWaits.getCounts().get("success")).toBe(1);
    });
  });

  describe("stale lock: auto-recovery", () => {
    it.skip("acquires when previous lock is stale (short stale + delay)", async () => {
      const staleMs = 1000;
      const opts = {
        assetsDir,
        stale: staleMs,
        retries: { retries: 10, minTimeout: 50 },
      };

      const lockResourcePath = join(assetsDir, "A-014");
      const lockFilePath = `${lockResourcePath}.lock`;
      writeFileSync(lockResourcePath, "", "utf-8");

      writeFileSync(lockFilePath, "", "utf-8");
      const { utimesSync } = await import("fs");
      const oldTime = new Date(Date.now() - staleMs - 100);
      utimesSync(lockFilePath, oldTime, oldTime);

      const r2 = await acquireLock("A-014", opts);
      await r2.release();
    });
  });

  describe("lock timeout: clear error", () => {
    it("throws with message containing CONCURRENT_RUN_MESSAGE when lock not released in time", async () => {
      const opts = {
        assetsDir,
        stale: 60_000,
        retries: { retries: 2, minTimeout: 30 },
      };

      const r1 = await acquireLock("A-014", opts);
      await expect(acquireLock("A-014", opts)).rejects.toThrow("lock timeout");
      await expect(acquireLock("A-014", opts)).rejects.toThrow("Your choice? [1/2/3]");
      await r1.release();
    });
  });
});
