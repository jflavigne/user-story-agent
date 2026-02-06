/**
 * Vision-enabled Figma pipeline command: CSV → parseTable → orchestrate → output.
 * Uses real user-story-agent dependencies (autoDetectFigmaComponents, UserStoryAgent).
 */

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { parseTable } from "../figma/table-parser.js";
import type { ComponentRow } from "../figma/table-parser.js";
import { orchestrate } from "../pipeline/orchestrator.js";
import type {
  OrchestratorDeps,
  SystemWorkflowResultStub,
} from "../pipeline/types.js";
import { generateMarkdownFiles } from "../pipeline/markdown-generator.js";
import { adaptComponentRowsToPlannedStories } from "../pipeline/story-adapter.js";

/** Optional product context built from CLI args (for logging/future use). */
export interface ProductContext {
  name?: string;
  description?: string;
}

/** Options for runFigmaPipelineCmd. */
export interface FigmaPipelineCmdOptions {
  /** Path to CSV/table file. */
  tablePath: string;
  /** Anthropic API key for UserStoryAgent. */
  apiKey: string;
  /** Figma file URL (enables vision when set with figmaToken). */
  figmaUrl?: string;
  /** Figma access token (enables vision when set with figmaUrl). */
  figmaToken?: string;
  /** Optional directory to write result JSON. */
  outputDir?: string;
  /** Optional product name for context. */
  productName?: string;
  /** Optional product description for context. */
  productDescription?: string;
  /** Enable/disable cache (default: true). */
  enableCache?: boolean;
  /** Disable cache (alias for enableCache: false). */
  noCache?: boolean;
  /** Max cache age (e.g., "7d", "24h", "30m"). Default: "7d". */
  maxCacheAge?: string;
  /** Cache directory. Default: ".figma-cache/". */
  cacheDir?: string;
  /** Clean cache before processing. */
  cleanCache?: boolean;
}

/** Build cache config from CLI options. */
export async function buildCacheConfig(options: FigmaPipelineCmdOptions): Promise<import("../cache/figma-image-cache.js").CacheConfig> {
  const { parseAge } = await import("../cache/figma-image-cache.js");

  const enabled = options.noCache ? false : (options.enableCache ?? true);

  return {
    enabled,
    cacheDir: options.cacheDir || ".figma-cache/",
    maxCacheAge: parseAge(options.maxCacheAge || "7d"),
    maxCacheSize: 1024 * 1024 * 1024, // 1GB default
  };
}

/** Build optional ProductContext from CLI-style options. */
export function buildProductContext(options: {
  productName?: string;
  productDescription?: string;
}): ProductContext | undefined {
  const { productName, productDescription } = options;
  if (!productName && !productDescription) return undefined;
  const ctx: ProductContext = {};
  if (productName) ctx.name = productName;
  if (productDescription) ctx.description = productDescription;
  return ctx;
}

/** Real dependencies from this repo (injectable in tests via runFigmaPipelineCmdWithDeps). */
async function getRealDeps(): Promise<OrchestratorDeps> {
  const { autoDetectFigmaComponents } = await import(
    "../utils/figma-utils.js"
  );
  const { UserStoryAgent } = await import(
    "../agent/user-story-agent.js"
  );
  return {
    autoDetectFigmaComponents,
    UserStoryAgent,
  };
}

/**
 * Runs the vision-enabled pipeline: read CSV, parse, orchestrate, output (and optionally save).
 */
export async function runFigmaPipelineCmd(
  options: FigmaPipelineCmdOptions,
  deps?: { readFile: typeof readFileSync; parseTable: typeof parseTable; orchestrate: typeof orchestrate; deps: OrchestratorDeps }
): Promise<SystemWorkflowResultStub> {
  const readFile = deps?.readFile ?? readFileSync;
  const parse = deps?.parseTable ?? parseTable;
  const runOrchestrate = deps?.orchestrate ?? orchestrate;
  const orchestratorDeps = deps?.deps ?? (await getRealDeps());

  const tableInput = readFile(options.tablePath, "utf-8") as string;
  const rows: ComponentRow[] = await parse(tableInput);

  const productContext = buildProductContext({
    productName: options.productName,
    productDescription: options.productDescription,
  });

  // Initialize cache
  const cacheConfig = await buildCacheConfig(options);
  const { FigmaImageCache } = await import("../cache/figma-image-cache.js");
  const cache = cacheConfig.enabled ? new FigmaImageCache(cacheConfig) : undefined;

  // Clean cache if requested
  if (options.cleanCache && cache) {
    await cache.init();
    const stats = await cache.cleanup();
    process.stdout.write(
      `[Cache] Cleaned: ${stats.removed} entries, ${stats.bytesFreed} bytes freed\n`
    );
  }

  const { result, componentImages } = await runOrchestrate(rows, {
    apiKey: options.apiKey,
    figmaUrl: options.figmaUrl,
    figmaToken: options.figmaToken,
    deps: orchestratorDeps,
    cache,
  });

  // Generate individual markdown files if output directory specified
  let markdownStats = { successCount: 0, imagesDownloaded: 0 };
  if (options.outputDir) {
    try {
      const plannedStories = adaptComponentRowsToPlannedStories(rows);
      const mdResult = await generateMarkdownFiles(
        result,
        rows,
        plannedStories,
        options.outputDir,
        options.apiKey,
        componentImages
      );
      markdownStats = {
        successCount: mdResult.successCount,
        imagesDownloaded: mdResult.imagesDownloaded,
      };
    } catch (err) {
      process.stderr.write(
        `Warning: Markdown generation failed: ${String(err)}\n`
      );
    }
  }

  // Log cache statistics if cache was used
  if (cache) {
    const stats = cache.getStats();
    const hitRate = stats.cacheHits + stats.cacheMisses > 0
      ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)
      : 0;
    process.stdout.write(
      `[Cache] Summary: ${stats.cacheHits} hits (${hitRate}%), ${stats.cacheMisses} downloads, ` +
      `${stats.totalDiskUsage} bytes used\n`
    );
  }

  const outLines: string[] = [];
  outLines.push(`Parsed ${rows.length} components from ${options.tablePath}`);
  if (productContext) {
    outLines.push(`Product context: ${JSON.stringify(productContext)}`);
  }
  outLines.push(
    `Generated ${result.stories.length} user stories` +
    (markdownStats.successCount > 0
      ? ` (${markdownStats.successCount} markdown files, ${markdownStats.imagesDownloaded} images)`
      : "")
  );
  outLines.push("");
  outLines.push(JSON.stringify(result, null, 2));
  process.stdout.write(outLines.join("\n") + "\n");

  if (options.outputDir) {
    try {
      mkdirSync(options.outputDir, { recursive: true });
      const outputPath = `${options.outputDir}/pipeline-result.json`;
      writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");
    } catch (err) {
      process.stderr.write(
        `Error: Failed to write pipeline-result.json to ${options.outputDir}: ${String(err)}\n`
      );
      throw err;
    }
  }

  return result;
}
