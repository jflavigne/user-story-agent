/**
 * Iteration Registry
 * 
 * Central registry for all iteration definitions with product type applicability
 * and helper functions for querying iterations.
 * 
 * Supports both:
 * - Synchronous loading from TypeScript metadata (backward compatible)
 * - Async loading from Anthropic Agent Skills format (SKILL.md files)
 */

import type { IterationDefinition, IterationCategory } from './types.js';
import { ITERATION_CATEGORIES } from './types.js';
import {
  USER_ROLES_METADATA,
  INTERACTIVE_ELEMENTS_METADATA,
  VALIDATION_METADATA,
  ACCESSIBILITY_METADATA,
  PERFORMANCE_METADATA,
  SECURITY_METADATA,
  RESPONSIVE_WEB_METADATA,
  RESPONSIVE_NATIVE_METADATA,
  LANGUAGE_SUPPORT_METADATA,
  LOCALE_FORMATTING_METADATA,
  CULTURAL_APPROPRIATENESS_METADATA,
  ANALYTICS_METADATA,
} from '../prompts/index.js';
import { loadSkills, type LoadedSkill } from './skill-loader.js';

/**
 * Valid product types that iterations can apply to
 */
export const PRODUCT_TYPES = ['web', 'mobile-native', 'mobile-web', 'desktop', 'api'] as const;

/**
 * Type representing a valid product type
 */
export type ProductType = typeof PRODUCT_TYPES[number];

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
export type IterationId = typeof WORKFLOW_ORDER[number];

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
 * Registry mapping iteration IDs to their registry entries
 */
export const ITERATION_REGISTRY: Record<IterationId, IterationRegistryEntry> = {
  'user-roles': {
    ...USER_ROLES_METADATA,
    applicableTo: 'all',
  },
  'interactive-elements': {
    ...INTERACTIVE_ELEMENTS_METADATA,
    applicableTo: 'all',
  },
  'validation': {
    ...VALIDATION_METADATA,
    applicableTo: 'all',
  },
  'accessibility': {
    ...ACCESSIBILITY_METADATA,
    applicableTo: 'all',
  },
  'performance': {
    ...PERFORMANCE_METADATA,
    applicableTo: 'all',
  },
  'security': {
    ...SECURITY_METADATA,
    applicableTo: 'all',
  },
  'responsive-web': {
    ...RESPONSIVE_WEB_METADATA,
    applicableTo: ['web', 'mobile-web', 'desktop'],
  },
  'responsive-native': {
    ...RESPONSIVE_NATIVE_METADATA,
    applicableTo: ['mobile-native'],
  },
  'language-support': {
    ...LANGUAGE_SUPPORT_METADATA,
    applicableTo: 'all',
  },
  'locale-formatting': {
    ...LOCALE_FORMATTING_METADATA,
    applicableTo: 'all',
  },
  'cultural-appropriateness': {
    ...CULTURAL_APPROPRIATENESS_METADATA,
    applicableTo: 'all',
  },
  'analytics': {
    ...ANALYTICS_METADATA,
    applicableTo: 'all',
  },
};

/**
 * Get all iterations matching a specific category, in workflow order
 * 
 * @param category - The iteration category to filter by
 * @returns Array of iteration registry entries matching the category, in workflow order
 */
export function getIterationsByCategory(category: IterationCategory): IterationRegistryEntry[] {
  return WORKFLOW_ORDER.map((id) => ITERATION_REGISTRY[id])
    .filter((iteration) => iteration.category === category);
}

/**
 * Get all iterations applicable to a specific product type, in workflow order
 * 
 * @param productType - The product type to filter by
 * @returns Array of iteration registry entries applicable to the product type, in workflow order
 */
export function getApplicableIterations(productType: ProductType): IterationRegistryEntry[] {
  return WORKFLOW_ORDER.map((id) => ITERATION_REGISTRY[id])
    .filter((iteration) => {
      if (iteration.applicableTo === 'all') {
        return true;
      }
      return iteration.applicableTo.includes(productType);
    });
}

/**
 * Get a single iteration by its ID
 * 
 * @param id - The iteration ID to look up
 * @returns The iteration registry entry if found, undefined otherwise
 */
export function getIterationById(id: string): IterationRegistryEntry | undefined {
  return ITERATION_REGISTRY[id as IterationId];
}

/**
 * Get all iterations in workflow order
 * 
 * @returns Array of all iteration registry entries in workflow order
 */
export function getAllIterations(): IterationRegistryEntry[] {
  return WORKFLOW_ORDER.map((id) => ITERATION_REGISTRY[id]);
}

/**
 * Cache for skills-loaded iterations (populated by loadIterationsFromSkills)
 */
let skillsCache: IterationRegistryEntry[] | null = null;

/**
 * Validates that a string is a valid ProductType
 */
function isValidProductType(value: string): value is ProductType {
  return PRODUCT_TYPES.includes(value as ProductType);
}

/**
 * Validates that a string is a valid IterationCategory
 */
function isValidIterationCategory(value: string): value is IterationCategory {
  return ITERATION_CATEGORIES.includes(value as IterationCategory);
}

/**
 * Converts a LoadedSkill to an IterationRegistryEntry
 */
function skillToRegistryEntry(skill: LoadedSkill): IterationRegistryEntry {
  // Validate and filter applicableTo values
  let applicableTo: ProductType[] | 'all' = 'all';
  if (skill.metadata.applicableTo !== 'all' && Array.isArray(skill.metadata.applicableTo)) {
    const validTypes = skill.metadata.applicableTo.filter(isValidProductType);
    applicableTo = validTypes.length > 0 ? validTypes : 'all';
  }

  // Validate category with fallback
  const category: IterationCategory = isValidIterationCategory(skill.metadata.category)
    ? skill.metadata.category
    : 'quality'; // Default fallback category

  return {
    id: skill.metadata.id,
    name: skill.metadata.name,
    description: skill.metadata.description,
    prompt: skill.prompt,
    category,
    applicableWhen: skill.metadata.applicableWhen,
    order: skill.metadata.order,
    applicableTo,
    tokenEstimate: Math.ceil(skill.prompt.length / 4), // Rough estimate: ~4 chars per token
  };
}

/**
 * Loads iterations from Anthropic Agent Skills format (SKILL.md files)
 * 
 * @param skillsDir - Directory containing skill subdirectories (default: .claude/skills/user-story)
 * @returns Array of iteration registry entries loaded from skills
 */
export async function loadIterationsFromSkills(
  skillsDir: string = '.claude/skills/user-story'
): Promise<IterationRegistryEntry[]> {
  const skills = await loadSkills(skillsDir);
  const entries = skills.map(skillToRegistryEntry);
  
  // Sort by order to match WORKFLOW_ORDER
  entries.sort((a, b) => a.order - b.order);
  
  // Cache the result
  skillsCache = entries;
  
  return entries;
}

/**
 * Gets iterations from cache if available, otherwise falls back to synchronous registry
 * 
 * @returns Array of iteration registry entries
 */
export function getIterations(): IterationRegistryEntry[] {
  return skillsCache ?? getAllIterations();
}

/**
 * Pre-populates the skills cache by loading from skills directory
 * Call this at application startup if you want to use skills instead of TypeScript metadata
 * 
 * @param skillsDir - Directory containing skill subdirectories (default: .claude/skills/user-story)
 */
export async function initializeSkillsCache(
  skillsDir: string = '.claude/skills/user-story'
): Promise<void> {
  await loadIterationsFromSkills(skillsDir);
}
