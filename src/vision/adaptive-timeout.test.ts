/**
 * Unit tests for adaptive timeout (F-004-FIX).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ADAPTIVE_TIMEOUTS_MS,
  BACKOFF_DELAYS_MS,
  MAX_RETRIES,
  executeWithAdaptiveTimeout,
  isTimeoutError,
  sleep,
} from "./adaptive-timeout.js";

describe("adaptive-timeout", () => {
  describe("constants", () => {
    it("exports timeouts 120s, 180s, 240s", () => {
      expect(ADAPTIVE_TIMEOUTS_MS).toEqual([120_000, 180_000, 240_000]);
    });
    it("exports backoff 5s, 10s", () => {
      expect(BACKOFF_DELAYS_MS).toEqual([5_000, 10_000]);
    });
    it("exports MAX_RETRIES 2", () => {
      expect(MAX_RETRIES).toBe(2);
    });
  });

  describe("isTimeoutError", () => {
    it("returns true for error with code TIMEOUT", () => {
      expect(isTimeoutError({ code: "TIMEOUT" })).toBe(true);
    });
    it("returns true for AbortError", () => {
      expect(isTimeoutError({ name: "AbortError" })).toBe(true);
    });
    it("returns true for TimeoutError", () => {
      expect(isTimeoutError({ name: "TimeoutError" })).toBe(true);
    });
    it("returns true for message containing timeout", () => {
      expect(isTimeoutError({ message: "Request timed out" })).toBe(true);
      expect(isTimeoutError({ message: "timed out after 120s" })).toBe(true);
    });
    it("returns false for non-timeout error", () => {
      expect(isTimeoutError(new Error("Network error"))).toBe(false);
      expect(isTimeoutError({ code: "429" })).toBe(false);
    });
    it("returns false for null/undefined", () => {
      expect(isTimeoutError(null)).toBe(false);
      expect(isTimeoutError(undefined)).toBe(false);
    });
  });

  describe("sleep", () => {
    it("resolves after roughly the given ms", async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(40);
    });
  });

  describe("executeWithAdaptiveTimeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns result on first success", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const p = executeWithAdaptiveTimeout(fn, { batchId: "b1" });
      await vi.runAllTimersAsync();
      const result = await p;
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(120_000, 0);
    });

    it("retries on timeout with next timeout (180s then 240s)", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "TIMEOUT" }))
        .mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "TIMEOUT" }))
        .mockResolvedValueOnce("ok");
      const log: Array<[string, Record<string, unknown>]> = [];
      const p = executeWithAdaptiveTimeout(fn, {
        batchId: "b2",
        log: (e, payload) => log.push([e, payload]),
      });
      await vi.runAllTimersAsync();
      const result = await p;
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(3);
      expect(fn).toHaveBeenNthCalledWith(1, 120_000, 0);
      expect(fn).toHaveBeenNthCalledWith(2, 180_000, 1);
      expect(fn).toHaveBeenNthCalledWith(3, 240_000, 2);
      expect(log.filter(([e]) => e === "vision.batch_timeout")).toHaveLength(2);
      expect(log.filter(([e]) => e === "vision.retry")).toHaveLength(2);
    });

    it("calls incrementTimeout on each timeout", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("t"), { code: "TIMEOUT" }))
        .mockResolvedValueOnce("ok");
      const timeouts: Array<{ batch_id: string; attempt: number }> = [];
      const p = executeWithAdaptiveTimeout(fn, {
        batchId: "b3",
        incrementTimeout: (l) => timeouts.push(l),
      });
      await vi.runAllTimersAsync();
      await p;
      expect(timeouts).toEqual([{ batch_id: "b3", attempt: 0 }]);
    });

    it("throws on non-timeout error without retry", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("402 Payment Required"));
      const p = executeWithAdaptiveTimeout(fn, { batchId: "b4" });
      const expectPromise = expect(p).rejects.toThrow("402 Payment Required");
      await vi.runAllTimersAsync();
      await expectPromise;
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("throws after all retries exhausted (3 timeouts)", async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("timeout"), { code: "TIMEOUT" }));
      const p = executeWithAdaptiveTimeout(fn, { batchId: "b5" });
      const expectPromise = expect(p).rejects.toMatchObject({ code: "TIMEOUT" });
      await vi.runAllTimersAsync();
      await expectPromise;
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
