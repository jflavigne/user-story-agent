/**
 * Agent configuration and result types
 */

import type { IterationId } from '../shared/iteration-registry.js';
import type { ProductContext, IterationCategory } from '../shared/types.js';
import type { IterationResult } from './state/story-state.js';

/**
 * Information about an available iteration for interactive selection
 */
export interface IterationOption {
  /** Unique identifier for the iteration */
  id: IterationId;
  /** Human-readable name */
  name: string;
  /** Description of what this iteration does */
  description: string;
  /** Category this iteration belongs to */
  category: IterationCategory;
}

/**
 * Callback function for interactive mode iteration selection
 *
 * @param options - Available iterations to choose from
 * @returns Promise resolving to the selected iteration IDs
 */
export type IterationSelectionCallback = (options: IterationOption[]) => Promise<IterationId[]>;

/**
 * Configuration for the UserStoryAgent
 */
export interface UserStoryAgentConfig {
  /** Mode in which the agent operates */
  mode: 'individual' | 'workflow' | 'interactive';
  /** List of iteration IDs to apply in order (required for individual mode) */
  iterations?: IterationId[];
  /** Optional product context for enhanced story generation */
  productContext?: ProductContext;
  /** Optional API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Optional model name (defaults to claude-sonnet-4-20250514) */
  model?: string;
  /** Callback for iteration selection (required for interactive mode) */
  onIterationSelection?: IterationSelectionCallback;
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
