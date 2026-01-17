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
} from './types.js';

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
