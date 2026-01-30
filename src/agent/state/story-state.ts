/**
 * Story state management for tracking user story through enhancement iterations
 */

import type {
  ProductContext,
  StoryMetadata,
  ChangeApplied,
  SystemDiscoveryContext,
  StoryInterconnections,
  StoryStructure,
} from '../../shared/types.js';
import type { FailedIteration } from '../types.js';
import type { VerificationResult } from '../../shared/schemas.js';

/**
 * Error thrown when story validation fails
 */
export class StoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoryValidationError';
  }
}

/**
 * Result of applying a single iteration to a user story
 */
export interface IterationResult {
  /** Unique identifier of the iteration that was applied */
  iterationId: string;
  /** The story content before this iteration was applied */
  inputStory: string;
  /** The story content after this iteration was applied */
  outputStory: string;
  /** List of changes that were made in this iteration */
  changesApplied: ChangeApplied[];
  /** Timestamp when this iteration was applied (ISO 8601 string, e.g., from `new Date().toISOString()`) */
  timestamp: string;
  /** Optional verification result for this iteration */
  verification?: VerificationResult;
}

/**
 * Complete state of a user story throughout its enhancement lifecycle
 */
export interface StoryState {
  /** The original story content, never modified */
  originalStory: string;
  /** The current story content after all applied iterations */
  currentStory: string;
  /** Structured representation (used in system-workflow; re-rendered after consistency fixes) */
  storyStructure?: StoryStructure;
  /** Array of iteration IDs that have been applied to this story */
  appliedIterations: string[];
  /** Product context information, if available */
  productContext: ProductContext | null;
  /** History of all iteration results for debugging and audit */
  iterationResults: IterationResult[];
  /** Extracted metadata from the story, if available */
  metadata: StoryMetadata | null;
  /** Array of iterations that failed after retries */
  failedIterations: FailedIteration[];
  /** Pass 0 system discovery context (components, contracts, vocabulary) when run */
  systemContext?: SystemDiscoveryContext | null;
  /** Pass 2 interconnection metadata when run (UI mapping, contracts, ownership, related stories) */
  interconnections?: StoryInterconnections | null;
}

/**
 * Creates an initial story state from a raw story string
 *
 * @param story - The initial user story content
 * @returns A new StoryState with the story set as both original and current
 * @throws {StoryValidationError} If the story is empty or whitespace-only
 *
 * @example
 * ```typescript
 * const state = createInitialState("As a user, I want to...");
 * console.log(state.originalStory === state.currentStory); // true
 * ```
 */
export function createInitialState(story: string): StoryState {
  if (typeof story !== 'string' || story.trim().length === 0) {
    throw new StoryValidationError('Story must be a non-empty string');
  }

  return {
    originalStory: story,
    currentStory: story,
    appliedIterations: [],
    productContext: null,
    iterationResults: [],
    metadata: null,
    failedIterations: [],
    systemContext: null,
    interconnections: null,
  };
}
