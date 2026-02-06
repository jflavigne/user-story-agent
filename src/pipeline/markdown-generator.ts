/**
 * Markdown file generator for user stories.
 * Generates individual markdown files with embedded Figma component images and design metadata.
 */

import { mkdirSync, writeFileSync, renameSync } from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type {
  SystemWorkflowResultStub,
  ComponentRow,
  ImageInput,
} from "./types.js";
import type { PlannedStory } from "./story-adapter.js";
import { USER_STORY_CONTRACT } from "../prompts/figma-intake/user-story-contract.js";
import { logLLMCall, isLLMLoggingEnabled } from "../utils/llm-logger.js";

/** Enriched story with component metadata and image paths. */
export interface EnrichedStory {
  id: string;
  content: string;
  order: number;
  componentRef?: string;
  level?: "atom" | "molecule" | "organism" | "screen";
  figmaNodeLink?: string;
  imagePath?: string;
  status?: string;
}

/** Result of markdown generation. */
export interface MarkdownGenerationResult {
  successCount: number;
  failureCount: number;
  filesWritten: string[];
  imagesDownloaded: number;
  errors: Array<{
    storyId: string;
    error: string;
    fallbackUsed: boolean;
  }>;
}

/**
 * Sanitizes a string for use as a filename.
 * Converts to lowercase, replaces spaces with hyphens, removes special characters, truncates to 80 chars.
 */
export function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Generates a filename for a story markdown file.
 * Format: {order:04d}-{sanitized-name}.md
 */
export function generateFilename(story: EnrichedStory): string {
  const paddedOrder = String(story.order).padStart(4, "0");
  const safeName = sanitizeFilename(story.componentRef || story.id);
  return `${paddedOrder}-${safeName}.md`;
}

/**
 * Builds the Design Reference section for a story.
 * Includes component preview image (if available) and metadata.
 */
export function buildDesignReferenceSection(story: EnrichedStory): string {
  let section = `\n## Design Reference\n\n`;

  if (story.imagePath) {
    section += `### Component Preview\n\n`;
    section += `![${story.componentRef || "Component"}](${story.imagePath})\n\n`;
  }

  section += `### Metadata\n\n`;
  section += `- **Component:** ${story.componentRef || "N/A"}\n`;
  section += `- **Atomic Design Level:** ${story.level || "N/A"}\n`;
  if (story.status) {
    section += `- **Status:** ${story.status}\n`;
  }
  if (story.figmaNodeLink) {
    section += `- **Figma:** [View Component in Figma](${story.figmaNodeLink})\n`;
  }

  return section;
}

/**
 * Fallback markdown template when LLM formatting fails.
 * Uses simple structure with component name as title.
 */
export function fallbackMarkdown(story: EnrichedStory): string {
  let md = `# ${story.componentRef || story.id}\n\n`;
  md += `${story.content}\n\n`;
  md += buildDesignReferenceSection(story);
  return md;
}

/**
 * Formats story content into structured markdown using Claude Sonnet 4.5.
 * Falls back to template formatting on error.
 */
async function formatStoryWithLLM(
  story: EnrichedStory,
  apiKey: string
): Promise<string> {
  try {
    const client = new Anthropic({ apiKey });

    const prompt = `Restructure the story to comply with the User Story Contract below.
Do not preserve violations.

${USER_STORY_CONTRACT}

You are a technical writer formatting a user story into structured markdown for a development team.

INPUT:
Story Content (flat text):
"""
${story.content}
"""

Component Metadata:
- Name: ${story.componentRef || "N/A"}
- Atomic Design Level: ${story.level || "N/A"}
- Status: ${story.status || "N/A"}

## Output Requirements:

1. Extract/infer clear title (# heading) - user action focused

2. Structure sections in STRICT order:
   ## User Story
   As a/I want/So that format

   ## User-Visible Behavior
   [Plain language - what user sees/does]

   ## Acceptance Criteria
   [Numbered list - ONLY observable outcomes]
   [No technical jargon, component names, or internal IDs]

   ---
   ## Technical Reference

   ### Component Details
   [Component names, events, state]

   ### Implementation Notes
   [Technical details, constraints]

   ### Open Questions
   [If present]

3. DO NOT include in Acceptance Criteria:
   - Internal identifiers (COMP-*, E-*, C-STATE-*)
   - Event names or payloads
   - Prop types
   - Security headers
   - Implementation patterns

4. Use ## for section headers, numbered lists for acceptance criteria

5. Do NOT add:
   - Extra commentary or meta-notes
   - Design Reference section (will be added separately)
   - Any information not in the story content

Return ONLY the formatted markdown, no explanation or preamble.`;

    const startTime = Date.now();
    const response = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const latencyMs = Date.now() - startTime;

    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from LLM");
    }

    // Log story formatter call
    if (isLLMLoggingEnabled()) {
      logLLMCall({
        timestamp: new Date().toISOString(),
        step: "story-formatter",
        model: "sonnet-4.5",
        prompt,
        response: textContent.text,
        tokens: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs,
        metadata: {
          componentRef: story.componentRef,
        },
      });
    }

    return textContent.text;
  } catch (err) {
    // Log error if logging enabled
    if (isLLMLoggingEnabled()) {
      logLLMCall({
        timestamp: new Date().toISOString(),
        step: "story-formatter",
        model: "sonnet-4.5",
        prompt: `Format story ${story.id}`,
        response: "",
        tokens: { input: 0, output: 0, total: 0 },
        latencyMs: 0,
        metadata: {
          componentRef: story.componentRef,
        },
        error: String(err),
      });
    }

    process.stderr.write(
      `Warning: LLM formatting failed for story ${story.id}: ${String(err)}\n`
    );
    return fallbackMarkdown(story);
  }
}

