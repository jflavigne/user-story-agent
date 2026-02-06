/**
 * Unit tests for vision metrics (F-004-FIX).
 */

import { describe, it, expect } from "vitest";
import { createInMemoryVisionMetrics } from "./metrics.js";

describe("vision metrics", () => {
  describe("createInMemoryVisionMetrics", () => {
    it("timeouts counter increments and reports total", () => {
      const m = createInMemoryVisionMetrics();
      expect(m.timeouts.getTotal()).toBe(0);
      m.timeouts.increment({ batch_id: "b1", attempt: 0 });
      m.timeouts.increment({ batch_id: "b1", attempt: 0 });
      m.timeouts.increment({ batch_id: "b2", attempt: 1 });
      expect(m.timeouts.getTotal()).toBe(3);
      const counts = m.timeouts.getCounts();
      expect(counts.get("b1:0")).toBe(2);
      expect(counts.get("b2:1")).toBe(1);
    });

    it("partialRecoveries counter increments", () => {
      const m = createInMemoryVisionMetrics();
      expect(m.partialRecoveries.getTotal()).toBe(0);
      m.partialRecoveries.increment();
      m.partialRecoveries.increment();
      expect(m.partialRecoveries.getTotal()).toBe(2);
    });

    it("circuitOpenAlert fires and getFired returns true", () => {
      const m = createInMemoryVisionMetrics();
      expect(m.circuitOpenAlert.getFired()).toBe(false);
      m.circuitOpenAlert.fire();
      expect(m.circuitOpenAlert.getFired()).toBe(true);
    });
  });
});
