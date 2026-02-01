/**
 * Iteration Registry
 *
 * Central registry for workflow iteration definitions. Iteration prompts are loaded
 * from markdown files (see prompt-loader); this module holds the cache and resolution helpers.
 * Also supports legacy loading from Anthropic Agent Skills (SKILL.md) via loadIterationsFromSkills.
 */

import type { IterationDefinition, IterationCategory, PatchPath } from './types.js';
import { ITERATION_CATEGORIES } from './types.js';
import { loadSkills, type LoadedSkill } from './skill-loader.js';
import { loadIterationPrompts, type LoadedIterationPrompt } from './prompt-loader.js';

/**
 * Valid product types that iterations can apply to
 */
export const PRODUCT_TYPES = ['web', 'mobile-native', 'mobile-web', 'desktop', 'api'] as const;

/**
 * Type representing a valid product type
 */
export type ProductType = (typeof PRODUCT_TYPES)[number];

/**
 * Workflow order for all iterations - defines execution sequence
 */
export const WORKFLOW_ORDER = [
  'user-roles',
  'interactive-elements',
  'validation',
  'accessibility',
  'performance',
  'security',
  'responsive-web',
  'responsive-native',
  'language-support',
  'locale-formatting',
  'cultural-appropriateness',
  'analytics',
] as const;

/**
 * Type representing a valid iteration ID
 */
export type IterationId = (typeof WORKFLOW_ORDER)[number];

/**
 * Registry entry extending IterationDefinition with product applicability
 */
export interface IterationRegistryEntry extends IterationDefinition {
  /** Product types this iteration applies to, or 'all' for all product types */
  applicableTo: ProductType[] | 'all';
  /** Estimated token count for this iteration's prompt */
  tokenEstimate: number;
}

/**
 * Fallback path mappings for patch-based section scope per iteration id.
 * Used when a loaded .md prompt does not specify allowedPaths in frontmatter.
 */
const ALLOWED_PATHS: Record<IterationId, PatchPath[]> = {
  'user-roles': ['story.asA', 'story.iWant', 'story.soThat', 'outcomeAcceptanceCriteria'],
  'interactive-elements': ['userVisibleBehavior', 'outcomeAcceptanceCriteria'],
  validation: ['outcomeAcceptanceCriteria', 'systemAcceptanceCriteria'],
  accessibility: ['outcomeAcceptanceCriteria', 'systemAcceptanceCriteria'],
  performance: [
    'systemAcceptanceCriteria',
    'implementationNotes.performanceNotes',
    'implementationNotes.loadingStates',
  ],
  security: ['systemAcceptanceCriteria', 'implementationNotes.securityNotes'],
  'responsive-web': ['userVisibleBehavior', 'systemAcceptanceCriteria'],
  'responsive-native': ['userVisibleBehavior', 'systemAcceptanceCriteria'],
  'language-support': ['outcomeAcceptanceCriteria'],
  'locale-formatting': ['outcomeAcceptanceCriteria'],
  'cultural-appropriateness': ['outcomeAcceptanceCriteria'],
  analytics: ['systemAcceptanceCriteria', 'implementationNotes.telemetryNotes'],
};

/**
 * Cache for iterations loaded from markdown prompts or skills.
 * Populated by loadIterationsFromPrompts() or loadIterationsFromSkills(); resolution is cache-only.
 */
let externalIterationsCache: IterationRegistryEntry[] | null = null;

/**
 * Validates that a string is a valid ProductType
 */
function isValidProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

/**
 * Maps a LoadedIterationPrompt to an IterationRegistryEntry.
 * Uses metadata.allowedPaths if present, else ALLOWED_PATHS[id].
 */
export function promptToRegistryEntry(
  loaded: LoadedIterationPrompt,
  allowedPathsFallback: PatchPath[]
): IterationRegistryEntry {
  const { metadata, prompt } = loaded;
  const allowedPaths =
    metadata.allowedPaths && metadata.allowedPaths.length > 0
      ? metadata.allowedPaths
      : allowedPathsFallback;

  let applicableTo: ProductType[] | 'all' = 'all';
  if (metadata.applicableTo !== 'all' && Array.isArray(metadata.applicableTo)) {
    const valid = metadata.applicableTo.filter(isValidProductType) as ProductType[];
    applicableTo = valid.length > 0 ? valid : 'all';
  }

  return {
    id: metadata.id,
    name: metadata.name,
    description: metadata.description,
    prompt,
    category: metadata.category,
    applicableWhen: metadata.applicableWhen,
    order: metadata.order,
    applicableTo,
    allowedPaths,
    outputFormat: (metadata.outputFormat as 'patches') ?? 'patches',
    supportsVision: metadata.supportsVision,
    tokenEstimate: Math.ceil(prompt.length / 4),
  };
}

/**
 * Loads iterations from markdown prompt files and sets the registry cache.
 *
 * @param promptsDir - Directory containing iteration .md files (flat *.md)
 * @returns Array of iteration registry entries
 */
