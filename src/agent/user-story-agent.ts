/**
 * User Story Agent - Main agent class for processing user stories
 */

import type { UserStoryAgentConfig, AgentResult } from './types.js';
import type { IterationRegistryEntry } from '../shared/iteration-registry.js';
import type { StoryState, IterationResult } from './state/story-state.js';
import { ContextManager } from './state/context-manager.js';
import { ITERATION_REGISTRY, getIterationById } from '../shared/iteration-registry.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { createInitialState } from './state/story-state.js';
import { ClaudeClient } from './claude-client.js';

/**
 * Main agent class for processing user stories through iterations
 */
export class UserStoryAgent {
  private config: UserStoryAgentConfig;
  private claudeClient: ClaudeClient;
  private contextManager: ContextManager;

  /**
   * Creates a new UserStoryAgent instance
   *
   * @param config - Configuration for the agent
   * @throws {Error} If iteration IDs are invalid or API key is missing
   */
  constructor(config: UserStoryAgentConfig) {
    this.config = config;
    this.validateConfig();
    this.claudeClient = new ClaudeClient(config.apiKey, config.model);
    this.contextManager = new ContextManager();
  }

  /**
   * Validates the agent configuration
   *
   * @throws {Error} If configuration is invalid
   */
  private validateConfig(): void {
    // Validate that all iteration IDs exist in the registry
    for (const iterationId of this.config.iterations) {
      const iteration = getIterationById(iterationId);
      if (!iteration) {
        throw new Error(
          `Invalid iteration ID: ${iterationId}. Available iterations: ${Object.keys(ITERATION_REGISTRY).join(', ')}`
        );
      }
    }

    // Validate mode
    if (this.config.mode !== 'individual') {
      throw new Error(`Unsupported mode: ${this.config.mode}. Only 'individual' mode is currently supported.`);
    }
  }

  /**
   * Main entry point for processing a user story
   *
   * @param initialStory - The initial user story to process
   * @returns Promise resolving to the agent result
   */
  async processUserStory(initialStory: string): Promise<AgentResult> {
    // Validate input early for clear error message
    if (!initialStory || initialStory.trim().length === 0) {
      return {
        success: false,
        originalStory: '',
        enhancedStory: '',
        appliedIterations: [],
        iterationResults: [],
        summary: 'Error: Initial story cannot be empty or whitespace-only',
      };
    }

    // Create initial state
    let state = createInitialState(initialStory);
    if (this.config.productContext) {
      state.productContext = this.config.productContext;
    }

    try {
      // Run in individual mode
      state = await this.runIndividualMode(state);

      // Build summary
      const summary = this.contextManager.buildConclusionSummary(state);

      return {
        success: true,
        originalStory: state.originalStory,
        enhancedStory: state.currentStory,
        appliedIterations: state.appliedIterations,
        iterationResults: state.iterationResults,
        summary: summary || 'No iterations were applied.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        originalStory: state.originalStory,
        enhancedStory: state.currentStory,
        appliedIterations: state.appliedIterations,
        iterationResults: state.iterationResults,
        summary: `Error processing user story: ${errorMessage}`,
      };
    }
  }

  /**
   * Runs the agent in individual mode, applying iterations in order
   *
   * @param state - Initial story state
   * @returns Promise resolving to the final story state
   */
  private async runIndividualMode(state: StoryState): Promise<StoryState> {
    let currentState = state;

    // Apply each iteration in the configured order
    for (const iterationId of this.config.iterations) {
      const iteration = getIterationById(iterationId);
      if (!iteration) {
        throw new Error(`Iteration not found: ${iterationId}`);
      }

      // Apply the iteration
      const result = await this.applyIteration(iteration, currentState);

      // Update context with the result
      const { state: updatedState } = this.contextManager.updateContext(currentState, result);
      currentState = updatedState;
    }

    return currentState;
  }

  /**
   * Applies a single iteration to the current story state
   *
   * @param iteration - The iteration to apply
   * @param state - Current story state
   * @returns Promise resolving to the iteration result
   */
  private async applyIteration(
    iteration: IterationRegistryEntry,
    state: StoryState
  ): Promise<IterationResult> {
    // Build context prompt
    const contextPrompt = this.contextManager.buildContextPrompt(state);

    // Build the full user message with context and iteration prompt
    const userMessage = contextPrompt
      ? `${contextPrompt}\n\n---\n\n${iteration.prompt}\n\n---\n\nCurrent user story:\n\n${state.currentStory}`
      : `${iteration.prompt}\n\n---\n\nCurrent user story:\n\n${state.currentStory}`;

    // Call Claude API
    const response = await this.claudeClient.sendMessage({
      systemPrompt: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      model: this.config.model,
    });

    // Extract the enhanced story from the response
    const enhancedStory = response.content.trim();

    if (!enhancedStory) {
      throw new Error(`Iteration ${iteration.id} returned an empty story. This may indicate an API error or invalid response.`);
    }

    // Create iteration result
    const result: IterationResult = {
      iterationId: iteration.id,
      inputStory: state.currentStory,
      outputStory: enhancedStory,
      changesApplied: [], // Could be enhanced to extract changes from Claude response
      timestamp: new Date().toISOString(),
    };

    return result;
  }
}

/**
 * Factory function to create a UserStoryAgent instance
 *
 * @param config - Configuration for the agent
 * @returns A new UserStoryAgent instance
 */
export function createAgent(config: UserStoryAgentConfig): UserStoryAgent {
  return new UserStoryAgent(config);
}
