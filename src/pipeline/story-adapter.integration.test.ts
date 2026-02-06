/**
 * Integration test: Verify story-adapter works with real 100+ component CSV
 */

import { describe, it, expect } from "vitest";
import { readFile } from "fs/promises";
import { parseTable } from "../figma/table-parser.js";
import { adaptComponentRowsToPlannedStories } from "./story-adapter.js";

describe("story-adapter integration with real CSV", () => {
  it("processes 100+ component CSV successfully", async () => {
    // Read real CSV fixture
    const csvPath = "tests/fixtures/Full Component List - Sheet1.csv";
    const csvContent = await readFile(csvPath, "utf-8");

    // Parse with table-parser (uses LLM semantic mapping)
    const rows = await parseTable(csvContent);

    // Should have 100+ components
    expect(rows.length).toBeGreaterThanOrEqual(100);
    console.log(`✓ Parsed ${rows.length} components from CSV`);

    // Adapt to PlannedStory format
    const plannedStories = adaptComponentRowsToPlannedStories(rows);

    // Should preserve all rows
    expect(plannedStories.length).toBe(rows.length);

    // Verify structure
    expect(plannedStories[0]).toHaveProperty("seed");
    expect(plannedStories[0]).toHaveProperty("order");
    expect(plannedStories[0]).toHaveProperty("componentRef");
    expect(plannedStories[0]).toHaveProperty("level");

    // Verify ordering (atoms first)
    const atoms = plannedStories.filter((s) => s.level === "atom");
    const molecules = plannedStories.filter((s) => s.level === "molecule");
    const organisms = plannedStories.filter((s) => s.level === "organism");

    expect(atoms.length).toBeGreaterThan(0);
    console.log(`✓ Atoms: ${atoms.length}, Molecules: ${molecules.length}, Organisms: ${organisms.length}`);

    // Verify bottom-up ordering (atoms before molecules)
    if (atoms.length > 0 && molecules.length > 0) {
      const lastAtomOrder = Math.max(...atoms.map((s) => s.order));
      const firstMoleculeOrder = Math.min(...molecules.map((s) => s.order));
      expect(lastAtomOrder).toBeLessThan(firstMoleculeOrder);
    }

    // Verify seed quality (should use descriptions when >40 chars)
    const withDescriptions = plannedStories.filter(
      (s) => !s.seed.startsWith("User interacts with")
    );
    expect(withDescriptions.length).toBeGreaterThan(0);
    console.log(`✓ ${withDescriptions.length} stories using description as seed`);

    // Sample check: verify first few rows
    console.log("\nSample PlannedStories:");
    plannedStories.slice(0, 3).forEach((s, i) => {
      console.log(`  ${i + 1}. [${s.level}] ${s.componentRef}: "${s.seed.substring(0, 60)}..."`);
    });
  });
});
