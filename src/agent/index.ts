/**
 * Agent module - barrel exports
 */

// Agent types
export type {
  UserStoryAgentConfig,
  AgentResult,
  IterationOption,
  IterationSelectionCallback,
  FailedIteration,
  Pass2StoryInput,
  Pass2StoryResultItem,
  Pass2InterconnectionResult,
  SystemWorkflowResult,
  StreamEvent,
  StreamStartEvent,
  StreamChunkEvent,
  StreamCompleteEvent,
  StreamErrorEvent,
  StreamEventUnion,
  OperationType,
  ModelConfig,
  QualityPreset,
} from './types.js';
export { QUALITY_PRESETS } from './types.js';

// Claude client
export { ClaudeClient } from './claude-client.js';
export type { ClaudeMessageResult, ClaudeUsage, SendMessageOptions } from './claude-client.js';

// User story agent
export { UserStoryAgent, createAgent } from './user-story-agent.js';

// Configuration utilities
export { loadConfigFromEnv, mergeConfigWithDefaults, DEFAULT_MODEL } from './config.js';

// Re-export state management for convenience
export * from './state/index.js';

// ID registry (deterministic stable ID minting)
export {
  IDRegistry,
  mintStableId,
  normalizeCanonicalName,
  getPrefix,
} from './id-registry.js';
export type { EntityType } from './id-registry.js';
