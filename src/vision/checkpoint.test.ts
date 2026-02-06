/**
 * Unit tests for checkpoint persistence (F-004-FIX).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  writeCheckpoint,
  readCheckpoint,
  deleteCheckpoint,
  getCheckpointDir,
  getCheckpointPath,
} from "./checkpoint.js";
import type { BatchCheckpoint } from "./types.js";

describe("checkpoint", () => {
  let evidenceDir: string;

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "vision-checkpoint-"));
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
  });

  describe("getCheckpointDir / getCheckpointPath", () => {
    it("resolves .checkpoints under evidence dir", () => {
      expect(getCheckpointDir(evidenceDir)).toBe(join(evidenceDir, ".checkpoints"));
    });
    it("resolves batch file with safe id", () => {
      expect(getCheckpointPath(evidenceDir, "batch-1")).toContain("batch-batch-1.json");
      expect(getCheckpointPath(evidenceDir, "id/with:chars")).toContain("batch-id_with_chars.json");
    });
  });

  describe("writeCheckpoint / readCheckpoint", () => {
    it("writes and reads checkpoint round-trip", () => {
      const cp: BatchCheckpoint = {
        batchId: "b1",
        completedComponents: ["c1", "c2"],
        remainingComponents: ["c3"],
        partialResults: [
          { componentId: "c1", name: "Button" },
          { componentId: "c2", name: "Input" },
        ],
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, cp);
      const read = readCheckpoint(evidenceDir, "b1");
      expect(read).not.toBeNull();
      expect(read!.batchId).toBe("b1");
      expect(read!.completedComponents).toEqual(["c1", "c2"]);
      expect(read!.remainingComponents).toEqual(["c3"]);
      expect(read!.partialResults).toHaveLength(2);
      expect(read!.timestamp).toBe(cp.timestamp);
    });

    it("creates .checkpoints directory if missing", () => {
      const cp: BatchCheckpoint = {
        batchId: "b2",
        completedComponents: [],
        remainingComponents: ["c1"],
        partialResults: [],
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, cp);
      const dir = getCheckpointDir(evidenceDir);
      const files = readdirSync(dir);
      expect(files).toContain("batch-b2.json");
    });

    it("writes atomically (tmp then rename)", () => {
      const cp: BatchCheckpoint = {
        batchId: "b3",
        completedComponents: ["c1"],
        remainingComponents: [],
        partialResults: [{ componentId: "c1" }],
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, cp);
      const path = getCheckpointPath(evidenceDir, "b3");
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw) as BatchCheckpoint;
      expect(parsed.batchId).toBe("b3");
    });
  });

  describe("readCheckpoint", () => {
    it("returns null for missing file", () => {
      expect(readCheckpoint(evidenceDir, "nonexistent")).toBeNull();
    });

    it("returns null for invalid JSON shape", () => {
      const dir = getCheckpointDir(evidenceDir);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "batch-bad.json"), '{"batchId":"b"}', "utf-8");
      expect(readCheckpoint(evidenceDir, "bad")).toBeNull();
    });
  });

  describe("deleteCheckpoint", () => {
    it("removes checkpoint file", () => {
      const cp: BatchCheckpoint = {
        batchId: "b4",
        completedComponents: [],
        remainingComponents: [],
        partialResults: [],
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, cp);
      expect(readCheckpoint(evidenceDir, "b4")).not.toBeNull();
      deleteCheckpoint(evidenceDir, "b4");
      expect(readCheckpoint(evidenceDir, "b4")).toBeNull();
    });

    it("is no-op when file does not exist", () => {
      expect(() => deleteCheckpoint(evidenceDir, "nonexistent")).not.toThrow();
    });
  });
});
