/**
 * LLM-based semantic column mapping for CSV tables.
 * Uses Claude Haiku to identify which columns contain which data types.
 */

import Anthropic from "@anthropic-ai/sdk";
import { logLLMCall, isLLMLoggingEnabled } from "../utils/llm-logger.js";

function sanitizeHeaderForPrompt(header: string): string {
  return header.replace(/["\\\n\r\t]/g, " ").slice(0, 100);
}

/** Column mapping result identifying which header index contains which data type. */
export interface ColumnMapping {
  /** Optional ID column index */
  id?: number;
  /** Component name column index (required) */
  component: number;
  /** Family/group column index (optional) */
  familyGroup?: number;
  /** Level column index (required) */
  level: number;
  /** Dependencies column index (optional) */
  dependencies?: number;
  /** Description column index (optional) */
  description?: number;
  /** Figma node link column index (required) */
  figmaNodeLink: number;
  /** Status column index (optional) */
  status?: number;
}

/** In-memory cache for column mappings. Key: joined headers, Value: mapping */
const mappingCache = new Map<string, ColumnMapping>();

/**
 * Maps CSV column headers to semantic field types using Claude Haiku.
 * Results are cached in memory to avoid redundant API calls.
 *
 * @param headers - Array of column header strings
 * @returns Promise resolving to ColumnMapping
 * @throws Error if LLM fails and fallback cannot determine required fields
 */
export async function mapColumnsByLLM(headers: string[]): Promise<ColumnMapping> {
  const cacheKey = JSON.stringify(headers);

  // Check cache first
  const cached = mappingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Try LLM-based mapping
  try {
    const mapping = await mapWithLLM(headers);
    mappingCache.set(cacheKey, mapping);
    return mapping;
  } catch (err) {
    // If API key is missing, don't fall back - throw immediately
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw err;
    }

    // Fallback to substring matching if LLM fails for other reasons
    const fallback = mapWithFallback(headers);
    if (!fallback) {
      throw new Error(`LLM mapping failed and fallback could not identify required columns: ${String(err)}`);
    }
    mappingCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Uses Claude Haiku to identify column mappings.
 */
async function mapWithLLM(headers: string[]): Promise<ColumnMapping> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required for LLM column mapping");
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Given these CSV column headers, identify which column index (0-based) contains each type of data.
Return ONLY a JSON object with these fields (use null for missing columns):
{
  "id": <index or null>,
  "component": <index>,
  "familyGroup": <index or null>,
  "level": <index>,
  "dependencies": <index or null>,
  "description": <index or null>,
  "figmaNodeLink": <index>,
  "status": <index or null>
}

Required fields: component, level, figmaNodeLink
Column headers: ${JSON.stringify(headers.map(sanitizeHeaderForPrompt))}`;

  const startTime = Date.now();
  const message = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });
  const latencyMs = Date.now() - startTime;

  const responseText =
    message.content.length > 0 && message.content[0].type === "text" ? message.content[0].text : "";

  // Log LLM interaction
  if (isLLMLoggingEnabled()) {
    logLLMCall({
      timestamp: new Date().toISOString(),
      step: "column-mapper",
      model: "haiku",
      prompt,
      response: responseText,
      tokens: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
        total: message.usage.input_tokens + message.usage.output_tokens,
      },
      latencyMs,
    });
  }

  let parsed: Record<string, number | null>;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("Failed to parse LLM response as JSON");
  }

  // Validate required fields
  if (
    typeof parsed.component !== "number" ||
    typeof parsed.level !== "number" ||
    typeof parsed.figmaNodeLink !== "number"
  ) {
    throw new Error("LLM response missing required fields (component, level, figmaNodeLink)");
  }

  const optionalFields = ["id", "familyGroup", "dependencies", "description", "status"] as const;
  for (const field of optionalFields) {
    if (
      parsed[field] !== null &&
      parsed[field] !== undefined &&
      typeof parsed[field] !== "number"
    ) {
      throw new Error(
        `LLM response field '${field}' must be a number or null, got ${typeof parsed[field]}`
      );
    }
  }

  return {
    id: parsed.id ?? undefined,
    component: parsed.component,
    familyGroup: parsed.familyGroup ?? undefined,
    level: parsed.level,
    dependencies: parsed.dependencies ?? undefined,
    description: parsed.description ?? undefined,
    figmaNodeLink: parsed.figmaNodeLink,
    status: parsed.status ?? undefined,
  };
}

/**
 * Fallback substring-based column mapping.
 * Returns null if required fields cannot be identified.
 */
function mapWithFallback(headers: string[]): ColumnMapping | null {
  const lower = headers.map((h) => h.toLowerCase());

  const component = lower.findIndex((h) => h.includes("component") || h.includes("name"));
  const level = lower.findIndex((h) => h.includes("level") || h.includes("tier"));
  const figmaNodeLink = lower.findIndex(
    (h) => h.includes("figma") || h.includes("link") || h.includes("url")
  );

  // Must have required fields
  if (component === -1 || level === -1 || figmaNodeLink === -1) {
    return null;
  }

  const mapping: ColumnMapping = {
    component,
    level,
    figmaNodeLink,
  };

  // Add optional fields only if found
  const idIndex = lower.findIndex((h) => h === "id" || h.includes("identifier"));
  if (idIndex >= 0) mapping.id = idIndex;

  const familyIndex = lower.findIndex((h) => h.includes("family") || h.includes("group"));
  if (familyIndex >= 0) mapping.familyGroup = familyIndex;

  const depIndex = lower.findIndex((h) => h.includes("depend") || h.includes("require"));
  if (depIndex >= 0) mapping.dependencies = depIndex;

  const descIndex = lower.findIndex((h) => h.includes("desc") || h.includes("detail"));
  if (descIndex >= 0) mapping.description = descIndex;

  const statusIndex = lower.findIndex((h) => h.includes("status") || h.includes("state"));
  if (statusIndex >= 0) mapping.status = statusIndex;

  return mapping;
}

/**
 * Clears the in-memory cache. Useful for testing.
 */
export function clearCache(): void {
  mappingCache.clear();
}
