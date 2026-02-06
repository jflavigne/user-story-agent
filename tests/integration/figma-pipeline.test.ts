/**
 * End-to-end integration test for the Figma pipeline.
 * Tests the complete workflow: CSV → parser → orchestrator → UserStoryAgent.
 *
 * Prerequisites:
 * - ANTHROPIC_API_KEY environment variable (required)
 * - Real LLM calls made; may take 60-120 seconds per test
 */

import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { runFigmaPipelineCmd } from "../../src/cli/figma-pipeline-cmd.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Test fixture: 3-component sample inventory (Button, InputField, LoginForm with dependencies) */
const SAMPLE_CSV_PATH = resolve(__dirname, "../fixtures/sample-inventory.csv");

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

describe("Figma Pipeline Integration", { timeout: 180000 }, () => {
  it.skipIf(!hasApiKey)("processes component inventory CSV end-to-end", async () => {
    const result = await runFigmaPipelineCmd({
      tablePath: SAMPLE_CSV_PATH,
      apiKey: process.env.ANTHROPIC_API_KEY!,
      figmaUrl: "https://figma.com/file/ABC",
      figmaToken: process.env.FIGMA_ACCESS_TOKEN,
      productName: "Test Product",
      productDescription: "Test Description",
    });

    expect(result.stories).toBeDefined();
    expect(result.stories.length).toBeGreaterThan(0);
    expect(result.stories[0].id).toBeDefined();
    expect(result.stories[0].content).toBeDefined();
    expect(result.systemContext).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.passesCompleted).toBeDefined();
    expect(result.metadata.passesCompleted.length).toBeGreaterThan(0);
    expect(result.metadata.refinementRounds).toBeGreaterThanOrEqual(0);
  });

  it.skipIf(!hasApiKey)("handles missing figmaToken gracefully", async () => {
    const result = await runFigmaPipelineCmd({
      tablePath: SAMPLE_CSV_PATH,
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    expect(result.stories.length).toBeGreaterThan(0);
    expect(result.stories[0].id).toBeDefined();
    expect(result.metadata.passesCompleted).toBeDefined();
  });

  it.skipIf(!hasApiKey)("preserves component metadata", async () => {
    const result = await runFigmaPipelineCmd({
      tablePath: SAMPLE_CSV_PATH,
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    expect(result.stories.length).toBeGreaterThan(0);
    for (const story of result.stories) {
      expect(story.id).toBeDefined();
      expect(story.content).toBeDefined();
      expect(story.interconnections).toBeDefined();
    }
    expect(result.consistencyReport).toBeDefined();
    expect(result.consistencyReport.issues).toBeDefined();
    expect(Array.isArray(result.consistencyReport.issues)).toBe(true);
  });
});
