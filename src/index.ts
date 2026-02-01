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
  QUALITY_PRESETS,
} from './agent/index.js';

export type {
  UserStoryAgentConfig,
  AgentResult,
  IterationOption,
  IterationSelectionCallback,
  StreamEventUnion,
  OperationType,
  ModelConfig,
  QualityPreset,
} from './agent/index.js';

// Re-export shared types
export type { ProductContext, IterationCategory, AgentMode } from './shared/types.js';
export type { IterationId, ProductType } from './shared/iteration-registry.js';
export {
  PRODUCT_TYPES,
  WORKFLOW_ORDER,
  getAllIterations,
  getApplicableIterations,
  getIterationById,
  getIterations,
  loadIterationsFromPrompts,
  initializeIterationPrompts,
  loadIterationsFromSkills,
  initializeSkillsCache,
} from './shared/iteration-registry.js';

// Re-export skill loader
export { loadSkills, loadSkill } from './shared/skill-loader.js';
export type { SkillMetadata, LoadedSkill } from './shared/skill-loader.js';
export { parseFrontmatter } from './shared/frontmatter.js';
export type { FrontmatterResult } from './shared/frontmatter.js';
