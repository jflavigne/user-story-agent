/**
 * Resumable story generation - processes remaining components one at a time.
 * Skips already-processed components by scanning output directory.
 * Integrates circuit breaker, adaptive timeout, and checkpointing.
 */

import { parseTable } from "../src/figma/table-parser.js";
import { orchestrate } from "../src/pipeline/orchestrator.js";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import type { OrchestratorDeps } from "../src/pipeline/types.js";
import type { ComponentRow } from "../src/figma/table-parser.js";
import { createVisionCircuitBreaker } from "../src/vision/circuit-breaker.js";
import { executeWithAdaptiveTimeout } from "../src/vision/adaptive-timeout.js";
import { writeCheckpoint, getCheckpointDir } from "../src/vision/checkpoint.js";
import { isFigma403Error, handleFigma403WithBackoff } from "../src/pipeline/figma-error-handler.js";

/** CLI flags */
interface CLIFlags {
  validateOnly: boolean;
  dryRun: boolean;
  resume: boolean;
  startFrom: number;
}

/** Parse CLI arguments */
function parseArgs(): CLIFlags {
  const args = process.argv.slice(2);
  return {
    validateOnly: args.includes("--validate-only"),
    dryRun: args.includes("--dry-run"),
    resume: args.includes("--resume"),
    startFrom: parseInt(args.find(a => a.startsWith("--start-from="))?.split("=")[1] || "0")
  };
}

/** Validate and filter CSV rows */
function validateAndFilterRows(rows: ComponentRow[]): ComponentRow[] {
  const valid: ComponentRow[] = [];
  const invalid: Array<{ index: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    if (!row.component || row.component.trim() === "") {
      invalid.push({ index: i + 2, reason: "Missing component name" });
      continue;
    }

    if (!row.figmaNodeLink || !row.figmaNodeLink.includes("figma.com")) {
      invalid.push({ index: i + 2, reason: "Invalid Figma link" });
      continue;
    }

    if (row.description?.includes("figma.com")) {
      invalid.push({ index: i + 2, reason: "Malformed CSV (shifted columns)" });
      continue;
    }

    valid.push(row);
  }

  if (invalid.length > 0) {
    console.log(`\n⚠️  Skipping ${invalid.length} invalid rows:`);
    invalid.forEach(({ index, reason }) => {
      console.log(`   Row ${index}: ${reason}`);
    });
    console.log();
  }

  return valid;
}

/** Build skip list from existing .md files */
function buildSkipList(outputDir: string): Set<string> {
  try {
    const files = readdirSync(outputDir).filter(f => f.endsWith(".md"));
    const processedNames = new Set<string>();

    for (const file of files) {
      // Store filename without .md extension (matches how filenames are generated)
      // e.g., "socialbuttonicon.md" -> "socialbuttonicon"
      const baseName = file.replace(/\.md$/, '');
      processedNames.add(baseName);
    }

    return processedNames;
  } catch (err) {
    return new Set();
  }
}

/** Get real dependencies from this repo. */
async function getRealDeps(): Promise<OrchestratorDeps> {
  const { autoDetectFigmaComponents } = await import(
    "../src/utils/figma-utils.js"
  );
  const { UserStoryAgent } = await import(
    "../src/agent/user-story-agent.js"
  );
  return {
    autoDetectFigmaComponents,
    UserStoryAgent,
  };
}

