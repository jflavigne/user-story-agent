/**
 * Unit tests for story-adapter: ComponentRow[] → PlannedStory[].
 */

import { describe, it, expect } from "vitest";
import {
  adaptComponentRowsToPlannedStories,
  type PlannedStory,
} from "./story-adapter.js";
import type { ComponentRow } from "../figma/table-parser.js";

function row(overrides: Partial<ComponentRow> & { component: string; level: string }): ComponentRow {
  return {
    figmaNodeLink: "https://figma.com/node",
    ...overrides,
    component: overrides.component,
    level: overrides.level,
  };
}

describe("adaptComponentRowsToPlannedStories", () => {
  describe("level normalization", () => {
    it('normalizes "1-Atom" to "atom"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Button", level: "1-Atom" }),
      ]);
      expect(result[0].level).toBe("atom");
    });

    it('normalizes "atom" to "atom"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Icon", level: "atom" }),
      ]);
      expect(result[0].level).toBe("atom");
    });

    it('normalizes "Atom" to "atom"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Label", level: "Atom" }),
      ]);
      expect(result[0].level).toBe("atom");
    });

    it('normalizes "ATOM" to "atom"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Badge", level: "ATOM" }),
      ]);
      expect(result[0].level).toBe("atom");
    });

    it('normalizes "2-Molecule" to "molecule"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Card", level: "2-Molecule" }),
      ]);
      expect(result[0].level).toBe("molecule");
    });

    it('normalizes "Organism" and "SCREEN"', () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Header", level: "Organism" }),
        row({ component: "Dashboard", level: "SCREEN" }),
      ]);
      expect(result[0].level).toBe("organism");
      expect(result[1].level).toBe("screen");
    });

    it("defaults unknown level to atom", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Thing", level: "Unknown" }),
      ]);
      expect(result[0].level).toBe("atom");
    });
  });

  describe("seed generation", () => {
    it("uses description when length > 40 chars", () => {
      const longDesc =
        "A primary action button that triggers the main workflow and supports loading state.";
      const result = adaptComponentRowsToPlannedStories([
        row({
          component: "Button",
          level: "atom",
          description: longDesc,
        }),
      ]);
      expect(result[0].seed).toBe(longDesc);
    });

    it("uses fallback when description is missing", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Input", level: "atom" }),
      ]);
      expect(result[0].seed).toBe("User interacts with Input");
    });

    it("uses fallback when description is short (<= 40 chars)", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({
          component: "Card",
          level: "molecule",
          description: "Short.",
        }),
      ]);
      expect(result[0].seed).toBe("User interacts with Card");
    });

    it("uses fallback when description is exactly 40 chars", () => {
      const desc40 = "A".repeat(40);
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "X", level: "atom", description: desc40 }),
      ]);
      expect(result[0].seed).toBe("User interacts with X");
    });

    it("uses description when exactly 41 chars", () => {
      const desc41 = "A".repeat(41);
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "X", level: "atom", description: desc41 }),
      ]);
      expect(result[0].seed).toBe(desc41);
    });
  });

  describe("order assignment", () => {
    it("assigns atoms 1+, molecules 1000+, organisms 2000+, screens 3000+", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "A1", level: "atom" }),
        row({ component: "M1", level: "molecule" }),
        row({ component: "O1", level: "organism" }),
        row({ component: "S1", level: "screen" }),
      ]);
      expect(result[0].order).toBe(1);
      expect(result[1].order).toBe(1000);
      expect(result[2].order).toBe(2000);
      expect(result[3].order).toBe(3000);
    });

    it("increments order within same tier", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "A1", level: "atom" }),
        row({ component: "A2", level: "atom" }),
        row({ component: "A3", level: "atom" }),
      ]);
      expect(result.map((s) => s.order)).toEqual([1, 2, 3]);
    });

    it("sorts bottom-up: atoms before molecules before organisms before screens", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "Screen", level: "screen" }),
        row({ component: "Atom", level: "atom" }),
        row({ component: "Molecule", level: "molecule" }),
        row({ component: "Organism", level: "organism" }),
      ]);
      expect(result[0].componentRef).toBe("Atom");
      expect(result[1].componentRef).toBe("Molecule");
      expect(result[2].componentRef).toBe("Organism");
      expect(result[3].componentRef).toBe("Screen");
      expect(result[0].order).toBeLessThan(result[1].order);
      expect(result[1].order).toBeLessThan(result[2].order);
      expect(result[2].order).toBeLessThan(result[3].order);
    });
  });

  describe("componentRef preservation", () => {
    it("sets componentRef to component name", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "PrimaryButton", level: "atom" }),
      ]);
      expect(result[0].componentRef).toBe("PrimaryButton");
    });
  });

  describe("empty array", () => {
    it("returns empty array for empty input", () => {
      const result = adaptComponentRowsToPlannedStories([]);
      expect(result).toEqual([]);
    });
  });

  describe("output shape", () => {
    it("returns PlannedStory[] with seed, order, componentRef, level", () => {
      const result = adaptComponentRowsToPlannedStories([
        row({ component: "C", level: "1-Atom", description: "Desc" }),
      ]);
      const story: PlannedStory = result[0];
      expect(story).toMatchObject({
        seed: "User interacts with C",
        order: 1,
        componentRef: "C",
        level: "atom",
      });
    });
  });
});
