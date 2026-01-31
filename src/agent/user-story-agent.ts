/**
 * User Story Agent - Main agent class for processing user stories
 */

import { EventEmitter } from 'events';
import type { UserStoryAgentConfig, AgentResult, IterationOption, Pass2StoryInput, Pass2InterconnectionResult } from './types.js';
import { buildStoryInterconnectionPrompt } from '../prompts/iterations/story-interconnection.js';
import type { IterationRegistryEntry, IterationId } from '../shared/iteration-registry.js';
import type { StoryState, IterationResult } from './state/story-state.js';
import { ContextManager } from './state/context-manager.js';
import { ITERATION_REGISTRY, getIterationById, getApplicableIterations, getAllIterations, PRODUCT_TYPES, WORKFLOW_ORDER, type ProductType } from '../shared/iteration-registry.js';
import { SYSTEM_PROMPT } from '../prompts/system.js';
import { POST_PROCESSING_PROMPT, POST_PROCESSING_PROMPT_METADATA } from '../prompts/index.js';
import { createInitialState } from './state/story-state.js';
import { ClaudeClient } from './claude-client.js';
import { logger } from '../utils/logger.js';
import { IterationOutputSchema, AdvisorOutputSchema, SystemDiscoveryMentionsSchema, type IterationOutput } from '../shared/schemas.js';
import { extractJSON } from '../shared/json-utils.js';
import { AgentError } from '../shared/errors.js';
import { StreamingHandler } from './streaming.js';
import { Evaluator } from './evaluator.js';
import { SYSTEM_DISCOVERY_PROMPT } from '../prompts/iterations/system-discovery.js';
import { STORY_INTERCONNECTION_PROMPT } from '../prompts/iterations/story-interconnection.js';
import type { StoryForInterconnection } from '../prompts/iterations/story-interconnection.js';
import { IDRegistry, mintStableId, type EntityType } from './id-registry.js';
import { StoryRenderer } from './story-renderer.js';
import { StoryInterconnectionsSchema } from '../shared/schemas.js';
import type {
  SystemDiscoveryContext,
  SystemDiscoveryMentions,
  Component,
  ComponentGraph,
  SharedContracts,
  StateModel,
  EventDefinition,
  StandardState,
  ComponentRole,
  StoryInterconnections,
  GlobalConsistencyReport,
  FixPatch,
  StoryStructure,
  SectionPatch,
  AdvisorOutput,
  Relationship,
} from '../shared/types.js';
import { PatchOrchestrator } from './patch-orchestrator.js';
import { StoryJudge } from './story-judge.js';
import { StoryRewriter } from './story-rewriter.js';
import { mergeNewRelationships as mergeRelationships } from './relationship-merger.js';

/**
 * Classifies a canonical name as component, stateModel, or event based on which
 * mention array its mentions appear in. Prefers component > stateModel > event.
 */