async function main() {
  const flags = parseArgs();

  console.log("=".repeat(80));
  console.log("Resumable Story Generation with Contract Enforcement");
  console.log("=".repeat(80));
  console.log();

  const csvPath = "/tmp/components-with-figma-links.csv";
  const outputDir = "./stories/contract-enforcement-run";

  // Parse and validate CSV
  console.log("Loading CSV...");
  const csvContent = readFileSync(csvPath, "utf-8");
  const allRows = await parseTable(csvContent);
  const validRows = validateAndFilterRows(allRows);

  console.log(`✓ Total rows: ${allRows.length}`);
  console.log(`✓ Valid rows: ${validRows.length}`);
  console.log(`✓ Invalid rows: ${allRows.length - validRows.length}`);
  console.log();

  if (flags.validateOnly) {
    console.log("--validate-only: Exiting");
    return;
  }

  // Build skip list (for dry-run mode, don't require env vars yet)
  mkdirSync(outputDir, { recursive: true });
  const skipList = buildSkipList(outputDir);
  const remainingRows = validRows.filter(r => {
    // Sanitize component name same way as filename generation
    const sanitized = r.component.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return !skipList.has(sanitized);
  });

  console.log(`✓ Already processed: ${skipList.size}`);
  console.log(`✓ Remaining: ${remainingRows.length}`);
  console.log();

  if (flags.dryRun) {
    console.log("--dry-run: Would process:");
    remainingRows.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.component}`);
    });
    if (remainingRows.length > 10) {
      console.log(`  ... and ${remainingRows.length - 10} more`);
    }
    return;
  }

  // Check for required env vars before actual processing
  if (!process.env.ANTHROPIC_API_KEY || !process.env.FIGMA_ACCESS_TOKEN) {
    throw new Error("ANTHROPIC_API_KEY and FIGMA_ACCESS_TOKEN required");
  }

  // Apply --start-from offset
  const startIndex = flags.startFrom;
  const workRows = startIndex > 0 ? remainingRows.slice(startIndex) : remainingRows;

  if (startIndex > 0) {
    console.log(`--start-from=${startIndex}: Skipping first ${startIndex} components`);
    console.log(`✓ Processing ${workRows.length} components`);
    console.log();
  }

  if (workRows.length === 0) {
    console.log("✓ All components already processed!");
    return;
  }

  // Get dependencies
  console.log("Loading dependencies...");
  const deps = await getRealDeps();
  console.log("✓ Dependencies loaded");
  console.log();

  // Initialize circuit breaker
  const circuitBreaker = createVisionCircuitBreaker({
    threshold: 3,
    log: (event, payload) => console.log(`[CircuitBreaker] ${event}`, payload)
  });

  // Create checkpoint directory
  const checkpointDir = getCheckpointDir(outputDir);
  mkdirSync(checkpointDir, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  // Process one component at a time
  for (let i = 0; i < workRows.length; i++) {
    const row = workRows[i];
    const globalIndex = skipList.size + startIndex + i;

    console.log(`\n[${"=".repeat(78)}]`);
    console.log(`[${globalIndex + 1}/${validRows.length}] ${row.component}`);
    console.log(`[${"=".repeat(78)}]`);

    let attempt = 0;
    let success = false;

    while (attempt < 3 && !success) {
      try {
        // Process single component with adaptive timeout
        const result = await executeWithAdaptiveTimeout(
          async (timeoutMs) => {
            return await orchestrate(
              [row],
              {
                apiKey: process.env.ANTHROPIC_API_KEY!,
                figmaToken: process.env.FIGMA_ACCESS_TOKEN,
                figmaUrl: "https://www.figma.com/design/DzJIDyZVR2rNH2yeOR26M0/",
                deps,
                outputDir, // Enable streaming to disk
              }
            );
          },
          { batchId: `component-${i}-${row.component}` }
        );

        // Story already saved to disk by orchestrator
        console.log(`✓ Saved: ${row.component}`);

        // Aggressive memory cleanup
        if (result.result.stories[0]) {
          result.result.stories[0].content = null;
        }
        result.result.stories = [];

        // Nullify images
        if ('images' in row) {
          (row as any).images = null;
        }

        // Force GC if available
        if (global.gc) {
          global.gc();
        }

        circuitBreaker.recordSuccess();
        successCount++;
        success = true;

        // Checkpoint every 10 components
        if ((i + 1) % 10 === 0) {
          writeCheckpoint(outputDir, {
            batchId: "resume-run",
            completedComponents: [row.component],
            remainingComponents: workRows.slice(i + 1).map(r => r.component),
            partialResults: [],
            timestamp: new Date().toISOString()
          });
          console.log(`✓ Checkpoint saved (${i + 1}/${workRows.length})`);
        }

      } catch (error) {
        if (isFigma403Error(error)) {
          console.error(`⚠️  Figma 403 error (attempt ${attempt + 1}/3)`);
          await handleFigma403WithBackoff(error as Error, {
            component: row.component,
            attempt
          });
          attempt++;
        } else if ((error as Error).message?.includes("timeout")) {
          console.error(`⚠️  Timeout error: ${(error as Error).message}`);
          circuitBreaker.recordTimeout();

          if (circuitBreaker.isOpen()) {
            console.log();
            console.log(circuitBreaker.getMessage());
            console.log();
            console.log("Circuit breaker opened. Stopping pipeline.");
            process.exit(1);
          }

          failCount++;
          break; // Skip to next component
        } else {
          console.error(`❌ Error: ${(error as Error).message}`);
          failCount++;
          break; // Skip to next component
        }
      }
    }

    if (!success && attempt >= 3) {
      console.error(`❌ Failed after ${attempt} attempts, skipping`);
      failCount++;
    }
  }

  // Final summary
  console.log();
  console.log("=".repeat(80));
  console.log("Summary");
  console.log("=".repeat(80));
  console.log(`✓ Processed: ${workRows.length}`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`✓ Total stories: ${skipList.size + successCount}`);
  console.log();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
