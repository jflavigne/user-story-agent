/**
 * Unit tests for asset lock metrics (F-007-FIX).
 */

import { describe, it, expect } from "vitest";
import { createInMemoryAssetMetrics } from "./asset-metrics.js";

describe("createInMemoryAssetMetrics", () => {
  it("increments lock waits by result", () => {
    const m = createInMemoryAssetMetrics();
    expect(m.lockWaits.getTotal()).toBe(0);
    m.lockWaits.increment({ result: "success" });
    m.lockWaits.increment({ result: "success" });
    m.lockWaits.increment({ result: "timeout" });
    expect(m.lockWaits.getTotal()).toBe(3);
    expect(m.lockWaits.getCounts().get("success")).toBe(2);
    expect(m.lockWaits.getCounts().get("timeout")).toBe(1);
  });

  it("increments lock timeouts", () => {
    const m = createInMemoryAssetMetrics();
    expect(m.lockTimeouts.getTotal()).toBe(0);
    m.lockTimeouts.increment();
    m.lockTimeouts.increment();
    expect(m.lockTimeouts.getTotal()).toBe(2);
  });

  it("observes lock duration", () => {
    const m = createInMemoryAssetMetrics();
    expect(m.lockDuration.getObservations()).toEqual([]);
    m.lockDuration.observe(0.5);
    m.lockDuration.observe(1.2);
    expect(m.lockDuration.getObservations()).toEqual([0.5, 1.2]);
  });
});