/**
 * Enriches stories with component metadata and image paths.
 * Joins data from SystemWorkflowResultStub, ComponentRow[], PlannedStory[], and image mapping.
 */
export function enrichStories(
  result: SystemWorkflowResultStub,
  componentRows: ComponentRow[],
  plannedStories: PlannedStory[],
  imageMapping: Map<string, string>
): EnrichedStory[] {
  return result.stories.map((story, index) => {
    const planned = plannedStories[index];
    const component = componentRows.find(
      (r) => r.component === planned?.componentRef
    );

    return {
      id: story.id,
      content: story.content ?? "",
      order: planned?.order ?? index + 1,
      componentRef: planned?.componentRef,
      level: planned?.level,
      figmaNodeLink: component?.figmaNodeLink,
      imagePath: planned?.componentRef
        ? imageMapping.get(planned.componentRef)
        : undefined,
      status: component?.status,
    };
  });
}

/**
 * Saves orchestrator-downloaded component images to {outputDir}/assets/.
 * Uses primary image (first in array) per component; writes PNG atomically.
 * Returns mapping of componentRef to relative path for markdown embedding.
 */
export function saveComponentImagesToAssets(
  componentImages: Map<string, ImageInput[]>,
  outputDir: string
): Map<string, string> {
  const assetDir = path.join(outputDir, "assets");
  const mapping = new Map<string, string>();

  try {
    mkdirSync(assetDir, { recursive: true });
  } catch (err) {
    process.stderr.write(
      `Warning: Failed to create assets directory ${assetDir}: ${String(err)}\n`
    );
    return mapping;
  }

  for (const [componentRef, images] of componentImages) {
    if (!images || images.length === 0) {
      process.stderr.write(
        `Warning: No images for component ${componentRef}, skipping asset save\n`
      );
      continue;
    }

    const primary = images[0];
    if (!primary?.base64) {
      process.stderr.write(
        `Warning: Primary image for ${componentRef} has no base64 data, skipping\n`
      );
      continue;
    }

    try {
      const buffer = Buffer.from(primary.base64, "base64");
      const safeName = sanitizeFilename(componentRef);
      const filename = `${safeName}.png`;
      const filePath = path.join(assetDir, filename);
      const tmpPath = `${filePath}.${process.pid}.tmp`;
      writeFileSync(tmpPath, buffer);
      renameSync(tmpPath, filePath);
      mapping.set(componentRef, `../assets/${filename}`);
    } catch (err) {
      process.stderr.write(
        `Warning: Failed to save image for component ${componentRef}: ${String(err)}\n`
      );
    }
  }

  return mapping;
}

/**
 * Generates markdown files for user stories.
 * Main entry point for markdown generation pipeline step.
 * Uses orchestrator-provided componentImages; saves them to assets/ and embeds paths in Design Reference.
 *
 * @param result - SystemWorkflowResult from orchestrator
 * @param componentRows - Parsed component rows from CSV
 * @param plannedStories - Story seeds with ordering
 * @param outputDir - Directory to write markdown files
 * @param apiKey - Anthropic API key for LLM formatting
 * @param componentImages - Map of componentRef to downloaded images (from orchestrator)
 *                          IMPORTANT: Pass the orchestrator-returned map to avoid re-downloading images
 * @returns Generation result with success/failure counts and image stats
 */
export async function generateMarkdownFiles(
  result: SystemWorkflowResultStub,
  componentRows: ComponentRow[],
  plannedStories: PlannedStory[],
  outputDir: string,
  apiKey: string,
  componentImages: Map<string, ImageInput[]>
): Promise<MarkdownGenerationResult> {
  const generationResult: MarkdownGenerationResult = {
    successCount: 0,
    failureCount: 0,
    filesWritten: [],
    imagesDownloaded: 0,
    errors: [],
  };

  // Create output directories
  const storiesDir = path.join(outputDir, "stories");
  try {
    mkdirSync(storiesDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `Failed to create stories directory ${storiesDir}: ${String(err)}`
    );
  }

  // Save orchestrator-downloaded component images to assets/
  const imageMapping = saveComponentImagesToAssets(componentImages, outputDir);
  generationResult.imagesDownloaded = imageMapping.size;

  // Enrich stories with component metadata and image paths
  const enrichedStories = enrichStories(
    result,
    componentRows,
    plannedStories,
    imageMapping
  );

  // Generate markdown file for each story
  for (const story of enrichedStories) {
    try {
      // Format story content with LLM (or fallback)
      const formattedContent = await formatStoryWithLLM(story, apiKey);

      // Append design reference section
      const fullMarkdown = formattedContent + buildDesignReferenceSection(story);

      // Write markdown file atomically
      const filename = generateFilename(story);
      const filePath = path.join(storiesDir, filename);
      const tmpPath = `${filePath}.${process.pid}.tmp`;

      writeFileSync(tmpPath, fullMarkdown, "utf-8");
      renameSync(tmpPath, filePath);

      generationResult.filesWritten.push(filePath);
      generationResult.successCount++;
    } catch (err) {
      generationResult.failureCount++;
      generationResult.errors.push({
        storyId: story.id,
        error: String(err),
        fallbackUsed: true,
      });
      process.stderr.write(
        `Error: Failed to generate markdown for story ${story.id}: ${String(err)}\n`
      );
    }
  }

  return generationResult;
}
