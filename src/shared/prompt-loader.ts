/**
 * Iteration prompt loader
 *
 * Loads workflow iteration prompts from markdown files with YAML frontmatter.
 * This is separate from the skill loader (which loads Anthropic Agent Skills from SKILL.md).
 */

import { readdir, readFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { parseFrontmatter } from './frontmatter.js';
import { ITERATION_CATEGORIES, PATCH_PATHS } from './types.js';
import type { IterationCategory, PatchPath } from './types.js';

/**
 * Metadata for an iteration prompt (from frontmatter).
 * Required: id, name, description, category, order.
 */
export interface IterationPromptMetadata {
  id: string;
  name: string;
  description: string;
  category: IterationCategory;
  order: number;
  applicableWhen?: string;
  /** Product types this iteration applies to, or 'all' */
  applicableTo?: 'all' | string[];
  allowedPaths?: PatchPath[];
  outputFormat?: string;
  supportsVision?: boolean;
}

/**
 * A loaded iteration prompt with parsed metadata and prompt body.
 */
export interface LoadedIterationPrompt {
  metadata: IterationPromptMetadata;
  prompt: string;
}

const VALID_PATCH_PATHS = new Set<string>(PATCH_PATHS);

function isValidCategory(value: string): value is IterationCategory {
  return (ITERATION_CATEGORIES as readonly string[]).includes(value);
}

function parseApplicableTo(value: unknown): 'all' | string[] {
  if (value === 'all' || value === undefined) {
    return 'all';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'all') return 'all';
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).length > 0 ? value.map(String) : 'all';
  }
  return 'all';
}

/**
 * Parses allowedPaths from frontmatter. Supports comma-separated string
 * (e.g. "story.asA, story.iWant") since the simple frontmatter parser returns string | number.
 */
function parseAllowedPaths(value: unknown): PatchPath[] | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    const parts = value.split(',').map((s) => s.trim()).filter(Boolean);
    const valid: PatchPath[] = [];
    for (const p of parts) {
      if (VALID_PATCH_PATHS.has(p)) {
        valid.push(p as PatchPath);
      }
    }
    return valid.length > 0 ? valid : undefined;
  }
  if (Array.isArray(value)) {
    const valid = (value as unknown[]).filter((v) => typeof v === 'string' && VALID_PATCH_PATHS.has(v)) as PatchPath[];
    return valid.length > 0 ? valid : undefined;
  }
  return undefined;
}

function parseSupportsVision(value: unknown): boolean {
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  if (typeof value === 'number') return value !== 0;
  return false;
}

/**
 * Validates required frontmatter fields and normalizes metadata.
 * @throws Error if required fields are missing or invalid
 */
function validateAndNormalize(
  data: Record<string, string | number>,
  filePath: string
): IterationPromptMetadata {
  const required = ['id', 'name', 'description', 'category', 'order'];
  for (const key of required) {
    if (data[key] === undefined || data[key] === '') {
      throw new Error(`Missing required field "${key}" in ${filePath}`);
    }
  }

  const id = String(data.id).trim();
  const name = String(data.name).trim();
  const description = String(data.description).trim();
  const categoryRaw = String(data.category).trim();
  if (!isValidCategory(categoryRaw)) {
    throw new Error(
      `Invalid category "${categoryRaw}" in ${filePath}. Must be one of: ${ITERATION_CATEGORIES.join(', ')}`
    );
  }
  const category = categoryRaw as IterationCategory;
  const order = typeof data.order === 'number' ? data.order : Number(data.order);
  if (Number.isNaN(order)) {
    throw new Error(`Invalid order (must be a number) in ${filePath}`);
  }

  const applicableTo = parseApplicableTo(data.applicableTo);

  const allowedPaths = parseAllowedPaths(data.allowedPaths);
  const outputFormat = data.outputFormat !== undefined ? String(data.outputFormat) : 'patches';
  const supportsVision = parseSupportsVision(data.supportsVision);

  return {
    id,
    name,
    description,
    category,
    order,
    applicableWhen: data.applicableWhen !== undefined ? String(data.applicableWhen) : undefined,
    applicableTo,
    allowedPaths,
    outputFormat,
    supportsVision,
  };
}

/**
 * Loads and validates a single iteration prompt file.
 *
 * @param filePath - Path to the .md file
 * @returns Loaded iteration prompt with metadata and prompt body
 * @throws Error if file is invalid or required fields are missing
 */
export async function loadIterationPrompt(filePath: string): Promise<LoadedIterationPrompt> {
  const content = await readFile(filePath, 'utf-8');
  const { data, content: body } = parseFrontmatter(content);
  const metadata = validateAndNormalize(data, filePath);
  const prompt = body.trim();
  return { metadata, prompt };
}

/**
 * Loads all iteration prompts from a directory (flat *.md files).
 * Sorts by `order`. Duplicate `id` across files will throw.
 *
 * @param promptsDir - Directory containing iteration .md files
 * @returns Array of loaded iteration prompts, sorted by order
 */
export async function loadIterationPrompts(promptsDir: string): Promise<LoadedIterationPrompt[]> {
  const entries = await readdir(promptsDir, { withFileTypes: true });
  const resolvedPromptsDir = resolve(promptsDir);

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => {
      const filePath = resolve(promptsDir, e.name);
      // Security: ensure resolved path stays within promptsDir
      if (!filePath.startsWith(resolvedPromptsDir + sep) && filePath !== resolvedPromptsDir) {
        throw new Error(`Invalid file path outside prompts directory: ${e.name}`);
      }
      return filePath;
    });

  const results: LoadedIterationPrompt[] = [];
  const seenIds = new Set<string>();

  for (const filePath of mdFiles) {
    const result = await loadIterationPrompt(filePath);
    if (seenIds.has(result.metadata.id)) {
      throw new Error(`Duplicate iteration id "${result.metadata.id}" in ${filePath}`);
    }
    seenIds.add(result.metadata.id);
    results.push(result);
  }

  results.sort((a, b) => a.metadata.order - b.metadata.order);
  return results;
}
