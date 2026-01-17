/**
 * Agent module - barrel exports
 */

// Agent types
export type { UserStoryAgentConfig, AgentResult } from './types.js';

// Claude client
export { ClaudeClient } from './claude-client.js';
export type { ClaudeMessageResult, ClaudeUsage, SendMessageOptions } from './claude-client.js';

// User story agent
export { UserStoryAgent, createAgent } from './user-story-agent.js';

// Re-export state management for convenience
export * from './state/index.js';
