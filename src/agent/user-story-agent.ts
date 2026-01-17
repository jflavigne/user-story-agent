/**
 * User Story Agent - Main agent class for processing user stories
 */

import { EventEmitter } from 'events';
import type { UserStoryAgentConfig, AgentResult, IterationOption } from './types.js';
import type { IterationRegistryEntry, IterationId } from '../shared/iteration-registry.js';
import type { StoryState, IterationResult } from './state/story-state.js';
import { ContextManager } from './state/context-manager.js';
import { ITERATION_REGISTRY, getIterationById, getApplicableIterations, getAllIterations, PRODUCT_TYPES, WORKFLOW_ORDER, type ProductType } from '../shared/iteration-registry.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { POST_PROCESSING_PROMPT, POST_PROCESSING_PROMPT_METADATA } from '../prompts/index.js';
import { createInitialState } from './state/story-state.js';
import { ClaudeClient } from './claude-client.js';
import { logger } from '../utils/logger.js';
import { IterationOutputSchema, type IterationOutput } from '../shared/schemas.js';
import { extractJSON } from '../shared/json-utils.js';
import { AgentError } from '../shared/errors.js';
import { StreamingHandler } from './streaming.js';
import { Evaluator } from './evaluator.js';

/**
 * Main agent class for processing user stories through iterations
 */
export class UserStoryAgent extends EventEmitter {
  private config: UserStoryAgentConfig;
  private claudeClient: ClaudeClient;
  private contextManager: ContextManager;
  private evaluator?: Evaluator;
  /** Whether streaming is enabled */
  public readonly streaming: boolean;

  /**
   * Creates a new UserStoryAgent instance
   *
   * @param config - Configuration for the agent
   * @throws {Error} If iteration IDs are invalid or API key is missing
   */
  constructor(config: UserStoryAgentConfig) {
    super();
    this.config = config;
    this.streaming = config.streaming ?? false;
    this.validateConfig();
    this.claudeClient = new ClaudeClient(config.apiKey, config.model, config.maxRetries ?? 3);
    this.contextManager = new ContextManager();
    
    // Create evaluator if verification is enabled
    if (config.verify === true) {
      this.evaluator = new Evaluator(this.claudeClient);
    }
  }

