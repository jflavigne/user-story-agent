/**
 * Unit tests for version lock (F-007-FIX).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getLockPath,
  getLockFilePath,
  isLockHeld,
  LOCK_STALE_MS,
  CONCURRENT_RUN_MESSAGE,
} from "./version-lock.js";

describe("version-lock", () => {
  let assetsDir: string;

  beforeEach(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "version-lock-"));
  });

  afterEach(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  describe("getLockPath", () => {
    it("returns assetsDir/assetId (no .lock)", () => {
      expect(getLockPath("/evidence/assets", "A-014")).toBe("/evidence/assets/A-014");
      expect(getLockPath("/evidence/assets/", "A-014")).toBe("/evidence/assets/A-014");
    });
  });

  describe("getLockFilePath", () => {
    it("returns assetsDir/assetId.lock", () => {
      expect(getLockFilePath("/evidence/assets", "A-014")).toBe("/evidence/assets/A-014.lock");
    });
  });

  describe("isLockHeld", () => {
    it("returns false when lock file does not exist", async () => {
      const held = await isLockHeld(assetsDir, "A-014");
      expect(held).toBe(false);
    });

    it("returns true when lock file exists and is recent", async () => {
      const lockPath = getLockFilePath(assetsDir, "A-014");
      writeFileSync(lockPath, "");
      const held = await isLockHeld(assetsDir, "A-014", LOCK_STALE_MS);
      expect(held).toBe(true);
    });

    it("returns false when lock file is older than stale threshold", async () => {
      const lockPath = getLockFilePath(assetsDir, "A-014");
      writeFileSync(lockPath, "");
      const held = await isLockHeld(assetsDir, "A-014", 0);
      expect(held).toBe(false);
    });
  });

  describe("CONCURRENT_RUN_MESSAGE", () => {
    it("includes options 1/2/3", () => {
      expect(CONCURRENT_RUN_MESSAGE).toContain("Your choice? [1/2/3]");
      expect(CONCURRENT_RUN_MESSAGE).toContain("Another pipeline run");
    });
  });
});
