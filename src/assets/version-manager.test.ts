/**
 * Unit tests for version manager (F-007-FIX).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  computeVersionDecision,
  applyVersionAtomic,
  stubComputeHash,
  type VersionDecision,
  type VersionManagerOptions,
} from "./version-manager.js";

describe("version-manager", () => {
  let assetsDir: string;
  let options: VersionManagerOptions;

  beforeEach(() => {
    assetsDir = mkdtempSync(join(tmpdir(), "version-manager-"));
    options = { assetsDir, computeHash: stubComputeHash };
  });

  afterEach(() => {
    rmSync(assetsDir, { recursive: true, force: true });
  });

  describe("stubComputeHash", () => {
    it("returns deterministic hash from file content", async () => {
      const f = join(assetsDir, "f.dat");
      writeFileSync(f, "hello");
      const h1 = await stubComputeHash(f);
      const h2 = await stubComputeHash(f);
      expect(h1).toBe(h2);
      expect(h1).toMatch(/^stub-\d+-[a-f0-9]+$/);
    });
  });

  describe("computeVersionDecision", () => {
    it("returns version 1 when no existing file", async () => {
      const newFile = join(assetsDir, "new.png");
      writeFileSync(newFile, "x");
      const decision = await computeVersionDecision("A-014", newFile, options);
      expect(decision).toEqual({ newAssetId: "A-014", version: 1 });
    });

    it("returns version 1 when existing file has same hash", async () => {
      const content = "same";
      const existing = join(assetsDir, "A-014.png");
      const newFile = join(assetsDir, "new.png");
      writeFileSync(existing, content);
      writeFileSync(newFile, content);
      const decision = await computeVersionDecision("A-014", newFile, options);
      expect(decision).toEqual({ newAssetId: "A-014", version: 1 });
    });

    it("returns version 2 when existing file has different hash", async () => {
      const existing = join(assetsDir, "A-014.png");
      const newFile = join(assetsDir, "new.png");
      writeFileSync(existing, "old");
      writeFileSync(newFile, "new");
      const decision = await computeVersionDecision("A-014", newFile, options);
      expect(decision).toEqual({ newAssetId: "A-014-v2", version: 2 });
    });

    it("returns next version when v2 exists with different hash", async () => {
      const existing = join(assetsDir, "A-014.png");
      const v2 = join(assetsDir, "A-014-v2.png");
      const newFile = join(assetsDir, "new.png");
      writeFileSync(existing, "a");
      writeFileSync(v2, "b");
      writeFileSync(newFile, "c");
      const decision = await computeVersionDecision("A-014", newFile, options);
      expect(decision.version).toBe(3);
      expect(decision.newAssetId).toBe("A-014-v3");
    });
  });

  describe("applyVersionAtomic", () => {
    it("renames source to target", async () => {
      const source = join(assetsDir, "source.png");
      writeFileSync(source, "data");
      const decision: VersionDecision = { newAssetId: "A-014", version: 1 };
      await applyVersionAtomic("A-014", source, decision, options);
      const { readFile } = await import("fs/promises");
      const targetPath = join(assetsDir, "A-014.png");
      const data = await readFile(targetPath, "utf-8");
      expect(data).toBe("data");
    });
  });
});
