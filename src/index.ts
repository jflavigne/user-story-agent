/**
 * User Story Agent - Entry point
 *
 * A library and CLI tool for creating user stories from mockups and designs.
 */

export const VERSION = '0.1.0';

// Re-export agent functionality
export {
  UserStoryAgent,
  createAgent,
  loadConfigFromEnv,
  mergeConfigWithDefaults,
  DEFAULT_MODEL,
} from './agent/index.js';

export type {
  UserStoryAgentConfig,
  AgentResult,
  IterationOption,
  IterationSelectionCallback,
  StreamEventUnion,
} from './agent/index.js';

// Re-export shared types
export type { ProductContext, IterationCategory, AgentMode } from './shared/types.js';
export type { IterationId, ProductType } from './shared/iteration-registry.js';
export { PRODUCT_TYPES, WORKFLOW_ORDER, getAllIterations, getApplicableIterations, getIterationById } from './shared/iteration-registry.js';
