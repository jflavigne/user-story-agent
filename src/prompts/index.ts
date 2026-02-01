/**
 * Prompts module - exports all system and iteration prompts
 *
 * Workflow iteration prompts (user-roles, validation, etc.) are loaded from
 * markdown files in ./iterations/ via the prompt loader; see initializeIterationPrompts().
 */

export { SYSTEM_PROMPT, SYSTEM_PROMPT_METADATA } from './system.js';
export { POST_PROCESSING_PROMPT, POST_PROCESSING_PROMPT_METADATA } from './post-processing.js';

// Iteration modules that remain in TS (builder logic / system-prompt usage)
export {
  buildStoryInterconnectionPrompt,
  formatAllStories,
  formatSystemContext,
  STORY_INTERCONNECTION_PROMPT,
  STORY_INTERCONNECTION_METADATA,
} from './iterations/story-interconnection.js';
export type { StoryForInterconnection } from './iterations/story-interconnection.js';

// Judge rubrics
export {
  buildGlobalConsistencyPrompt,
  GLOBAL_CONSISTENCY_JUDGE_PROMPT,
} from './judge-rubrics/global-consistency.js';
export type { StoryWithInterconnections } from './judge-rubrics/global-consistency.js';
