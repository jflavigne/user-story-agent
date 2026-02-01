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
 * Iteration registry exports
 */
export {
  PRODUCT_TYPES,
  WORKFLOW_ORDER,
  ITERATION_REGISTRY,
  getIterationsByCategory,
  getApplicableIterations,
  getIterationById,
  getAllIterations,
} from './iteration-registry.js';

export type {
  ProductType,
  IterationId,
  IterationRegistryEntry,
} from './iteration-registry.js';

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
