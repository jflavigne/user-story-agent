/**
 * Agent configuration and result types
 */

import type { IterationId } from '../shared/iteration-registry.js';
import type { ProductContext } from '../shared/types.js';
import type { IterationResult } from './state/story-state.js';

/**
 * Configuration for the UserStoryAgent
 */
export interface UserStoryAgentConfig {
  /** Mode in which the agent operates */
  mode: 'individual' | 'workflow';
  /** List of iteration IDs to apply in order */
  iterations: IterationId[];
  /** Optional product context for enhanced story generation */
  productContext?: ProductContext;
  /** Optional API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Optional model name (defaults to claude-sonnet-4-20250514) */
  model?: string;
}

/**
 * Result of processing a user story through the agent
 */
export interface AgentResult {
  /** Whether the processing was successful */
  success: boolean;
  /** The original story content */
  originalStory: string;
  /** The final enhanced story after all iterations */
  enhancedStory: string;
  /** List of iteration IDs that were applied */
  appliedIterations: string[];
  /** Detailed results from each iteration */
  iterationResults: IterationResult[];
  /** Human-readable summary of the processing */
  summary: string;
}
