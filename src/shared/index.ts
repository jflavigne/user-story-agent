/**
 * Shared type definitions - re-export all types
 */

export { ITERATION_CATEGORIES } from './types.js';

export type {
  IterationCategory,
  IterationDefinition,
  ProductContext,
  AgentMode,
  StoryMetadata,
  ChangeApplied,
  IterationOutput,
} from './types.js';

/**
 * Error types and error code registry
 */
export {
  AgentError,
  APIError,
  ValidationError,
  TimeoutError,
  ERROR_CODES,
  ERROR_CODE_DESCRIPTIONS,
} from './errors.js';

export type { ErrorCode } from './errors.js';

/**
 * Token estimation for Claude prompts (documented character-based rate)
 */
export { estimateClaudeInputTokens } from './token-estimate.js';

/**
 * Iteration registry exports
 */
export {
  PRODUCT_TYPES,
  WORKFLOW_ORDER,
  getIterationsByCategory,
  getApplicableIterations,
  getIterationById,
  getAllIterations,
  getIterations,
  loadIterationsFromPrompts,
  initializeIterationPrompts,
  promptToRegistryEntry,
  loadIterationsFromSkills,
  initializeSkillsCache,
} from './iteration-registry.js';

export type {
  ProductType,
  IterationId,
  IterationRegistryEntry,
} from './iteration-registry.js';

/**
 * Iteration prompt loader (markdown + frontmatter)
 */
export { loadIterationPrompts, loadIterationPrompt } from './prompt-loader.js';
export type { LoadedIterationPrompt, IterationPromptMetadata } from './prompt-loader.js';

/**
 * Over-specification pattern detection
 */
export {
  EXACT_COLOR_PATTERN,
  PIXEL_MEASUREMENT_PATTERN,
  FONT_SPEC_PATTERN,
  hasOverSpecification,
  countOverSpecification,
  extractOverSpecSamples,
} from './overspecification-patterns.js';
