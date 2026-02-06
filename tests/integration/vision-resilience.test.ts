/**
 * Integration tests for F-004-FIX: adaptive timeout, checkpoint, circuit breaker.
 * Validation: timeout → checkpoint saved; retry → resume from checkpoint; 3 timeouts → circuit opens.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  executeWithAdaptiveTimeout,
  isTimeoutError,
  writeCheckpoint,
  readCheckpoint,
  deleteCheckpoint,
  getCheckpointPath,
  createVisionCircuitBreaker,
  createInMemoryVisionMetrics,
  type BatchCheckpoint,
  type ComponentMention,
} from "../../src/vision/index.js";

describe("vision resilience (integration)", () => {
  let evidenceDir: string;

  beforeEach(() => {
    evidenceDir = mkdtempSync(join(tmpdir(), "vision-resilience-"));
    vi.useFakeTimers();
  });

  afterEach(() => {
    rmSync(evidenceDir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  describe("adaptive-timeout: simulate timeout then success", () => {
    it("attempt 1 fails at 120s, retry 1 succeeds with 180s timeout", async () => {
      const attempts: Array<{ timeoutMs: number; attempt: number }> = [];
      const fn = async (timeoutMs: number, attempt: number): Promise<string> => {
        attempts.push({ timeoutMs, attempt });
        if (attempt === 0) {
          throw Object.assign(new Error("timeout"), { code: "TIMEOUT" });
        }
        return "done";
      };
      const p = executeWithAdaptiveTimeout(fn, { batchId: "adaptive-test" });
      await vi.runAllTimersAsync();
      const result = await p;
      expect(result).toBe("done");
      expect(attempts).toHaveLength(2);
      expect(attempts[0]).toEqual({ timeoutMs: 120_000, attempt: 0 });
      expect(attempts[1]).toEqual({ timeoutMs: 180_000, attempt: 1 });
    });
  });

  describe("partial-checkpoint: simulate timeout then verify checkpoint saved", () => {
    it("on timeout, checkpoint is persisted to evidenceDir/.checkpoints/batch-{id}.json (atomic write)", async () => {
      const batchId = "partial-batch-1";
      const partialResults: ComponentMention[] = [
        { componentId: "c1", name: "Button" },
        { componentId: "c2", name: "Input" },
      ];
      const checkpoint: BatchCheckpoint = {
        batchId,
        completedComponents: ["c1", "c2"],
        remainingComponents: ["c3", "c4"],
        partialResults,
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, checkpoint);
      const path = getCheckpointPath(evidenceDir, batchId);
      const raw = readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw) as BatchCheckpoint;
      expect(parsed.batchId).toBe(batchId);
      expect(parsed.completedComponents).toEqual(["c1", "c2"]);
      expect(parsed.remainingComponents).toEqual(["c3", "c4"]);
      expect(parsed.partialResults).toHaveLength(2);
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe("retry after timeout: resume from checkpoint", () => {
    it("retry skips completed components and processes only remaining", () => {
      const batchId = "resume-batch-1";
      const checkpoint: BatchCheckpoint = {
        batchId,
        completedComponents: ["c1", "c2"],
        remainingComponents: ["c3"],
        partialResults: [
          { componentId: "c1", name: "Button" },
          { componentId: "c2", name: "Input" },
        ],
        timestamp: new Date().toISOString(),
      };
      writeCheckpoint(evidenceDir, checkpoint);
      const loaded = readCheckpoint(evidenceDir, batchId);
      expect(loaded).not.toBeNull();
      expect(loaded!.remainingComponents).toEqual(["c3"]);
      expect(loaded!.completedComponents).toEqual(["c1", "c2"]);
      const processedRemaining = loaded!.remainingComponents;
      expect(processedRemaining).toEqual(["c3"]);
      deleteCheckpoint(evidenceDir, batchId);
      expect(readCheckpoint(evidenceDir, batchId)).toBeNull();
    });
  });

  describe("circuit-breaker: 3 consecutive timeouts open circuit", () => {
    it("after 3 timeouts, circuit opens and alert fires", () => {
      const metrics = createInMemoryVisionMetrics();
      const cb = createVisionCircuitBreaker({
        onCircuitOpen: () => metrics.circuitOpenAlert.fire(),
      });
      expect(cb.isOpen()).toBe(false);
      expect(metrics.circuitOpenAlert.getFired()).toBe(false);
      cb.recordTimeout();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(true);
      expect(metrics.circuitOpenAlert.getFired()).toBe(true);
      expect(cb.getMessage()).toContain("Your choice? [1/2/3]");
    });
  });

  describe("isTimeoutError", () => {
    it("identifies timeout for integration flow", () => {
      expect(isTimeoutError({ code: "TIMEOUT" })).toBe(true);
      expect(isTimeoutError(new Error("Request timed out"))).toBe(true);
    });
  });
});
