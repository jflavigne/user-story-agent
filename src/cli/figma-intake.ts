#!/usr/bin/env node
/**
 * Figma Intake Pipeline CLI (D-001: pre-flight runs before FigmaDataSource).
 * Pre-flight credential check runs at step 0; pipeline flow follows on success.
 */

import { Command } from "commander";
import { runPreflightCheck } from "../figma/preflight.js";
import { runFigmaPipelineCmd } from "./figma-pipeline-cmd.js";

const program = new Command();

function logDebug(event: string, payload: Record<string, unknown>): void {
  if (process.env.DEBUG?.includes("pipeline") || process.env.DEBUG === "*") {
    process.stderr.write(`[DEBUG] ${event} ${JSON.stringify(payload)}\n`);
  }
}

program
  .name("figma-intake")
  .description("Generate user stories from Figma designs with vision support")
  .version("1.0.0")
  .argument("[figma-url]", "Figma design file URL (enables vision mode)")
  .option("-t, --table <path>", "Component inventory table (CSV or Markdown)")
  .option("-m, --model <preset>", "Model preset: balanced|premium|fast", "balanced")
  .option("--force-refresh", "Overwrite existing assets", false)
  .option("--max-batch-size <n>", "Max images per batch", "19")
  .option("--mcp-json <path>", "Path to .mcp.json (default: project root .mcp.json)")
  .option("--project-root <path>", "Project root for resolving .mcp.json", process.cwd())
  .option("--figma-token <token>", "Figma access token (or use FIGMA_ACCESS_TOKEN env)")
  .option("--product-name <name>", "Product name for context")
  .option("--product-description <desc>", "Product description")
  .option("--output-dir <dir>", "Directory to save generated stories")
  .action(async (figmaUrl: string | undefined, options: Record<string, unknown>) => {
    const projectRoot = (options.projectRoot as string) ?? process.cwd();
    const mcpJsonPath = options.mcpJson as string | undefined;

    const preflight = runPreflightCheck({
      projectRoot,
      mcpJsonPath,
      log: logDebug,
    });

    if (!preflight.ok) {
      process.stderr.write(preflight.message ?? "Missing Figma credentials.\n");
      process.stderr.write("\n");
      process.exitCode = 1;
      return;
    }

    if (!figmaUrl) {
      process.stdout.write("Pre-flight passed. Provide a Figma URL to run the pipeline.\n");
      return;
    }

    // Run vision-enabled pipeline if table provided
    if (options.table) {
      try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          process.stderr.write("Error: ANTHROPIC_API_KEY environment variable required\n");
          process.exitCode = 1;
          return;
        }

        const figmaToken = (options.figmaToken as string) || process.env.FIGMA_ACCESS_TOKEN;

        await runFigmaPipelineCmd({
          tablePath: options.table as string,
          apiKey,
          figmaUrl,
          figmaToken,
          productName: options.productName as string | undefined,
          productDescription: options.productDescription as string | undefined,
          outputDir: options.outputDir as string | undefined,
        });
      } catch (err) {
        process.stderr.write(`Error running pipeline: ${String(err)}\n`);
        process.exitCode = 1;
        return;
      }
    } else {
      process.stdout.write(
        `Pre-flight passed (hasApiKey=${preflight.hasApiKey}, hasMcpConfig=${preflight.hasMcpConfig}).\n` +
        `Provide --table option to run the pipeline.\n`
      );
    }
  });

await program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(String(err) + "\n");
  process.exitCode = 1;
});
