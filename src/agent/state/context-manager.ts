/**
 * Context Manager for user story enhancement iterations
 * 
 * Manages context carrying between iterations, building context prompts,
 * and tracking applied enhancements.
 */

import type { StoryState, IterationResult } from './story-state.js';
import type { ProductContext } from '../../shared/types.js';
import { getIterationById } from '../../shared/iteration-registry.js';
import { createInitialState } from './story-state.js';

/**
 * Options for building context prompts
 */
export interface ContextPromptOptions {
  /** Include full iteration history in the prompt */
  includeFullHistory?: boolean;
  /** Maximum number of detailed iterations to include (default: 5) */
  maxDetailedIterations?: number;
  /** Include timestamps in the context */
  includeTimestamps?: boolean;
}

/**
 * Result of updating context after an iteration
 */
export interface ContextUpdateResult {
  /** Updated story state */
  state: StoryState;
  /** Human-readable summary of what was updated */
  updateSummary: string;
}

/**
 * Stateless context manager for user story enhancement workflows
 * 
 * This class provides methods for:
 * - Building context prompts that carry information between iterations
 * - Updating state after each iteration
 * - Resetting context for new sessions
 * - Generating reminder statements and summaries
 */
export class ContextManager {
  /**
   * Builds a context prompt preamble that includes product context and applied iterations
   * 
   * @param state - Current story state
   * @param options - Options for customizing the context prompt
   * @returns Formatted context prompt string
   * 
   * @example
   * ```typescript
   * const context = manager.buildContextPrompt(state);
   * // Use context as preamble to Claude API calls
   * ```
   */
  buildContextPrompt(
    state: StoryState,
    options: ContextPromptOptions = {}
  ): string {
    const {
      includeFullHistory = false,
      maxDetailedIterations = 5,
      // includeTimestamps reserved for future use
    } = options;

    const parts: string[] = [];

    // Product context section
    if (state.productContext) {
      const ctx = state.productContext;
      parts.push(
        `We are working on a user story for ${ctx.productName} in a ${ctx.productType} application.`
      );
      parts.push(`Target audience: ${ctx.targetAudience}.`);
      parts.push(`Business context: ${ctx.businessContext}`);
      parts.push(''); // Empty line
    }

    // Story focus section
    if (state.metadata) {
      parts.push(`**Story Focus:** ${state.metadata.title}`);
      if (state.metadata.description) {
        parts.push(state.metadata.description);
      }
      parts.push(''); // Empty line
    }

    // Applied enhancements section
    if (state.appliedIterations.length > 0) {
      parts.push('**Applied Enhancements:**');
      
      const iterationsToShow = includeFullHistory
        ? state.appliedIterations
        : state.appliedIterations.slice(-maxDetailedIterations);

      for (const iterationId of iterationsToShow) {
        const iteration = getIterationById(iterationId);
        if (iteration) {
          parts.push(`- **${iteration.name}**: ${iteration.description}`);
        } else {
          parts.push(`- **${iterationId}**: Applied`);
        }
      }

      if (!includeFullHistory && state.appliedIterations.length > maxDetailedIterations) {
        const remaining = state.appliedIterations.length - maxDetailedIterations;
        parts.push(`- ... and ${remaining} more iteration(s)`);
      }

      parts.push(''); // Empty line
    }

    // Carrying statement
    const carryingStatement = this.buildCarryingStatement(state);
    if (carryingStatement) {
      parts.push(carryingStatement);
    }

    return parts.join('\n');
  }

  /**
   * Updates the story state with a new iteration result
   * 
   * @param state - Current story state
   * @param result - Result from applying an iteration
   * @returns Updated state and summary
   * 
   * @example
   * ```typescript
   * const { state: updatedState, updateSummary } = manager.updateContext(state, iterationResult);
   * console.log(updateSummary); // "Applied user-roles iteration"
   * ```
   */
  updateContext(state: StoryState, result: IterationResult): ContextUpdateResult {
    // Check if this iteration was already applied
    const alreadyApplied = state.appliedIterations.includes(result.iterationId);

    const updatedState: StoryState = {
      ...state,
      currentStory: result.outputStory,
      appliedIterations: alreadyApplied
        ? state.appliedIterations
        : [...state.appliedIterations, result.iterationId],
      iterationResults: [...state.iterationResults, result],
    };

    const iteration = getIterationById(result.iterationId);
    const iterationName = iteration?.name || result.iterationId;
    const updateSummary = alreadyApplied
      ? `Updated existing ${iterationName} iteration result`
      : `Applied ${iterationName} iteration`;

    return {
      state: updatedState,
      updateSummary,
    };
  }

