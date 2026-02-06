/**
 * Pipeline orchestrator: ComponentRow[] → UserStoryAgent (vision or text-only).
 * Converts CSV rows to planned stories, optionally downloads Figma screenshots,
 * and runs the system workflow with or without mockupImages.
 */

import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import type { ComponentRow } from "../figma/table-parser.js";
import type {
  ImageInput,
  OrchestratorOptions,
  OrchestratorResult,
  SystemWorkflowResultStub,
  FunctionalDiscoveryBrief,
} from "./types.js";
import { FunctionalDiscoveryBriefSchema } from "./types.js";
import { USER_STORY_CONTRACT } from "../prompts/figma-intake/user-story-contract.js";
import { USER_STORY_SYSTEM_PROMPT } from "../prompts/figma-intake/system.js";
import type { ImageBlockParam } from "@anthropic-ai/sdk/resources";
import Anthropic from "@anthropic-ai/sdk";
import { logLLMCall, isLLMLoggingEnabled } from "../utils/llm-logger.js";
import { computeHash, formatAge } from "../cache/figma-image-cache.js";

/**
 * Converts ImageBlockParam[] from autoDetectFigmaComponents to ImageInput[]
 * for UserStoryAgent mockupImages (base64 or url source).
 */
export function imageBlockParamsToImageInputs(
  blocks: ImageBlockParam[]
): ImageInput[] {
  return blocks.map((block) => {
    const src = block.source;
    if (src.type === "base64") {
      return {
        base64: src.data,
        mediaType: src.media_type,
      };
    }
    return { url: src.url };
  });
}

/**
 * Extracts JSON from response text that might have markdown fences.
 * Handles both plain JSON and ```json ... ``` wrapped JSON.
 */
function extractJSON(text: string): string {
  // Remove markdown code fences if present
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  return text.trim();
}

/**
 * Helper to convert ImageInput to Claude API format.
 */
function prepareImageBlock(img: ImageInput): ImageBlockParam {
  if (img.base64) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: (img.mediaType as "image/png" | "image/jpeg" | "image/webp" | "image/gif") || "image/png",
        data: img.base64,
      },
    };
  }
  throw new Error("Only base64 images are supported for vision analysis");
}

/**
 * Helper to call Claude API with vision support.
 */
async function callClaudeVision(params: {
  apiKey: string;
  prompt: string;
  images: ImageBlockParam[];
  maxTokens: number;
  temperature: number;
}): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number }; latencyMs: number }> {
  const anthropic = new Anthropic({ apiKey: params.apiKey });

  const content: Array<
    { type: "text"; text: string } | ImageBlockParam
  > = [...params.images, { type: "text", text: params.prompt }];

  const startTime = Date.now();
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });
  const latencyMs = Date.now() - startTime;

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return {
    text: textContent.text,
    usage: response.usage,
    latencyMs,
  };
}

/**
 * Builds the Pass 0 prompt for Functional Discovery.
 */
