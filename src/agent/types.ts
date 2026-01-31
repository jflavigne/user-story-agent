/**
 * Agent configuration and result types
 */

import type { IterationId } from '../shared/iteration-registry.js';
import type {
  ProductContext,
  IterationCategory,
  StoryInterconnections,
  JudgeRubric,
  StoryStructure,
  GlobalConsistencyReport,
  SystemDiscoveryContext,
} from '../shared/types.js';
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
  mode: 'individual' | 'workflow' | 'interactive' | 'system-workflow';
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
  /** Maximum number of retry attempts for API calls (defaults to 3) */
  maxRetries?: number;
  /** Whether to enable streaming output (defaults to false) */
  streaming?: boolean;
  /** Whether to verify each iteration's output (defaults to false) */
  verify?: boolean;
}

/**
 * Information about a failed iteration
 */
export interface FailedIteration {
  /** ID of the iteration that failed */
  id: string;
  /** Error message describing the failure */
  error: string;
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

  /** Judge results from Pass 1c */
  judgeResults?: {
    pass1c?: JudgeRubric;
    pass1cAfterRewrite?: JudgeRubric;
  };

  /** Manual review flag when quality remains low */
  needsManualReview?: {
    reason: string;
    score: number;
  };

  /** Structured story data when patch-based workflow was used (for system workflow fix application) */
  structure?: StoryStructure;
}

/**
 * Base interface for streaming events
 */
export interface StreamEvent {
  /** Type of streaming event */
  type: 'start' | 'chunk' | 'complete' | 'error';
  /** ID of the iteration being streamed */
  iterationId: string;
  /** Timestamp when the event occurred */
  timestamp: number;
}

/**
 * Event emitted when streaming starts
 */
export interface StreamStartEvent extends StreamEvent {
  type: 'start';
}

/**
 * Event emitted for each chunk of content
 */
export interface StreamChunkEvent extends StreamEvent {
  type: 'chunk';
  /** The new content chunk */
  content: string;
  /** Accumulated content so far */
  accumulated: string;
}

/**
 * Event emitted when streaming completes
 */
export interface StreamCompleteEvent extends StreamEvent {
  type: 'complete';
  /** Full accumulated content */
  fullContent: string;
  /** Token usage statistics */
  tokenUsage: { input: number; output: number };
}

/**
 * Event emitted when an error occurs during streaming
 */
export interface StreamErrorEvent extends StreamEvent {
  type: 'error';
  /** The error that occurred */
  error: Error;
}

/**
 * Union type of all streaming events
 */
export type StreamEventUnion = StreamStartEvent | StreamChunkEvent | StreamCompleteEvent | StreamErrorEvent;

/**
 * Input story for Pass 2 interconnection (id + content)
 */
export interface Pass2StoryInput {
  id: string;
  content: string;
}

/**
 * Single story result from runPass2Interconnection (content has metadata appended)
 */
export interface Pass2StoryResultItem {
  id: string;
  content: string;
  interconnections: StoryInterconnections;
}

/**
 * Result of runPass2Interconnection: array of story results with interconnections
 */
export type Pass2InterconnectionResult = Pass2StoryResultItem[];

/**
 * Result of runSystemWorkflow: full multi-pass workflow (Pass 0 → Pass 1 with refinement → Pass 2 → Pass 2b).
 */
export interface SystemWorkflowResult {
  systemContext: SystemDiscoveryContext;
  stories: Array<{
    id: string;
    content: string;
    structure?: StoryStructure;
    interconnections: StoryInterconnections;
    judgeResults?: {
      pass1c?: JudgeRubric;
      pass1cAfterRewrite?: JudgeRubric;
    };
  }>;
  consistencyReport: GlobalConsistencyReport;
  metadata: {
    passesCompleted: string[];
    refinementRounds: number;
    fixesApplied: number;
    fixesFlaggedForReview: number;
  };
}