function classifyCanonical(
  mentionsList: string[],
  compSet: Set<string>,
  stateSet: Set<string>,
  eventSet: Set<string>
): EntityType {
  for (const m of mentionsList) {
    if (compSet.has(m)) return 'component';
  }
  for (const m of mentionsList) {
    if (stateSet.has(m)) return 'stateModel';
  }
  for (const m of mentionsList) {
    if (eventSet.has(m)) return 'event';
  }
  return 'component';
}

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
   * Creates an empty StoryStructure for patch-based workflow.
   * Extracts title from markdown if present, otherwise uses 'Untitled'.
   * All other fields initialized as empty arrays or empty strings.
   *
   * Note: Does NOT parse full markdown content - only title extraction.
   *
   * @param markdown - Initial story markdown (may be empty)
   * @returns StoryStructure for patch-based workflow
   */
  private parseOrInitializeStructure(markdown: string): StoryStructure {
    return {
      storyStructureVersion: '1.0',
      systemContextDigest: '',
      generatedAt: new Date().toISOString(),
      title: this.extractTitle(markdown) || 'Untitled',
      story: { asA: '', iWant: '', soThat: '' },
      userVisibleBehavior: [],
      outcomeAcceptanceCriteria: [],
      systemAcceptanceCriteria: [],
      implementationNotes: {
        stateOwnership: [],
        dataFlow: [],
        apiContracts: [],
        loadingStates: [],
        performanceNotes: [],
        securityNotes: [],
        telemetryNotes: [],
      },
    };
  }

  /**
   * Extracts title from markdown (first # heading).
   *
   * @param markdown - Story markdown
   * @returns Title string or null if none
   */
  private extractTitle(markdown: string): string | null {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  /**
   * Pass 0: Run system discovery from story texts and optional reference documents.
   * Calls the LLM for mentions and canonical names, then mints stable IDs via the ID Registry.
   * Caller should assign the returned context to state.systemContext if needed.
   *
   * @param stories - Array of initial story texts (user stories to analyze)
   * @param referenceDocuments - Optional array of reference document texts
   * @returns SystemDiscoveryContext with stable IDs (COMP-*, C-STATE-*, E-*, DF-*)
   */
  async runPass0Discovery(
    stories: string[],
    referenceDocuments?: string[]
  ): Promise<SystemDiscoveryContext> {
    const contextParts: string[] = [];
    contextParts.push('## Stories to analyze\n');
    for (let i = 0; i < stories.length; i++) {
      contextParts.push(`### Story ${i + 1}\n${stories[i]}\n`);
    }
    if (referenceDocuments && referenceDocuments.length > 0) {
      contextParts.push('## Reference documents\n');
      for (let i = 0; i < referenceDocuments.length; i++) {
        contextParts.push(`### Document ${i + 1}\n${referenceDocuments[i]}\n`);
      }
    }
    const userMessage = contextParts.join('\n');

    const response = await this.claudeClient.sendMessage({
      systemPrompt: SYSTEM_DISCOVERY_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      model: this.config.model,
    });

    const parsed = this.parseSystemDiscoveryMentions(response.content);

    const compSet = new Set(parsed.mentions.components);
    const stateSet = new Set(parsed.mentions.stateModels);
    const eventSet = new Set(parsed.mentions.events);

    const registry = new IDRegistry();
    const canonicalToId = new Map<string, string>();
    const canonicalToEntityType = new Map<string, EntityType>();

    for (const canonical of Object.keys(parsed.canonicalNames)) {
      const mentionsList = parsed.canonicalNames[canonical] ?? [];
      const entityType = classifyCanonical(mentionsList, compSet, stateSet, eventSet);
      canonicalToEntityType.set(canonical, entityType);
      const stableId = mintStableId(canonical, entityType, registry);
      canonicalToId.set(canonical, stableId);
    }

    const components: Record<string, Component> = {};
    const stateModels: StateModel[] = [];
    const eventRegistry: EventDefinition[] = [];
    const standardStates: StandardState[] = [
      { type: 'loading', description: 'Data or action in progress' },
      { type: 'error', description: 'Error state' },
      { type: 'empty', description: 'No data' },
      { type: 'success', description: 'Data loaded or action completed' },
    ];

    for (const [canonical, id] of canonicalToId) {
      const entityType = canonicalToEntityType.get(canonical)!;
      const evidence = parsed.evidence[canonical] ?? '';
      if (entityType === 'component') {
        components[id] = {
          id,
          productName: canonical,
          description: evidence,
        };
      } else if (entityType === 'stateModel') {
        stateModels.push({
          id,
          name: canonical,
          description: evidence,
          owner: '',
          consumers: [],
        });
      } else if (entityType === 'event') {
        eventRegistry.push({
          id,
          name: canonical,
          payload: {},
          emitter: '',
          listeners: [],
        });
      }
    }

    const componentGraph: ComponentGraph = {
      components,
      compositionEdges: [],
      coordinationEdges: [],
      dataFlows: [],
    };
    const sharedContracts: SharedContracts = {
      stateModels,
      eventRegistry,
      standardStates,
      dataFlows: [],
    };
    const componentRoles: ComponentRole[] = [];
    const productVocabulary = { ...parsed.vocabulary };

    return {
      componentGraph,
      sharedContracts,
      componentRoles,
      productVocabulary,
      timestamp: new Date().toISOString(),
      referenceDocuments: referenceDocuments?.length ? referenceDocuments : undefined,
    };
  }

  /**
   * Parses LLM response from system discovery prompt into mentions structure.
   * Handles wrapped responses (e.g., "Here's the result: {...}").
   *
   * @param content - Raw LLM response content
   * @returns SystemDiscoveryMentions with canonical names
   * @throws Error if no valid JSON or schema validation fails
   */
  private parseSystemDiscoveryMentions(content: string): SystemDiscoveryMentions {
    const json = extractJSON(content);
    if (!json || typeof json !== 'object') {
      throw new Error('Pass 0: No valid JSON in LLM response');
    }
    return SystemDiscoveryMentionsSchema.parse(json) as SystemDiscoveryMentions;
  }

  /**
   * Pass 2: Run interconnection for each story.
   * Extracts UI mapping, contract dependencies, ownership, and related stories.
   * Appends metadata sections to markdown.
   *
   * @param stories - Array of story markdown strings with IDs
   * @param systemContext - System discovery context from Pass 0
   * @returns Array of story results with interconnections
   */
  async runPass2Interconnection(
    stories: Pass2StoryInput[],
    systemContext: SystemDiscoveryContext
  ): Promise<Pass2InterconnectionResult> {
    const allStories: StoryForInterconnection[] = stories.map((s) => ({
      id: s.id,
      title: this.extractTitle(s.content) || s.id,
      content: s.content,
    }));

    const results: Pass2InterconnectionResult = [];

    for (const story of stories) {
      logger.info(`Running Pass 2 interconnection for ${story.id}`);

      const prompt = buildStoryInterconnectionPrompt(story.content, allStories, systemContext);

      const response = await this.claudeClient.sendMessage({
        systemPrompt: STORY_INTERCONNECTION_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        model: this.config.model,
      });

      const interconnections = this.parseInterconnections(response.content);

      if (interconnections.storyId !== story.id) {
        logger.warn(`Story ID mismatch: expected ${story.id}, got ${interconnections.storyId}`);
        interconnections.storyId = story.id;
      }

      const normalized: StoryInterconnections = {
        storyId: story.id,
        uiMapping: interconnections.uiMapping ?? {},
        contractDependencies: Array.isArray(interconnections.contractDependencies) ? interconnections.contractDependencies : [],
        ownership: {
          ownsState: interconnections.ownership?.ownsState ?? [],
          consumesState: interconnections.ownership?.consumesState ?? [],
          emitsEvents: interconnections.ownership?.emitsEvents ?? [],
          listensToEvents: interconnections.ownership?.listensToEvents ?? [],
        },
        relatedStories: Array.isArray(interconnections.relatedStories) ? interconnections.relatedStories : [],
      };

      const renderer = new StoryRenderer();
      const updatedContent = renderer.appendInterconnectionMetadata(story.content, normalized);

      results.push({
        id: story.id,
        content: updatedContent,
        interconnections: normalized,
      });
    }

    return results;
  }

  /**
   * Parses LLM response from Pass 2 interconnection prompt.
   * Handles wrapped responses and validates against schema.
   *
   * @param content - Raw LLM response content
   * @returns Parsed StoryInterconnections
   * @throws Error if no valid JSON or schema validation fails
   */
  private parseInterconnections(content: string): StoryInterconnections {
    const json = extractJSON(content);
    if (!json || typeof json !== 'object') {
      throw new Error('Pass 2: No valid JSON in interconnection response');
    }
    return StoryInterconnectionsSchema.parse(json) as StoryInterconnections;
  }

  /**
   * Processes a user story with optional system context.
   *
   * @param story - Initial user story markdown
   * @param options - Optional processing options (e.g. systemContext for judge/rewrite)
   * @returns Promise resolving to the agent result
   */
  async processUserStory(
    story: string,
    options?: { systemContext?: SystemDiscoveryContext }
  ): Promise<AgentResult> {
    // Validate input early for clear error message
    if (!story || story.trim().length === 0) {
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
    let state = createInitialState(story);
    if (this.config.productContext) {
      state.productContext = this.config.productContext;
    }

    // Initialize StoryStructure for patch-based workflow
    state.storyStructure = this.parseOrInitializeStructure(story);

    const systemContext = options?.systemContext;

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

      // Final rendering from StoryStructure when last iteration used patches
      // Only render if the most recent iteration used patch-based workflow
      if (state.storyStructure && state.lastIterationUsedPatchWorkflow) {
        const renderer = new StoryRenderer();
        state.currentStory = renderer.toMarkdown(state.storyStructure);
      }

      // Pass 1c: Judge and potentially rewrite (with optional system context)
      state = await this.judgeAndRewrite(state, systemContext);

      // Build summary (includes failed iterations if any)
      const summary = this.contextManager.buildConclusionSummary(state);

      return {
        success: true,
        originalStory: state.originalStory,
        enhancedStory: state.currentStory,
        appliedIterations: state.appliedIterations,
        iterationResults: state.iterationResults,
        summary: summary || 'No iterations were applied.',
        judgeResults: state.judgeResults,
        needsManualReview: state.needsManualReview,
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
        judgeResults: state.judgeResults,
        needsManualReview: state.needsManualReview,
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
      const inputStoryForResult = state.currentStory;

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

      const durationMs = Date.now() - startTime;
      logger.info(
        `Completed: ${iteration.id} (${(durationMs / 1000).toFixed(1)}s, ` +
          `${tokenUsage.inputTokens} in / ${tokenUsage.outputTokens} out tokens)`
      );

      // Try patch-based workflow first (AdvisorOutput)
      const advisorOutput = this.parseAdvisorOutput(responseContent);
      let result: IterationResult;
      if (advisorOutput && state.storyStructure) {
        const orchestrator = new PatchOrchestrator();
        const allowedPaths = iteration.allowedPaths ?? [];
        const { result: newStructure, metrics } = orchestrator.applyPatches(
          state.storyStructure,
          advisorOutput.patches,
          allowedPaths
        );
        state.storyStructure = newStructure;
        // Only set flag when patches were actually applied (not just valid AdvisorOutput with 0 patches applied)
        if (metrics.applied > 0) {
          state.lastIterationUsedPatchWorkflow = true;
        } else {
          state.lastIterationUsedPatchWorkflow = false;
        }
        const renderer = new StoryRenderer();
        state.currentStory = renderer.toMarkdown(state.storyStructure);

        if (metrics.rejectedPath > 0 || metrics.rejectedValidation > 0) {
          logger.info(
            `Iteration ${iteration.id}: applied ${metrics.applied}/${metrics.totalPatches} patches ` +
              `(${metrics.rejectedPath} rejected: path, ${metrics.rejectedValidation} rejected: validation)`
          );
        }

        result = {
          iterationId: iteration.id,
          inputStory: inputStoryForResult,
          outputStory: state.currentStory,
          changesApplied:
            metrics.applied > 0
              ? [{ category: 'patches', description: `Applied ${metrics.applied} patch(es)` }]
              : [],
          timestamp: new Date().toISOString(),
        };
      } else {
        // Fallback: treat response as IterationOutput (markdown-based)
        state.lastIterationUsedPatchWorkflow = false;
        const parsedOutput = this.parseIterationOutput(responseContent, iteration.id);
        result = {
          iterationId: iteration.id,
          inputStory: inputStoryForResult,
          outputStory: parsedOutput.enhancedStory,
          changesApplied: parsedOutput.changesApplied,
          timestamp: new Date().toISOString(),
        };
      }

      // Verify the iteration output if evaluator is enabled
      if (this.evaluator) {
        try {
          const verification = await this.evaluator.verify(
            inputStoryForResult,
            result.outputStory,
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

  /**
   * Parses LLM response as AdvisorOutput (structured patches).
   * Returns null if content is not valid AdvisorOutput.
   *
   * @param content - Raw response text from Claude
   * @returns Parsed AdvisorOutput or null
   */
  private parseAdvisorOutput(content: string): AdvisorOutput | null {
    try {
      const json = extractJSON(content);
      if (!json || typeof json !== 'object') return null;

      const parsed = AdvisorOutputSchema.safeParse(json);
      if (!parsed.success) {
        logger.debug(`Failed to parse AdvisorOutput: ${parsed.error.message}`);
        return null;
      }

      return parsed.data as AdvisorOutput;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.debug(`Error parsing AdvisorOutput: ${message}`);
      return null;
    }
  }

  /**
   * Judges the current story and rewrites if quality is below threshold.
   * Pass 1c: Judge after generation
   * Pass 1b: Rewrite if needed
   *
   * @param state - Current story state
   * @param systemContext - System discovery context (optional)
   * @returns Updated state with judge results
   */
  private async judgeAndRewrite(
    state: StoryState,
    systemContext?: SystemDiscoveryContext
  ): Promise<StoryState> {
    const QUALITY_THRESHOLD = 3.5;

    const judge = new StoryJudge(this.claudeClient);
    const judgeResult = await judge.judgeStory(
      state.currentStory,
      systemContext ?? this.buildEmptySystemContext()
    );

    logger.info(
      `Story quality score: ${judgeResult.overallScore}/5 (threshold: ${QUALITY_THRESHOLD})`
    );

    const updatedState: StoryState = {
      ...state,
      judgeResults: {
        pass1c: judgeResult,
      },
    };

    if (judgeResult.overallScore < QUALITY_THRESHOLD) {
      logger.info(`Score below threshold, triggering rewrite (Pass 1b)`);

      const rewriter = new StoryRewriter(this.claudeClient);
      const rewrittenStory = await rewriter.rewriteForSectionSeparation(
        state.currentStory,
        judgeResult,
        systemContext ?? this.buildEmptySystemContext()
      );

      updatedState.currentStory = rewrittenStory;

      const rejudgeResult = await judge.judgeStory(
        rewrittenStory,
        systemContext ?? this.buildEmptySystemContext()
      );

      logger.info(`Quality after rewrite: ${rejudgeResult.overallScore}/5`);

      updatedState.judgeResults = {
        pass1c: judgeResult,
        pass1cAfterRewrite: rejudgeResult,
      };

      if (rejudgeResult.overallScore < QUALITY_THRESHOLD) {
        logger.warn(`Story still below quality threshold after rewrite`);
        updatedState.needsManualReview = {
          reason: 'low-quality-after-rewrite',
          score: rejudgeResult.overallScore,
        };
      }
    }

    return updatedState;
  }

  /**
   * Builds an empty SystemDiscoveryContext for judge/rewrite when none available.
   */
  private buildEmptySystemContext(): SystemDiscoveryContext {
    return {
      componentGraph: {
        components: {},
        compositionEdges: [],
        coordinationEdges: [],
        dataFlows: [],
      },
      sharedContracts: {
        stateModels: [],
        eventRegistry: [],
        standardStates: [],
        dataFlows: [],
      },
      componentRoles: [],
      productVocabulary: {},
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Merges new relationships into system context.
   *
   * @param context - Current system context
   * @param relationships - New relationships to merge
   * @returns Updated context and count of merged relationships
   */
  private async mergeNewRelationships(
    context: SystemDiscoveryContext,
    relationships: Relationship[]
  ): Promise<{ updatedContext: SystemDiscoveryContext; mergedCount: number }> {
    const result = mergeRelationships(context, relationships);

    // Log manual review items if any
    if (result.manualReview.length > 0) {
      logger.warn(
        `${result.manualReview.length} relationships require manual review:\n` +
        result.manualReview.map((mr) => `  - ${mr.relationship.id}: ${mr.reason}`).join('\n')
      );
    }

    return {
      updatedContext: result.updatedContext,
      mergedCount: result.mergedCount,
    };
  }

  /**
   * Runs Pass 1 with refinement loop.
   * After each story, checks if judge discovered new relationships.
   * If high-confidence relationships found (≥ 0.75), merges them and re-runs Pass 1.
   * Max 3 rounds to prevent infinite loops.
   *
   * @param stories - Array of user story markdown strings
   * @param systemContext - System discovery context from Pass 0
   * @returns Array of enhanced story results with final context
   */
  async runPass1WithRefinement(
    stories: string[],
    systemContext: SystemDiscoveryContext
  ): Promise<{ results: AgentResult[]; finalContext: SystemDiscoveryContext }> {
    const MAX_ROUNDS = 3;
    const CONFIDENCE_THRESHOLD = 0.75;

    let currentContext = systemContext;
    let roundNumber = 1;

    while (roundNumber <= MAX_ROUNDS) {
      logger.info(`Refinement round ${roundNumber}/${MAX_ROUNDS}`);

      // Run Pass 1 for all stories with current context
      const results: AgentResult[] = [];
      const allNewRelationships: Relationship[] = [];

      for (const story of stories) {
        const result = await this.processUserStory(story, { systemContext: currentContext });
        results.push(result);

        const relationships = result.judgeResults?.pass1c?.newRelationships ?? [];
        allNewRelationships.push(...relationships);
      }

      // Filter by confidence threshold
      const highConfidenceRelationships = allNewRelationships.filter((rel) => {
        const confidence = rel.confidence ?? 0;
        return confidence >= CONFIDENCE_THRESHOLD;
      });

      logger.info(
        `Refinement round ${roundNumber}: discovered ${allNewRelationships.length} relationships, ` +
          `${highConfidenceRelationships.length} high-confidence (≥ ${CONFIDENCE_THRESHOLD})`
      );

      if (highConfidenceRelationships.length === 0) {
        logger.info(`Convergence: no new high-confidence relationships, stopping at round ${roundNumber}`);
        return { results, finalContext: currentContext };
      }

      const { updatedContext, mergedCount } = await this.mergeNewRelationships(
        currentContext,
        highConfidenceRelationships
      );

      logger.info(`Refinement round ${roundNumber}: merged ${mergedCount} relationships`);

      if (mergedCount === 0) {
        logger.info(`Convergence: no relationships merged (all duplicates), stopping at round ${roundNumber}`);
        return { results, finalContext: currentContext };
      }

      currentContext = updatedContext;
      roundNumber++;

      logger.info(`Restarting Pass 1 with updated context (${mergedCount} new relationships)`);
    }

    logger.warn(`Convergence: max rounds (${MAX_ROUNDS}) reached`);

    // Run final Pass 1 with converged context
    const finalResults: AgentResult[] = [];
    for (const story of stories) {
      const result = await this.processUserStory(story, { systemContext: currentContext });
      finalResults.push(result);
    }

    return { results: finalResults, finalContext: currentContext };
  }

  /**
   * Applies a single consistency fix to a story structure via PatchOrchestrator.
   *
   * @param story - Current story structure
   * @param fix - Fix patch from global consistency report
   * @returns Updated story structure and whether the patch was applied
   */
  private applyConsistencyFix(
    story: StoryStructure,
    fix: FixPatch
  ): { structure: StoryStructure; applied: boolean } {
    const patch: SectionPatch = {
      op: fix.operation,
      path: fix.path,
      item: fix.item,
      match: fix.match,
      metadata: { advisorId: 'global-consistency', reasoning: fix.reasoning },
    };

    const orchestrator = new PatchOrchestrator();
    const { result, metrics } = orchestrator.applyPatches(story, [patch], [fix.path]);

    return {
      structure: result,
      applied: metrics.applied > 0,
    };
  }

  /**
   * Auto-applies high-confidence consistency fixes from a global consistency report.
   * Only applies fixes with confidence > 0.8 and allowed types. Updates StoryStructure
   * then re-renders markdown for each affected story.
   *
   * @param stories - Map of storyId to { structure, markdown }
   * @param report - Global consistency report (issues + fixes)
   * @returns Map of storyId to updated { structure, markdown }
   */
  async applyGlobalConsistencyFixes(
    stories: Map<string, { structure: StoryStructure; markdown: string }>,
    report: GlobalConsistencyReport
  ): Promise<Map<string, { structure: StoryStructure; markdown: string }>> {
    const HIGH_CONFIDENCE_THRESHOLD = 0.8;
    const ALLOWED_TYPES = [
      'add-bidirectional-link',
      'normalize-contract-id',
      'normalize-term-to-vocabulary',
    ] as const;

    const applicableFixes = report.fixes.filter(
      (f) => f.confidence > HIGH_CONFIDENCE_THRESHOLD && ALLOWED_TYPES.includes(f.type)
    );
    const applicableSet = new Set(applicableFixes);

    for (const fix of report.fixes) {
      if (applicableSet.has(fix)) continue;
      const reason =
        fix.confidence <= HIGH_CONFIDENCE_THRESHOLD ? 'low confidence' : 'disallowed type';
      logger.warn(
        `Fix flagged for manual review: ${fix.type} story ${fix.storyId} (${reason})`
      );
    }

    logger.info(
      `Auto-applying ${applicableFixes.length} high-confidence fixes (${report.fixes.length - applicableFixes.length} flagged for manual review)`
    );

    const updated = new Map(stories);

    for (const fix of applicableFixes) {
      const entry = updated.get(fix.storyId);
      if (!entry) {
        logger.warn(`Story ${fix.storyId} not found, skipping fix`);
        continue;
      }

      const { structure: updatedStructure, applied } = this.applyConsistencyFix(entry.structure, fix);

      if (applied) {
        const renderer = new StoryRenderer();
        const updatedMarkdown = renderer.toMarkdown(updatedStructure);
        updated.set(fix.storyId, { structure: updatedStructure, markdown: updatedMarkdown });
        logger.info(`Auto-applied fix: ${fix.type} to story ${fix.storyId} at ${fix.path}`);
      } else {
        // Patch didn't apply - keep existing entry unchanged
        logger.warn(`Failed to apply fix: ${fix.type} to ${fix.storyId}`);
      }
    }

    return updated;
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