function buildFunctionalDiscoveryPrompt(row: ComponentRow, imageCount: number): string {
  return `This functional discovery is reference material.
All user stories generated from it MUST obey the User Story Contract below.

${USER_STORY_CONTRACT}

Extract functional information needed for React implementation, but mark confidence:
- observed: Clearly visible in mockup
- inferred: Reasonable assumption from visual cues
- unknown: Insufficient information

Err toward "unknown" rather than inventing precision.

You are a senior front-end engineer / product analyst looking at this mockup for the first time.

PRIMARY COMPONENT: ${row.component}
Component Family: ${row.familyGroup}
Component Level: ${row.level}
${row.description ? `Designer's Description: ${row.description}` : ""}

You will see ${imageCount} image(s):
- Image 1: PRIMARY component (focus your analysis here)
${imageCount > 1 ? `- Images 2-${imageCount}: CONTEXT from same family (reference for patterns)` : ""}

PRIMARY FOCUS: User actions and outcomes
SECONDARY: State transitions that affect user experience
AVOID: Over-architecting prop lists or event schemas not visible in mockup

Your task: Extract functional and behavioral information needed for React implementation and user story writing. Prefer user-observable behavior; mark what is observed vs inferred vs unknown.

For likelyProps and likelyEvents:
- Focus on WHAT needs to happen (behavior), not precise signatures
- Mark propType/signature as "unknown" if not observable
- These inform Technical Reference section, not user story narrative

**CRITICAL RULE: Ignore style UNLESS it encodes state, hierarchy, affordance, or constraint.**
Examples of functional styling:
- "looks disabled" (grayed out, reduced opacity)
- "looks selected" (highlighted, different background)
- "primary action" (visual emphasis suggests importance)
- "suggests error" (red border, warning icon)
- "suggests menu/popover" (dropdown affordance)
- "destructive action" (red coloring on delete button)

We're banning design critique ("this could look better"), not perception.

Output valid JSON with this structure (all fields required unless marked optional):

{
  "classification": {
    "canonicalNameSuggestion": string,
    "csvName": string (optional),
    "componentType": "atom|molecule|organism|screen",
    "uiCategory": "button|input|form|modal|list|navigation|other",
    "boundaries": string,
    "basis": "observed|inferred"
  },
  "userActions": [{ action, trigger, emittedEvent (string or "unknown"), outcome, basis }],
  "stateModel": {
    "states": [{ state, basis }],
    "transitions": [{ from, to, trigger, basis }],
    "dataRequirements": [string]
  },
  "dataContract": {
    "likelyProps": [{ propName, propType (string or "unknown"), purpose, required (boolean or "unknown"), basis }],
    "likelyEvents": [{ eventName, signature (string or "unknown"), purpose, basis }]
  },
  "accessibility": {
    "ariaRole": string or "unknown",
    "keyboardNav": [string],
    "screenReaderExpectations": string,
    "focusManagement": string,
    "basis": "observed|inferred|standard-pattern"
  },
  "edgeCases": [{ case, basis }],
  "assumptionsAndQuestions": {
    "assumptions": [{ assumption, reasoning }],
    "openQuestions": [string]
  },
  "evidenceAnchors": {
    "primaryImage": string,
    "contextImages": [string],
    "confidence": "high|medium|low"
  },
  "warnings": [string],
  "rawMentions": [string] (optional)
}

Example patterns (generic):
- States: [{ state: "default", basis: "observed" }, { state: "hover", basis: "observed" }, { state: "error", basis: "inferred" }]
- Props: { propName: "variant", propType: "'primary' | 'secondary'" OR "unknown", purpose: "...", required: true, basis: "inferred" }
- Unknown: Use "unknown" when signature/type/role unclear from visual

CRITICAL: Confidence markers (observed/inferred/unknown) are ONLY for Technical Reference section.

NEVER include in user-facing sections:
- "This behavior is inferred from..."
- "Based on the mockup, we assume..."
- "Confidence: medium"

Write user-facing sections with certainty. Reserve hedging for Technical Reference.

**Rules:**
1. Mark each field with basis: "observed" (seen in mockup) vs "inferred" (reasonable assumption)
2. Use "unknown" when uncertain - DON'T INVENT PRECISION
3. Populate openQuestions - explicit unknowns prevent hallucination
4. Use warnings array for "this is unclear" without breaking schema
5. Be specific about React details (props, events, state) but mark inferred ones
6. Ignore visual style UNLESS it indicates functional state (see examples above)
7. Output ONLY valid JSON, no markdown fences, no additional text`;
}

/**
 * Converts Functional Discovery Brief to human-readable seed text.
 * CRITICAL: Preserve observed/inferred/unknown signals so Pass 1 knows what's solid vs assumed.
 * This seed + images will be sent to Pass 1 story generation.
 */
function formatBriefAsSeed(brief: FunctionalDiscoveryBrief): string {
  const observedStates = brief.stateModel.states
    .filter((s) => s.basis === "observed")
    .map((s) => s.state)
    .join(", ");
  const inferredStates = brief.stateModel.states
    .filter((s) => s.basis === "inferred")
    .map((s) => s.state)
    .join(", ");

  const observedEdgeCases = brief.edgeCases
    .filter((e) => e.basis === "observed")
    .map((e) => e.case)
    .join("; ");
  const inferredEdgeCases = brief.edgeCases
    .filter((e) => e.basis === "inferred")
    .map((e) => e.case)
    .join("; ");

  return `# Functional Discovery Brief: ${brief.classification.canonicalNameSuggestion}

## Classification
- Type: ${brief.classification.componentType} | Category: ${brief.classification.uiCategory}
- Boundaries: ${brief.classification.boundaries}
- Basis: ${brief.classification.basis}

## User Actions
${brief.userActions.map((a) => `- ${a.action} → ${a.outcome} (${a.emittedEvent}) [${a.basis}]`).join("\n")}

## State Model
**Observed states:** ${observedStates || "None"}
**Inferred states:** ${inferredStates || "None"}
Data Requirements: ${brief.stateModel.dataRequirements.join(", ") || "None"}

## Props & Events
**Props:**
${brief.dataContract.likelyProps
  .map(
    (p) =>
      `- ${p.propName}: ${p.propType} ${
        p.required === "unknown"
          ? "[unknown if required]"
          : p.required
            ? "[required]"
            : "[optional]"
      } [${p.basis}]`
  )
  .join("\n")}

**Events:**
${brief.dataContract.likelyEvents
  .map(
    (e) =>
      `- ${e.eventName}${e.signature !== "unknown" ? ": " + e.signature : " [signature unknown]"} [${e.basis}]`
  )
  .join("\n")}

## Accessibility
- Role: ${brief.accessibility.ariaRole} [${brief.accessibility.basis}]
- Keyboard: ${brief.accessibility.keyboardNav.join(", ")}
- Screen Reader: ${brief.accessibility.screenReaderExpectations}

## Edge Cases
**Observed:** ${observedEdgeCases || "None"}
**Inferred:** ${inferredEdgeCases || "None"}

## Assumptions & Open Questions
**Assumptions:**
${brief.assumptionsAndQuestions.assumptions.map((a) => `- ${a.assumption} (${a.reasoning})`).join("\n")}

**Open Questions (must be addressed in story or flagged for PM):**
${brief.assumptionsAndQuestions.openQuestions.map((q) => `- ${q}`).join("\n")}

${brief.warnings.length > 0 ? `## Warnings\n${brief.warnings.map((w) => `⚠️ ${w}`).join("\n")}\n` : ""}

---
STORY WRITING INSTRUCTIONS:

Use this information as reference only.
User-facing sections MUST obey the User Story Contract below.

${USER_STORY_CONTRACT}

Use this functional discovery as REFERENCE, not as template.

TOP HALF (User Story + Behavior + Acceptance Criteria):
- Use ONLY product/user language
- Describe what user sees, does, experiences
- NO component names, event names, state variables
- Acceptance criteria = observable outcomes ONLY

BOTTOM HALF (Technical Reference - separate section):
- Component details, events, state
- Reference IDs from System Context
- Implementation constraints

Preserve observed vs inferred signals as confidence markers in Technical Reference.
`;
}

/**
 * Builds the full Pass 1 story-generation seed: system prompt + brief.
 * The agent receives this as the single seed string (with images).
 */
function buildStoryGenerationSeed(brief: FunctionalDiscoveryBrief): string {
  const briefContent = formatBriefAsSeed(brief);
  return `${USER_STORY_SYSTEM_PROMPT}

---
## Functional discovery (reference)

Generate a user story based on this functional analysis and the provided mockup images. Do not copy confidence markers (e.g. [observed], [inferred]) or technical field names into user-facing sections.

${briefContent}`;
}

/**
 * Clean up story content to ensure contract compliance.
 * Removes JSON wrappers, explanatory text, and fixes section violations.
 */
function cleanupStoryContent(content: string): string {
  let cleaned = content;

  // Check if content has JSON wrapper with story inside
  const jsonMatch = cleaned.match(/```json\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);

      // If it's a wrapped story object, reconstruct markdown from JSON
      if (parsed.enhancedStory) {
        const story = parsed.enhancedStory;
        const techRef = parsed.technicalReference || {};

        // Build markdown from JSON structure
        let markdown = `# ${story.userStory?.split(',')[0]?.replace('As a ', '') || 'Component Story'}\n\n`;
        markdown += `## User Story\n${story.userStory || ''}\n\n`;
        markdown += `## User-Visible Behavior\n${story.userVisibleBehavior || ''}\n\n`;
        markdown += `## Acceptance Criteria\n`;
        if (Array.isArray(story.acceptanceCriteria)) {
          story.acceptanceCriteria.forEach((criteria: string, i: number) => {
            markdown += `${i + 1}. ${criteria}\n`;
          });
        }
        markdown += `\n---\n## Technical Reference\n\n`;

        // Add technical details
        if (techRef.componentDetails) {
          markdown += `### Component Details\n`;
          const details = techRef.componentDetails;
          if (details.type) markdown += `- Type: ${details.type}\n`;
          if (details.observedStates) markdown += `- States: ${details.observedStates.join(', ')}\n`;
          if (details.requiredProps) markdown += `- Props: ${details.requiredProps.join(', ')}\n`;
          markdown += '\n';
        }

        if (techRef.implementationNotes && Array.isArray(techRef.implementationNotes)) {
          markdown += `### Implementation Notes\n`;
          techRef.implementationNotes.forEach((note: string) => markdown += `- ${note}\n`);
          markdown += '\n';
        }

        if (techRef.openQuestions && Array.isArray(techRef.openQuestions)) {
          markdown += `### Open Questions\n`;
          techRef.openQuestions.forEach((q: string) => markdown += `- ${q}\n`);
          markdown += '\n';
        }

        // Extract Pass 2b sections (UI Mapping, Contract Dependencies, Ownership)
        const uiMappingMatch = content.match(/(## UI Mapping[\s\S]*)/);
        if (uiMappingMatch) {
          markdown += uiMappingMatch[1];
        }

        cleaned = markdown;
      } else {
        // JSON but not wrapped story, just remove the fences
        cleaned = cleaned.replace(/```json\s*\n([\s\S]*?)\n```/, '$1');
      }
    } catch (e) {
      // Not valid JSON, just remove the fences
      cleaned = cleaned.replace(/```json\s*\n([\s\S]*?)\n```/, '');
    }
  }

  // Remove explanatory preamble (e.g., "I'll craft a user story...")
  if (cleaned.includes('# ')) {
    cleaned = cleaned.replace(/^.*?(?=# )/s, '');
  } else {
    // No title found - story generation may have failed
    // Check if it's ONLY Pass 2b sections (UI Mapping, etc.)
    if (cleaned.startsWith('# UI Mapping') || cleaned.startsWith('## UI Mapping')) {
      // Only Pass 2b sections, add warning
      cleaned = `<!-- WARNING: Story generation incomplete - only contract sections present -->\n\n` + cleaned;
    } else {
      // Remove preamble before any content
      cleaned = cleaned.replace(/^[^#]*/, '');
    }
  }

  // Remove trailing commentary after the story ends
  const uiMappingIndex = cleaned.indexOf('## UI Mapping');
  if (uiMappingIndex > 0) {
    const beforeUIMapping = cleaned.substring(0, uiMappingIndex);
    // Remove commentary paragraphs like "Key aspects of this user story:"
    const cleanedBefore = beforeUIMapping.replace(/\n\n(?:Key aspects|The story|This story)[\s\S]*?$/, '\n\n');
    cleaned = cleanedBefore + cleaned.substring(uiMappingIndex);
  }

  // Fix: Move "System Acceptance Criteria" into Technical Reference
  if (cleaned.includes('## System Acceptance Criteria')) {
    const lines = cleaned.split('\n');
    const systemCriteriaStart = lines.findIndex(l => l.trim() === '## System Acceptance Criteria');

    if (systemCriteriaStart >= 0) {
      // Find the end of System Acceptance Criteria section
      let systemCriteriaEnd = systemCriteriaStart + 1;
      while (systemCriteriaEnd < lines.length && !lines[systemCriteriaEnd].startsWith('##')) {
        systemCriteriaEnd++;
      }

      // Extract the criteria
      const criteriaLines = lines.slice(systemCriteriaStart + 1, systemCriteriaEnd);

      // Remove from original location
      lines.splice(systemCriteriaStart, systemCriteriaEnd - systemCriteriaStart);

      // Find Technical Reference section or create it before UI Mapping
      const techRefIndex = lines.findIndex(l => l.trim() === '## Technical Reference');
      if (techRefIndex < 0) {
        // Insert before UI Mapping
        const uiMappingIdx = lines.findIndex(l => l.trim() === '## UI Mapping');
        if (uiMappingIdx >= 0) {
          lines.splice(uiMappingIdx, 0, '---', '## Technical Reference', '', '### System Requirements', ...criteriaLines, '');
        }
      } else {
        // Insert as first subsection under Technical Reference
        lines.splice(techRefIndex + 1, 0, '', '### System Requirements', ...criteriaLines);
      }

      cleaned = lines.join('\n');
    }
  }

  // Ensure proper spacing
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Run Pass 0: Functional Discovery Brief.
 * Extracts implementation-relevant information from component images.
 * Returns structured JSON brief for use as seed in Pass 1.
 */
async function createFunctionalDiscoveryBrief(
  row: ComponentRow,
  images: ImageInput[],
  apiKey: string
): Promise<FunctionalDiscoveryBrief> {
  // Construct Pass 0 prompt
  const prompt = buildFunctionalDiscoveryPrompt(row, images.length);

  // Prepare multi-modal message
  const imageBlocks = images.map((img) => prepareImageBlock(img));

  // Call Claude with vision
  const response = await callClaudeVision({
    apiKey,
    prompt,
    images: imageBlocks,
    maxTokens: 3000,
    temperature: 0.3,
  });

  // Log Pass 0 vision call
  if (isLLMLoggingEnabled()) {
    logLLMCall({
      timestamp: new Date().toISOString(),
      step: "pass0-vision",
      model: "sonnet-4.5",
      prompt,
      response: response.text,
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      latencyMs: response.latencyMs,
      metadata: {
        componentRef: row.component,
        imageCount: images.length,
      },
    });
  }

  // Parse JSON response (with repair if needed)
  let brief: FunctionalDiscoveryBrief;
  try {
    brief = JSON.parse(extractJSON(response.text));
  } catch (parseError) {
    // JSON parse failed - run automatic repair pass
    console.log(`[Pipeline]   JSON parse failed, running repair pass`);

    const repairResponse = await callClaudeVision({
      apiKey,
      prompt: `The following JSON output is almost valid but has a parsing error. Return corrected JSON that conforms to the schema, preserving all information:\n\n${response.text}`,
      images: [],
      maxTokens: 3000,
      temperature: 0.1,
    });

    // Log repair call
    if (isLLMLoggingEnabled()) {
      logLLMCall({
        timestamp: new Date().toISOString(),
        step: "pass0-repair",
        model: "sonnet-4.5",
        prompt: `Repair JSON for ${row.component}`,
        response: repairResponse.text,
        tokens: {
          input: repairResponse.usage.input_tokens,
          output: repairResponse.usage.output_tokens,
          total: repairResponse.usage.input_tokens + repairResponse.usage.output_tokens,
        },
        latencyMs: repairResponse.latencyMs,
        metadata: {
          componentRef: row.component,
          repairAttempt: true,
        },
      });
    }

    brief = JSON.parse(extractJSON(repairResponse.text));
  }

  // Validate schema
  return FunctionalDiscoveryBriefSchema.parse(brief);
}

/**
 * Orchestrates the full pipeline: adapter → optional Figma download → agent workflow.
 *
 * 1. Converts rows to planned stories via adaptComponentRowsToPlannedStories.
 * 2. If figmaToken and figmaUrl are set, calls autoDetectFigmaComponents and
 *    converts images to ImageInput[] (vision mode). Otherwise mockupImages is
 *    undefined (text-only mode).
 * 3. Initializes UserStoryAgent with mockupImages and runs runSystemWorkflow(seeds).
 *
 * @param rows - ComponentRow array from table parser (includes figmaNodeLink).
 * @param options - apiKey, optional figmaUrl/figmaToken, required deps.
 * @returns SystemWorkflowResult from the agent.
 */
/**
 * Process ONE component at a time with its PRIMARY image + optional CONTEXT images.
 * Downloads ONLY the specific node from each Figma link (not entire file).
 * Returns images only - seed generation moved to Pass 0.
 */
async function processComponentWithImages(
  row: ComponentRow,
  _figmaUrl: string,
  figmaToken: string,
  familyRows: ComponentRow[],
  _deps: OrchestratorOptions["deps"],
  cache?: import("../cache/figma-image-cache.js").FigmaImageCache
): Promise<{ images: ImageInput[] }> {
  const images: ImageInput[] = [];

  // Download PRIMARY image - extract node ID from CSV link
  if (row.figmaNodeLink && row.figmaNodeLink.includes("figma.com")) {
    try {
      // Import functions directly here since they're not in deps
      const { extractFigmaInfo, downloadFigmaScreenshot } = await import(
        "../utils/figma-utils.js"
      );
      const imageUtils = await import("../utils/image-utils.js");

      const figmaInfo = extractFigmaInfo(row.figmaNodeLink);
      if (figmaInfo.isValid && figmaInfo.nodeId) {
        // Check cache first
        const cached = cache ? await cache.get(row.component) : null;

        if (cached) {
          // Cache hit - load from disk
          const cacheAge = Date.now() - new Date(cached.downloadedAt).getTime();
          console.log(`[Pipeline]   Using cached image for ${row.component} (age: ${formatAge(cacheAge)})`);

          const fullPath = path.join(cache!.config.cacheDir, cached.imagePath);
          const buffer = readFileSync(fullPath);

          images.push({
            base64: buffer.toString("base64"),
            mediaType: "image/png",
          });
        } else {
          // Cache miss - download and save
          const buffer = await downloadFigmaScreenshot(figmaInfo.fileKey, figmaInfo.nodeId, figmaToken);
          const imageBlock = await imageUtils.prepareImageForClaude({
            base64: buffer.toString("base64"),
            mediaType: "image/png",
          });

          images.push({
            base64:
              imageBlock.source.type === "base64" ? imageBlock.source.data : undefined,
            mediaType:
              imageBlock.source.type === "base64"
                ? imageBlock.source.media_type
                : "image/png",
          });

          console.log(`[Pipeline]   Downloaded PRIMARY image for ${row.component}`);

          // Save to cache
          if (cache) {
            try {
              const hash = computeHash(buffer);
              const imagePath = `images/${row.component}-${hash}.png`;
              const fullPath = path.join(cache.config.cacheDir, imagePath);

              mkdirSync(path.dirname(fullPath), { recursive: true });
              writeFileSync(fullPath, buffer);

              await cache.set(row.component, {
                nodeId: figmaInfo.nodeId,
                fileKey: figmaInfo.fileKey,
                hash,
                imagePath,
                downloadedAt: new Date().toISOString(),
                fileSize: buffer.length,
              });

              console.log(`[Pipeline]   Cached image for ${row.component} (${buffer.length} bytes)`);
            } catch (cacheErr) {
              console.warn(`[Pipeline]   Failed to cache image: ${String(cacheErr)}`);
              // Non-fatal - continue with downloaded image
            }
          }
        }
      }
    } catch (error) {
      console.log(`[Pipeline]   Failed to download PRIMARY image: ${String(error)}`);
    }
  }

  // Download up to 3 CONTEXT images from same family
  for (const familyRow of familyRows.slice(0, 3)) {
    if (familyRow.figmaNodeLink && familyRow.figmaNodeLink.includes("figma.com")) {
      try {
        const { extractFigmaInfo, downloadFigmaScreenshot } = await import(
          "../utils/figma-utils.js"
        );
        const imageUtils = await import("../utils/image-utils.js");

        const figmaInfo = extractFigmaInfo(familyRow.figmaNodeLink);
        if (figmaInfo.isValid && figmaInfo.nodeId) {
          // Check cache for context image
          const cached = cache ? await cache.get(familyRow.component) : null;

          if (cached) {
            const cacheAge = Date.now() - new Date(cached.downloadedAt).getTime();
            console.log(`[Pipeline]   Using cached CONTEXT image for ${familyRow.component} (age: ${formatAge(cacheAge)})`);

            const fullPath = path.join(cache!.config.cacheDir, cached.imagePath);
            const buffer = readFileSync(fullPath);

            images.push({
              base64: buffer.toString("base64"),
              mediaType: "image/png",
            });
          } else {
            const buffer = await downloadFigmaScreenshot(figmaInfo.fileKey, figmaInfo.nodeId, figmaToken);
            const imageBlock = await imageUtils.prepareImageForClaude({
              base64: buffer.toString("base64"),
              mediaType: "image/png",
            });

            images.push({
              base64:
                imageBlock.source.type === "base64" ? imageBlock.source.data : undefined,
              mediaType:
                imageBlock.source.type === "base64"
                  ? imageBlock.source.media_type
                  : "image/png",
            });

            console.log(`[Pipeline]   Downloaded CONTEXT image for ${familyRow.component}`);

            // Save context image to cache
            if (cache) {
              try {
                const hash = computeHash(buffer);
                const imagePath = `images/${familyRow.component}-${hash}.png`;
                const fullPath = path.join(cache.config.cacheDir, imagePath);

                mkdirSync(path.dirname(fullPath), { recursive: true });
                writeFileSync(fullPath, buffer);

                await cache.set(familyRow.component, {
                  nodeId: figmaInfo.nodeId,
                  fileKey: figmaInfo.fileKey,
                  hash,
                  imagePath,
                  downloadedAt: new Date().toISOString(),
                  fileSize: buffer.length,
                });
              } catch (cacheErr) {
                console.warn(`[Pipeline]   Failed to cache CONTEXT image: ${String(cacheErr)}`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`[Pipeline]   Failed to download CONTEXT image for ${familyRow.component}`);
      }
    }
  }

  return { images };
}

export async function orchestrate(
  rows: ComponentRow[],
  options: OrchestratorOptions
): Promise<OrchestratorResult> {
  const { apiKey, figmaUrl, figmaToken, deps, cache } = options;

  // Initialize cache if provided
  if (cache) {
    await cache.init();
    console.log(`[Pipeline] Cache initialized: ${cache.config.cacheDir}`);
  }

  console.log(`[Pipeline] Processing ${rows.length} components with Functional Discovery`);

  const componentImages = new Map<string, ImageInput[]>();

  const outputDir = options.outputDir;
  if (outputDir) {
    mkdirSync(outputDir, { recursive: true });
  }

  const allStories: Array<{
    id: string;
    content?: string | null;
    filepath?: string;
    hasTechnicalRef?: boolean;
    structure?: unknown;
    interconnections: unknown;
    judgeResults?: unknown;
    needsManualReview?: { reason: string; score: number };
  }> = [];

  // Process each component individually
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`[Pipeline] [${i + 1}/${rows.length}] ${row.component}`);

    // Get family members for potential context images
    const familyRows = rows.filter(
      (r) => r.familyGroup === row.familyGroup && r.component !== row.component
    );

    // Download images (PRIMARY + max 3 CONTEXT) - only if vision enabled
    let images: ImageInput[] = [];
    if (figmaUrl && figmaToken) {
      const result = await processComponentWithImages(
        row,
        figmaUrl,
        figmaToken,
        familyRows.slice(0, 3),
        deps,
        cache
      );
      images = result.images;
    }
    componentImages.set(row.component, images);

    // Pass 0: Functional Discovery Brief
    if (images.length === 0 || !figmaToken) {
      // HARD FAILURE: Missing visual evidence
      console.log(`[Pipeline]   ❌ No images for ${row.component} - creating stub`);

      const stubContent = `# MISSING EVIDENCE: ${row.component}

Story stub created because no Figma images could be retrieved for this component.

CSV: ${row.id || "N/A"} | ${row.familyGroup} | ${row.level}
Description: ${row.description || "N/A"}
Figma Link: ${row.figmaNodeLink || "N/A"}

ACTION REQUIRED: Provide mockup images and re-run pipeline.`;
      const stubId = row.component;
      const stubFilename = stubId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const stubFilepath = outputDir ? `${outputDir}/${stubFilename}.md` : undefined;
      if (stubFilepath) {
        writeFileSync(stubFilepath, stubContent);
        allStories.push({
          id: stubId,
          content: null,
          filepath: stubFilepath,
          hasTechnicalRef: false,
          interconnections: {},
          needsManualReview: { reason: "Missing visual evidence", score: 0 },
        });
      } else {
        allStories.push({
          id: stubId,
          content: stubContent,
          interconnections: {},
          needsManualReview: { reason: "Missing visual evidence", score: 0 },
        });
      }

      continue; // Skip to next component
    }

    // Pass 0: Functional Discovery with images
    console.log(`[Pipeline]   Pass 0: Functional Discovery (${images.length} images)`);

    const brief = await createFunctionalDiscoveryBrief(row, images, apiKey);

    // Convert brief to structured seed text (system prompt + brief)
    const seed = buildStoryGenerationSeed(brief);

    console.log(
      `[Pipeline]   Brief: ${brief.userActions.length} actions, ${brief.stateModel.states.length} states, ${brief.warnings.length} warnings`
    );

    // Pass 1: Story generation with SAME images + brief as seed
    const agent = new deps.UserStoryAgent({
      mode: "system-workflow",
      apiKey,
      mockupImages: images.length > 0 ? images : undefined, // RE-SEND images!
      productContext: {
        productName: row.familyGroup || "Component Library",
        productType: "web",
        clientInfo: "Internal design system",
        targetAudience: "Development team",
        keyFeatures: ["Component reusability", "Design consistency"],
        businessContext: "Figma component library translation to user stories",
      },
    });

    const result = await agent.runSystemWorkflow([seed]);
    if (outputDir && result.stories.length > 0) {
      for (const story of result.stories) {
        // Only save if story has content
        if (story.content) {
          // ALWAYS use component name for consistent filenames
          const storyId = row.component;
          const filename = storyId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const filepath = `${outputDir}/${filename}.md`;

          // Clean up story content before saving
          const cleanedContent = cleanupStoryContent(story.content);
          writeFileSync(filepath, cleanedContent);

          allStories.push({
            id: storyId,
            content: null,
            filepath,
            hasTechnicalRef: cleanedContent.includes("## Technical Reference"),
            structure: story.structure,
            interconnections: story.interconnections,
            judgeResults: story.judgeResults,
            needsManualReview: story.needsManualReview,
          });
        }
      }
    } else {
      allStories.push(...result.stories);
    }
  }

  const result: SystemWorkflowResultStub = {
    stories: allStories,
    systemContext: {
      components: [],
      componentGraph: {},
      sharedContracts: {},
      stateModels: {},
      standardStates: {},
      events: {},
      mentions: { components: [], stateModels: [], events: [] },
    },
    relationships: [],
    consistencyReport: { issues: [], fixes: [] },
    metadata: {
      passesCompleted: ["pass0-functional-discovery", "pass1-story-generation"],
      refinementRounds: 0,
      fixesApplied: 0,
      fixesFlaggedForReview: 0,
      totalComponents: rows.length,
    },
  };

  // Log cache statistics
  if (cache) {
    const stats = cache.getStats();
    const hitRate = stats.cacheHits + stats.cacheMisses > 0
      ? Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)
      : 0;
    console.log(
      `[Cache] Summary: ${stats.cacheHits} hits (${hitRate}%), ${stats.cacheMisses} downloads, ${stats.cacheHits * 2} API calls saved`
    );
  }

  return { result, componentImages };
}

/**
 * @deprecated Legacy stub for CLI compatibility (TICKET 5 will update CLI to use orchestrate).
 * Generates minimal story stubs from ComponentRow[] without vision support.
 */
export function generateStories(
  rows: ComponentRow[]
): Array<{ id: string; title: string; description: string; acceptanceCriteria: string[] }> {
  return rows.map((row) => ({
    id: row.id || row.component,
    title: row.component,
    description: row.description || `Component: ${row.component}`,
    acceptanceCriteria: [],
  }));
}
