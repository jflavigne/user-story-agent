/**
 * Agent configuration and result types
 */

import type { ImageInput } from '../utils/image-utils.js';
import type { ArtifactConfig } from '../utils/artifact-types.js';
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
import type { ClaudeClient } from './claude-client.js';

/** Operation types that can have per-operation model overrides */
export type OperationType =
  | 'discovery'
  | 'iteration'
  | 'judge'
  | 'rewrite'
  | 'interconnection'
  | 'globalJudge'
  | 'evaluator'
  | 'titleGeneration';

/** Per-operation model overrides; each field is optional and falls back to default */
export interface ModelConfig {
  default?: string;
  discovery?: string;
  iteration?: string;
  judge?: string;
  rewrite?: string;
  interconnection?: string;
  globalJudge?: string;
  evaluator?: string;
  titleGeneration?: string;
}

/** Quality presets: balanced (cost/quality), premium (best quality), fast (speed) */
export type QualityPreset = 'balanced' | 'premium' | 'fast';

/** Model IDs used in quality presets */
const OPUS_4_5 = 'claude-opus-4-20250514';
const SONNET_4_5 = 'claude-sonnet-4-20250514';
const HAIKU_4_5 = 'claude-3-5-haiku-20241022';

/** Quality preset configurations (per-operation model assignment) */
export const QUALITY_PRESETS: Record<QualityPreset, ModelConfig> = {
  balanced: {
    discovery: OPUS_4_5,
    iteration: HAIKU_4_5,
    judge: OPUS_4_5,
    rewrite: SONNET_4_5,
    interconnection: SONNET_4_5,
    globalJudge: OPUS_4_5,
    evaluator: HAIKU_4_5,
    titleGeneration: HAIKU_4_5,
  },
  premium: {
    default: OPUS_4_5,
    discovery: OPUS_4_5,
    iteration: OPUS_4_5,
    judge: OPUS_4_5,
    rewrite: OPUS_4_5,
    interconnection: OPUS_4_5,
    globalJudge: OPUS_4_5,
    evaluator: OPUS_4_5,
    titleGeneration: HAIKU_4_5,
  },
  fast: {
    discovery: SONNET_4_5,
    iteration: HAIKU_4_5,
    judge: SONNET_4_5,
    rewrite: SONNET_4_5,
    interconnection: SONNET_4_5,
    globalJudge: SONNET_4_5,
    evaluator: HAIKU_4_5,
    titleGeneration: HAIKU_4_5,
  },
};

/** Preset names that are not sent as API model IDs */
const PRESET_NAMES: readonly QualityPreset[] = ['balanced', 'premium', 'fast'];

/**
 * Returns the unique set of model IDs used in QUALITY_PRESETS.
 * Single source of truth; no separate hardcoded list.
 */
export function getKnownModelIds(): string[] {
  const ids = new Set<string>();
  for (const preset of Object.values(QUALITY_PRESETS)) {
    for (const value of Object.values(preset)) {
      if (typeof value === 'string') {
        ids.add(value);
      }
    }
  }
  return [...ids];
}

/**
 * Validates a raw model ID string. Throws if the ID is not known and does not start with 'claude-'.
 *
 * @param id - Model ID to validate (e.g. from config or ModelConfig)
 * @throws {Error} If the model ID is invalid
 */
export function validateModelId(id: string): void {
  const known = getKnownModelIds();
  if (known.includes(id) || id.startsWith('claude-')) {
    return;
  }
  throw new Error(
    `Invalid model: ${id}. Use a quality preset (balanced, premium, fast), a known model ID (${known.join(', ')}), or any ID starting with 'claude-'.`
  );
}

/**
 * Returns true if the string is a quality preset name (not a raw model ID).
 */
export function isQualityPreset(value: string): value is QualityPreset {
  return PRESET_NAMES.includes(value as QualityPreset);
}

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
  /** Optional model: single string, quality preset ('balanced' | 'premium' | 'fast'), or per-operation ModelConfig (default: balanced) */
  model?: string | ModelConfig | QualityPreset;
  /** Callback for iteration selection (required for interactive mode) */
  onIterationSelection?: IterationSelectionCallback;
  /** Maximum number of retry attempts for API calls (defaults to 3) */
  maxRetries?: number;
  /** Whether to enable streaming output (defaults to false) */
  streaming?: boolean;
  /** Stream creation timeout in milliseconds (defaults to 60000) */
  streamTimeout?: number;
  /** Whether to verify each iteration's output (defaults to false) */
  verify?: boolean;
  /** When true (default), throw on evaluator crash; when false, return with evaluationFailed flag */
  strictEvaluation?: boolean;
  /** Optional Claude client (for testing/benchmarking); when set, apiKey is not required */
  claudeClient?: ClaudeClient;
  /** Optional mockup images for vision analysis (Pass 0 and vision-enabled iterations) */
  mockupImages?: ImageInput[];
  /** Optional artifact configuration for persisting pipeline outputs */
  artifactConfig?: ArtifactConfig;
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
    needsManualReview?: { reason: string; score: number };
  }>;
  consistencyReport: GlobalConsistencyReport;
  metadata: {
    passesCompleted: string[];
    refinementRounds: number;
    fixesApplied: number;
    fixesFlaggedForReview: number;
    /** Number of high-confidence fixes that were attempted but rejected by patch application */
    fixesRejected?: number;
    /** Number of stories for which title generation failed (kept as "Untitled") */
    titleGenerationFailures?: number;
    /** USA-78: When empty stories were passed and Pass 0 did not produce a plan */
    planMessage?: string;
  };
}
