/**
 * Unit tests for vision circuit breaker (F-004-FIX).
 */

import { describe, it, expect } from "vitest";
import {
  createVisionCircuitBreaker,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_OPEN_MESSAGE,
} from "./circuit-breaker.js";

describe("circuit-breaker", () => {
  describe("constants", () => {
    it("threshold is 3", () => {
      expect(CIRCUIT_BREAKER_THRESHOLD).toBe(3);
    });
    it("message includes user options 1/2/3", () => {
      expect(CIRCUIT_OPEN_MESSAGE).toContain("Your choice? [1/2/3]");
      expect(CIRCUIT_OPEN_MESSAGE).toContain("Wait 5 minutes");
      expect(CIRCUIT_OPEN_MESSAGE).toContain("Reduce batch size");
      expect(CIRCUIT_OPEN_MESSAGE).toContain("Cancel pipeline");
    });
  });

  describe("createVisionCircuitBreaker", () => {
    it("starts closed", () => {
      const cb = createVisionCircuitBreaker();
      expect(cb.isOpen()).toBe(false);
    });

    it("opens after 3 consecutive timeouts", () => {
      const cb = createVisionCircuitBreaker();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(true);
      expect(cb.getMessage()).toBe(CIRCUIT_OPEN_MESSAGE);
    });

    it("resets consecutive count on success", () => {
      const cb = createVisionCircuitBreaker();
      cb.recordTimeout();
      cb.recordTimeout();
      cb.recordSuccess();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(true);
    });

    it("reset() closes circuit and clears count", () => {
      const cb = createVisionCircuitBreaker();
      cb.recordTimeout();
      cb.recordTimeout();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(true);
      cb.reset();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
    });

    it("calls log on circuit open", () => {
      const logCalls: Array<[string, Record<string, unknown>]> = [];
      const cb = createVisionCircuitBreaker({
        log: (e, p) => logCalls.push([e, p]),
      });
      cb.recordTimeout();
      cb.recordTimeout();
      cb.recordTimeout();
      expect(logCalls).toHaveLength(1);
      expect(logCalls[0]![0]).toBe("vision.circuit_opened");
      expect(logCalls[0]![1]).toMatchObject({ consecutiveTimeouts: 3, threshold: 3 });
    });

    it("calls onCircuitOpen alert when circuit opens", () => {
      let alerted = false;
      const cb = createVisionCircuitBreaker({
        onCircuitOpen: () => {
          alerted = true;
        },
      });
      cb.recordTimeout();
      cb.recordTimeout();
      expect(alerted).toBe(false);
      cb.recordTimeout();
      expect(alerted).toBe(true);
    });

    it("respects custom threshold", () => {
      const cb = createVisionCircuitBreaker({ threshold: 2 });
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(false);
      cb.recordTimeout();
      expect(cb.isOpen()).toBe(true);
    });
  });
});