export async function loadIterationsFromPrompts(
  promptsDir: string
): Promise<IterationRegistryEntry[]> {
  const loaded = await loadIterationPrompts(promptsDir);
  const entries = loaded.map((l) => {
    const fallback = ALLOWED_PATHS[l.metadata.id as IterationId] ?? [];
    return promptToRegistryEntry(l, fallback);
  });
  externalIterationsCache = entries;
  return entries;
}

/**
 * Initializes the iteration registry by loading prompts from the given directory.
 * Call at startup before creating the agent. Fails if the directory is missing or empty.
 *
 * @param promptsDir - Directory containing iteration .md files (e.g. src/prompts/iterations)
 */
export async function initializeIterationPrompts(promptsDir: string): Promise<void> {
  const entries = await loadIterationsFromPrompts(promptsDir);
  if (entries.length === 0) {
    throw new Error(
      `No iteration prompts found in ${promptsDir}. Ensure the directory exists and contains .md files with valid frontmatter.`
    );
  }
}

/**
 * Get all iterations matching a specific category, in workflow order.
 * Resolves from cache only; returns [] if cache not initialized.
 */
export function getIterationsByCategory(
  category: IterationCategory
): IterationRegistryEntry[] {
  const cache = externalIterationsCache ?? [];
  return cache.filter((iteration) => iteration.category === category);
}

/**
 * Get all iterations applicable to a specific product type, in workflow order.
 * Resolves from cache only; returns [] if cache not initialized.
 */
export function getApplicableIterations(
  productType: ProductType
): IterationRegistryEntry[] {
  const cache = externalIterationsCache ?? [];
  return cache.filter((iteration) => {
    if (iteration.applicableTo === 'all') return true;
    return iteration.applicableTo.includes(productType);
  });
}

/**
 * Get a single iteration by its ID. Resolves from cache only; returns undefined if not found or cache not set.
 */
export function getIterationById(id: string): IterationRegistryEntry | undefined {
  const cache = externalIterationsCache ?? [];
  return cache.find((e) => e.id === id);
}

/**
 * Get all iterations in workflow order. Resolves from cache only; returns [] if cache not set.
 */
export function getAllIterations(): IterationRegistryEntry[] {
  return externalIterationsCache ?? [];
}

/**
 * Get all iterations that support vision analysis (images), in workflow order.
 * Resolves from cache only; returns [] if cache not set.
 */
export function getVisionCapableIterations(): IterationRegistryEntry[] {
  const cache = externalIterationsCache ?? [];
  return cache.filter((iteration) => iteration.supportsVision === true);
}

/**
 * Validates that a string is a valid IterationCategory
 */
function isValidIterationCategory(value: string): value is IterationCategory {
  return (ITERATION_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Converts a LoadedSkill to an IterationRegistryEntry (legacy skills support).
 */
function skillToRegistryEntry(skill: LoadedSkill): IterationRegistryEntry {
  let applicableTo: ProductType[] | 'all' = 'all';
  if (skill.metadata.applicableTo !== 'all' && Array.isArray(skill.metadata.applicableTo)) {
    const validTypes = skill.metadata.applicableTo.filter(isValidProductType);
    applicableTo = validTypes.length > 0 ? validTypes : 'all';
  }

  const category: IterationCategory = isValidIterationCategory(skill.metadata.category)
    ? skill.metadata.category
    : 'quality';

  return {
    id: skill.metadata.id,
    name: skill.metadata.name,
    description: skill.metadata.description,
    prompt: skill.prompt,
    category,
    applicableWhen: skill.metadata.applicableWhen,
    order: skill.metadata.order,
    applicableTo,
    tokenEstimate: Math.ceil(skill.prompt.length / 4),
  };
}

/**
 * Loads iterations from Anthropic Agent Skills format (SKILL.md files).
 * Populates the same cache as loadIterationsFromPrompts (legacy / backward compatibility).
 *
 * @param skillsDir - Directory containing skill subdirectories (default: .claude/skills/user-story)
 * @returns Array of iteration registry entries loaded from skills
 */
export async function loadIterationsFromSkills(
  skillsDir: string = '.claude/skills/user-story'
): Promise<IterationRegistryEntry[]> {
  const skills = await loadSkills(skillsDir);
  const entries = skills.map(skillToRegistryEntry);
  entries.sort((a, b) => a.order - b.order);
  externalIterationsCache = entries;
  return entries;
}

/**
 * Returns iterations from cache. Returns [] if cache not initialized.
 */
export function getIterations(): IterationRegistryEntry[] {
  return externalIterationsCache ?? [];
}

/**
 * Pre-populates the iteration cache by loading from a skills directory (legacy).
 * Prefer initializeIterationPrompts(promptsDir) for markdown-based iteration prompts.
 *
 * @param skillsDir - Directory containing skill subdirectories (default: .claude/skills/user-story)
 */
export async function initializeSkillsCache(
  skillsDir: string = '.claude/skills/user-story'
): Promise<void> {
  await loadIterationsFromSkills(skillsDir);
}