  /**
   * Validates the agent configuration
   *
   * @throws {Error} If configuration is invalid
   */
  private validateConfig(): void {
    // Validate mode
    const supportedModes = ['individual', 'workflow', 'interactive'];
    if (!supportedModes.includes(this.config.mode)) {
      throw new Error(`Unsupported mode: ${this.config.mode}. Supported modes: ${supportedModes.join(', ')}.`);
    }

    // Validate iterations for individual mode
    if (this.config.mode === 'individual') {
      if (!this.config.iterations || this.config.iterations.length === 0) {
        throw new Error('Individual mode requires at least one iteration ID');
      }
      for (const iterationId of this.config.iterations) {
        const iteration = getIterationById(iterationId);
        if (!iteration) {
          throw new Error(
            `Invalid iteration ID: ${iterationId}. Available iterations: ${Object.keys(ITERATION_REGISTRY).join(', ')}`
          );
        }
      }
    }

    // Workflow mode requires productContext with productType
    if (this.config.mode === 'workflow' && !this.config.productContext?.productType) {
      throw new Error('Workflow mode requires productContext with productType');
    }

    // Interactive mode requires onIterationSelection callback
    if (this.config.mode === 'interactive' && !this.config.onIterationSelection) {
      throw new Error('Interactive mode requires onIterationSelection callback');
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
      // Run in the configured mode
      if (this.config.mode === 'individual') {
        state = await this.runIndividualMode(state);
      } else if (this.config.mode === 'workflow') {
        state = await this.runWorkflowMode(state);
      } else if (this.config.mode === 'interactive') {
        state = await this.runInteractiveMode(state);
      } else {
        throw new Error(`Unsupported mode: ${this.config.mode}`);
      }

      // Build summary (includes failed iterations if any)
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

    // iterations is guaranteed to exist for individual mode (validated in validateConfig)
    // Using non-null assertion since validation ensures this is defined
    const iterations = this.config.iterations!;

      // Apply each iteration in the configured order
      for (const iterationId of iterations) {
        const iteration = getIterationById(iterationId);
        if (!iteration) {
          throw new Error(`Iteration not found: ${iterationId}`);
        }

        // Apply the iteration (may return null if it failed after retries)
        const result = await this.applyIteration(iteration, currentState);

        // Only update context if the iteration succeeded
        if (result !== null) {
          const { state: updatedState } = this.contextManager.updateContext(currentState, result);
          currentState = updatedState;
        }
      }

    return currentState;
  }

  /**
   * Gathers available iterations and calls the selection callback
   *
   * @param state - Current story state
   * @returns Promise resolving to the selected iteration IDs
   */
  private async gatherIterationSelections(state: StoryState): Promise<IterationId[]> {
    // Get available iterations (filtered by product type if provided)
    const rawProductType = state.productContext?.productType;
    // Validate productType at runtime before using it
    const isValidProductType = rawProductType !== undefined && PRODUCT_TYPES.includes(rawProductType as ProductType);
    const availableIterations = isValidProductType
      ? getApplicableIterations(rawProductType as ProductType)
      : getAllIterations();

    // Map to IterationOption format
    const options: IterationOption[] = availableIterations.map((iteration) => ({
      id: iteration.id as IterationId,
      name: iteration.name,
      description: iteration.description,
      category: iteration.category,
    }));

    // Call the callback to get user selection
    const callback = this.config.onIterationSelection;
    if (!callback) {
      throw new Error('Interactive mode requires onIterationSelection callback');
    }

    const selectedIds = await callback(options);

    // Validate all selected IDs are valid
    const validIds = new Set(options.map((opt) => opt.id));
    for (const id of selectedIds) {
      if (!validIds.has(id)) {
        throw new Error(`Invalid iteration ID selected: ${id}. Available: ${Array.from(validIds).join(', ')}`);
      }
    }

    return selectedIds;
  }

  /**
   * Runs the agent in interactive mode, allowing user to select iterations
   *
   * @param state - Initial story state
   * @returns Promise resolving to the final story state
   */
  private async runInteractiveMode(state: StoryState): Promise<StoryState> {
    // 1. Gather user selections
    const selectedIds = await this.gatherIterationSelections(state);

    if (selectedIds.length === 0) {
      // No iterations selected, return original story
      return state;
    }

    // 2. Filter selections to maintain WORKFLOW_ORDER
    const orderedIterations = WORKFLOW_ORDER.filter((id) => selectedIds.includes(id));

    // 3. Apply each selected iteration in order
    let currentState = state;
    for (const iterationId of orderedIterations) {
      const iteration = getIterationById(iterationId);
      if (!iteration) {
        throw new Error(`Iteration not found: ${iterationId}`);
      }

      const result = await this.applyIteration(iteration, currentState);
      if (result !== null) {
        const { state: updatedState } = this.contextManager.updateContext(currentState, result);
        currentState = updatedState;
      }
    }

    // 4. Run consolidation as final step
    currentState = await this.runConsolidation(currentState);

    return currentState;
  }

  /**
   * Runs the agent in workflow mode, applying all applicable iterations sequentially
   * based on product type, then consolidating the result
   *
   * @param state - Initial story state
   * @returns Promise resolving to the final story state
   */
  private async runWorkflowMode(state: StoryState): Promise<StoryState> {
    // 1. Get product type from config (required for workflow mode)
    const productType = this.config.productContext?.productType;
    if (!productType) {
      throw new Error('Workflow mode requires productContext with productType');
    }

    // 2. Validate product type is a known value
    if (!PRODUCT_TYPES.includes(productType as ProductType)) {
      throw new Error(
        `Invalid productType: '${productType}'. Valid types: ${PRODUCT_TYPES.join(', ')}`
      );
    }

    // 3. Get applicable iterations filtered by product type
    const iterations = getApplicableIterations(productType as ProductType);

    // 4. Apply each iteration sequentially
    let currentState = state;
    for (const iteration of iterations) {
      const result = await this.applyIteration(iteration, currentState);
      if (result !== null) {
        const { state: updatedState } = this.contextManager.updateContext(currentState, result);
        currentState = updatedState;
      }
    }

    // 5. Run consolidation as final step
    currentState = await this.runConsolidation(currentState);

    return currentState;
  }

  /**
   * Runs consolidation as the final step in workflow mode
   *
   * @param state - Current story state
   * @returns Promise resolving to the consolidated story state
   */
  private async runConsolidation(state: StoryState): Promise<StoryState> {
    // Create consolidation "iteration" entry for post-processing
    const consolidationEntry: IterationRegistryEntry = {
      id: 'consolidation',
      name: 'Consolidation',
      description: 'Final cleanup and formatting',
      prompt: POST_PROCESSING_PROMPT,
      category: 'post-processing',
      applicableTo: 'all',
      order: 999,
      tokenEstimate: POST_PROCESSING_PROMPT_METADATA.tokenEstimate,
    };

    // Apply using existing machinery
    const result = await this.applyIteration(consolidationEntry, state);
    if (result !== null) {
      const { state: updatedState } = this.contextManager.updateContext(state, result);
      return updatedState;
    }
    // If consolidation failed, return state as-is
    return state;
  }

  /**
   * Applies a single iteration to the current story state
   *
   * @param iteration - The iteration to apply
   * @param state - Current story state
   * @returns Promise resolving to the iteration result, or null if the iteration failed after retries
   */
  private async applyIteration(
    iteration: IterationRegistryEntry,
    state: StoryState
  ): Promise<IterationResult | null> {
    const startTime = Date.now();
    logger.info(`Starting iteration: ${iteration.id}`);
    logger.debug(`Iteration details: ${iteration.name} (category: ${iteration.category})`);

    try {
      // Build context prompt
      const contextPrompt = this.contextManager.buildContextPrompt(state);
      logger.debug(
        `Context prompt: ${contextPrompt ? contextPrompt.length : 0} chars, ` +
          `appliedIterations: ${state.appliedIterations.length}`
      );

      // Build the full user message with context and iteration prompt
      const userMessage = contextPrompt
        ? `${contextPrompt}\n\n---\n\n${iteration.prompt}\n\n---\n\nCurrent user story:\n\n${state.currentStory}`
        : `${iteration.prompt}\n\n---\n\nCurrent user story:\n\n${state.currentStory}`;

      let responseContent: string;
      let tokenUsage: { inputTokens: number; outputTokens: number };

      // Use streaming if enabled
      if (this.streaming) {
        const handler = new StreamingHandler(iteration.id);
        
        // Forward streaming events to agent listeners
        // Set up error listener BEFORE calling sendMessageStreaming to ensure early errors propagate
        handler.on('start', (event) => {
          this.emit('stream', event);
        });
        handler.on('chunk', (event) => {
          this.emit('stream', event);
        });
        handler.on('complete', (event) => {
          this.emit('stream', event);
        });
        handler.on('error', (event) => {
          this.emit('stream', event);
        });

        const response = await this.claudeClient.sendMessageStreaming(
          {
            systemPrompt: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
            model: this.config.model,
          },
          handler
        );

        // Get content and usage directly from the return value
        responseContent = response.content;
        tokenUsage = response.usage;
      } else {
        // Call Claude API (with retry logic already in place)
        const response = await this.claudeClient.sendMessage({
          systemPrompt: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          model: this.config.model,
        });
        responseContent = response.content;
        tokenUsage = response.usage;
      }

      // Parse and validate structured output
      const parsedOutput = this.parseIterationOutput(responseContent, iteration.id);

      const durationMs = Date.now() - startTime;
      logger.info(
        `Completed: ${iteration.id} (${(durationMs / 1000).toFixed(1)}s, ` +
          `${tokenUsage.inputTokens} in / ${tokenUsage.outputTokens} out tokens)`
      );

      // Create iteration result with parsed changes
      const result: IterationResult = {
        iterationId: iteration.id,
        inputStory: state.currentStory,
        outputStory: parsedOutput.enhancedStory,
        changesApplied: parsedOutput.changesApplied,
        timestamp: new Date().toISOString(),
      };

      // Verify the iteration output if evaluator is enabled
      if (this.evaluator) {
        try {
          const verification = await this.evaluator.verify(
            state.currentStory,
            parsedOutput.enhancedStory,
            iteration.id,
            iteration.description
          );
          result.verification = verification;

          // Log warning if verification failed, but continue (non-blocking)
          if (!verification.passed) {
            logger.warn(
              `Verification failed for iteration "${iteration.id}": ${verification.reasoning} ` +
                `(score: ${verification.score}, issues: ${verification.issues.length})`
            );
          } else {
            logger.debug(
              `Verification passed for iteration "${iteration.id}": score=${verification.score}`
            );
          }
        } catch (error) {
          // Log error but don't block the workflow
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.warn(`Verification error for iteration "${iteration.id}": ${errorMessage}`);
        }
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      
      // Graceful degradation: if it's an AgentError (after retries), skip this iteration
      if (error instanceof AgentError) {
        logger.warn(
          `Iteration "${iteration.id}" failed after ${(durationMs / 1000).toFixed(1)}s and retries, skipping (${error.code}: ${error.message})`
        );
        
        // Track failed iteration in state
        state.failedIterations.push({
          id: iteration.id,
          error: error.message,
        });
        
        return null; // Signal that this iteration was skipped
      }
      
      // Re-throw unexpected errors (shouldn't happen, but be safe)
      throw error;
    }
  }

  /**
   * Parses and validates structured output from Claude response.
   * Falls back gracefully if parsing fails.
   *
   * @param response - Raw response text from Claude
   * @param iterationId - ID of the iteration for logging
   * @returns Parsed and validated iteration output
   */
  private parseIterationOutput(response: string, iterationId: string): IterationOutput {
    try {
      // Extract JSON from the response
      const json = extractJSON(response);
      if (!json) {
        throw new Error('No JSON found in response');
      }

      // Validate against schema
      const parsed = IterationOutputSchema.parse(json);

      // Log if confidence is provided
      if (parsed.confidence !== undefined) {
        logger.debug(`Iteration ${iterationId} confidence: ${parsed.confidence}`);
      }

      // Log changes applied
      if (parsed.changesApplied.length > 0) {
        logger.debug(
          `Iteration ${iterationId} applied ${parsed.changesApplied.length} changes: ` +
            parsed.changesApplied.map((c) => `${c.category}: ${c.description}`).join(', ')
        );
      }

      return parsed;
    } catch (error) {
      // Graceful fallback: use raw text as enhanced story
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(
        `Failed to parse structured output for iteration ${iterationId}, using raw text as fallback: ${errorMessage}`
      );

      // Return fallback structure - use response text or empty string
      const fallbackStory = response.trim();
      if (!fallbackStory) {
        throw new Error(`Iteration ${iterationId} returned an empty story. This may indicate an API error or invalid response.`);
      }

      // Check if the response is an error message before using it as fallback
      const errorIndicators = ['error:', 'failed:', 'i apologize', 'i cannot', 'sorry,'];
      const lowerResponse = fallbackStory.toLowerCase();
      if (errorIndicators.some(indicator => lowerResponse.includes(indicator))) {
        throw new Error(`Iteration ${iterationId} returned an error response: ${fallbackStory.substring(0, 100)}...`);
      }

      return {
        enhancedStory: fallbackStory,
        changesApplied: [],
        confidence: undefined,
      };
    }
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