  /**
   * Resets context for a new session, optionally preserving original story and product context
   * 
   * @param originalStory - Optional original story to preserve
   * @param productContext - Optional product context to preserve
   * @returns Fresh story state
   * 
   * @example
   * ```typescript
   * // Reset completely
   * const newState = manager.resetContext();
   * 
   * // Reset but preserve product context
   * const newState = manager.resetContext(undefined, productContext);
   * ```
   */
  resetContext(
    originalStory?: string,
    productContext?: ProductContext | null
  ): StoryState {
    if (originalStory) {
      const state = createInitialState(originalStory);
      if (productContext) {
        state.productContext = productContext;
      }
      return state;
    }

    // Return empty state structure
    return {
      originalStory: '',
      currentStory: '',
      appliedIterations: [],
      productContext: productContext || null,
      iterationResults: [],
      metadata: null,
      failedIterations: [],
    };
  }

  /**
   * Builds a reminder statement about the current story and applied enhancements
   * 
   * @param state - Current story state
   * @returns Reminder statement string, or empty string if no enhancements applied
   * 
   * @example
   * ```typescript
   * const reminder = manager.buildCarryingStatement(state);
   * // "As a reminder, our user story about Login Feature has been enhanced with User Roles, Validation. We have applied 2 iteration(s) so far."
   * ```
   */
  buildCarryingStatement(state: StoryState): string {
    if (state.appliedIterations.length === 0) {
      return '';
    }

    const iterationNames = state.appliedIterations
      .map((id) => {
        const iteration = getIterationById(id);
        return iteration?.name || id;
      })
      .filter(Boolean);

    const title = state.metadata?.title || 'this user story';
    const enhancements = iterationNames.join(', ');
    const count = state.appliedIterations.length;
    const plural = count === 1 ? 'iteration' : 'iterations';

    return `As a reminder, our user story about ${title} has been enhanced with ${enhancements}. We have applied ${count} ${plural} so far.`;
  }

  /**
   * Builds a conclusion summary of all applied iterations
   * 
   * @param state - Current story state
   * @returns Summary string, or empty string if no iterations applied
   * 
   * @example
   * ```typescript
   * const summary = manager.buildConclusionSummary(state);
   * // "Summary: Applied 3 iterations (User Roles, Validation, Accessibility)"
   * ```
   */
  buildConclusionSummary(state: StoryState): string {
    const parts: string[] = [];

    if (state.appliedIterations.length > 0) {
      const iterationNames = state.appliedIterations
        .map((id) => {
          const iteration = getIterationById(id);
          return iteration?.name || id;
        })
        .filter(Boolean);

      const count = state.appliedIterations.length;
      const plural = count === 1 ? 'iteration' : 'iterations';
      const list = iterationNames.join(', ');
      parts.push(`Applied ${count} ${plural} (${list})`);
    }

    if (state.failedIterations.length > 0) {
      const failedNames = state.failedIterations
        .map((failed) => {
          const iteration = getIterationById(failed.id);
          return iteration?.name || failed.id;
        })
        .filter(Boolean);

      const count = state.failedIterations.length;
      const plural = count === 1 ? 'iteration' : 'iterations';
      const list = failedNames.join(', ');
      parts.push(`Skipped ${count} failed ${plural} (${list})`);
    }

    if (parts.length === 0) {
      return '';
    }

    return `Summary: ${parts.join('. ')}`;
  }
}

/**
 * Creates a new ContextManager instance
 * 
 * @returns A new ContextManager instance
 */
export function createContextManager(): ContextManager {
  return new ContextManager();
}

// Standalone function exports for convenience

/**
 * Builds a context prompt using a default ContextManager instance
 * 
 * @param state - Current story state
 * @param options - Options for customizing the context prompt
 * @returns Formatted context prompt string
 */
export function buildContextPrompt(
  state: StoryState,
  options?: ContextPromptOptions
): string {
  const manager = new ContextManager();
  return manager.buildContextPrompt(state, options);
}

/**
 * Updates context using a default ContextManager instance
 * 
 * @param state - Current story state
 * @param result - Result from applying an iteration
 * @returns Updated state and summary
 */
export function updateContext(
  state: StoryState,
  result: IterationResult
): ContextUpdateResult {
  const manager = new ContextManager();
  return manager.updateContext(state, result);
}

/**
 * Resets context using a default ContextManager instance
 * 
 * @param originalStory - Optional original story to preserve
 * @param productContext - Optional product context to preserve
 * @returns Fresh story state
 */
export function resetContext(
  originalStory?: string,
  productContext?: ProductContext | null
): StoryState {
  const manager = new ContextManager();
  return manager.resetContext(originalStory, productContext);
}
