/**
 * Unit tests for per-operation model selection and quality presets.
 * Validates normalization, resolution fallback, and that Judge/Rewriter/Evaluator receive configured models.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QUALITY_PRESETS,
  MODEL_PINNING_LAST_UPDATED,
} from '../src/agent/types.js';
import type { ModelConfig, QualityPreset, UserStoryAgentConfig } from '../src/agent/types.js';
import { mergeConfigWithDefaults } from '../src/agent/config.js';
import { UserStoryAgent, createAgent } from '../src/agent/user-story-agent.js';
import { ClaudeClient } from '../src/agent/claude-client.js';
import { StoryJudge } from '../src/agent/story-judge.js';
import { StoryRewriter } from '../src/agent/story-rewriter.js';
import { Evaluator } from '../src/agent/evaluator.js';
import { UNIFIED_STORY_JUDGE_RUBRIC } from '../src/prompts/judge-rubrics/unified-story-judge.js';
import { SECTION_SEPARATION_REWRITER_PROMPT } from '../src/prompts/rewriter/section-separation.js';
import { EVALUATOR_SYSTEM_PROMPT } from '../src/prompts/evaluator-prompt.js';

describe('QUALITY_PRESETS', () => {
  it('exports MODEL_PINNING_LAST_UPDATED for version pinning docs', () => {
    expect(MODEL_PINNING_LAST_UPDATED).toBe('2026-02-06');
  });

  it('defines balanced, premium, and fast presets', () => {
    expect(QUALITY_PRESETS.balanced).toBeDefined();
    expect(QUALITY_PRESETS.premium).toBeDefined();
    expect(QUALITY_PRESETS.fast).toBeDefined();
  });

  it('balanced preset assigns discovery, judge, globalJudge to opus; iteration, evaluator to haiku; rewrite, interconnection to sonnet', () => {
    const b = QUALITY_PRESETS.balanced;
    const opus = 'claude-opus-4-20250514';
    const sonnet = 'claude-sonnet-4-20250514';
    const haiku = 'claude-3-5-haiku-20241022';
    expect(b.discovery).toBe(opus);
    expect(b.judge).toBe(opus);
    expect(b.globalJudge).toBe(opus);
    expect(b.iteration).toBe(haiku);
    expect(b.evaluator).toBe(haiku);
    expect(b.rewrite).toBe(sonnet);
    expect(b.interconnection).toBe(sonnet);
  });

  it('premium preset uses opus for all operations', () => {
    const opus = 'claude-opus-4-20250514';
    const haiku = 'claude-3-5-haiku-20241022';
    const p = QUALITY_PRESETS.premium;
    expect(p.default).toBe(opus);
    expect(p.discovery).toBe(opus);
    expect(p.iteration).toBe(opus);
    expect(p.judge).toBe(opus);
    expect(p.rewrite).toBe(opus);
    expect(p.interconnection).toBe(opus);
    expect(p.globalJudge).toBe(opus);
    expect(p.evaluator).toBe(opus);
    expect(p.titleGeneration).toBe(haiku);
  });

  it('fast preset uses sonnet for discovery/judge/rewrite/interconnection/globalJudge and haiku for iteration/evaluator/titleGeneration', () => {
    const sonnet = 'claude-sonnet-4-20250514';
    const haiku = 'claude-3-5-haiku-20241022';
    const f = QUALITY_PRESETS.fast;
    expect(f.discovery).toBe(sonnet);
    expect(f.judge).toBe(sonnet);
    expect(f.rewrite).toBe(sonnet);
    expect(f.interconnection).toBe(sonnet);
    expect(f.globalJudge).toBe(sonnet);
    expect(f.iteration).toBe(haiku);
    expect(f.evaluator).toBe(haiku);
    expect(f.titleGeneration).toBe(haiku);
  });
});

describe('mergeConfigWithDefaults model', () => {
  it('defaults model to balanced when not provided', () => {
    const merged = mergeConfigWithDefaults({ mode: 'individual', iterations: ['validation'] });
    expect(merged.model).toBe('balanced');
  });

  it('preserves string model', () => {
    const merged = mergeConfigWithDefaults({
      mode: 'individual',
      iterations: ['validation'],
      model: 'claude-sonnet-4-20250514',
    });
    expect(merged.model).toBe('claude-sonnet-4-20250514');
  });

  it('preserves quality preset', () => {
    const merged = mergeConfigWithDefaults({
      mode: 'individual',
      iterations: ['validation'],
      model: 'premium',
    });
    expect(merged.model).toBe('premium');
  });
});

describe('UserStoryAgent model config normalization and resolution', () => {
  it('uses single string model for all operations (backward compatibility)', async () => {
    const mockSendMessage = vi.fn();
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({
        enhancedStory: 'Enhanced',
        changesApplied: [],
      }),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    const mockClient = {
      sendMessage: mockSendMessage,
      sendMessageStreaming: vi.fn(),
    } as unknown as ClaudeClient;
    vi.spyOn(ClaudeClient.prototype, 'constructor').mockImplementation(() => undefined as never);
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
      claudeClient: mockClient,
    };
    const agent = createAgent(config);
    // Resolve model via agent's public behavior: create a Judge with the same config and call resolveModel
    const judge = new (StoryJudge as unknown as typeof import('../src/agent/story-judge.js').StoryJudge)(
      mockClient,
      (agent as unknown as { resolveModel: (op: string) => string | undefined }).resolveModel
    );
    const resolved = (agent as unknown as { resolveModel: (op: string) => string | undefined }).resolveModel('judge');
    expect(resolved).toBe('claude-sonnet-4-20250514');
  });

  it('resolveModel returns operation-specific model for preset', () => {
    const mockClient = { sendMessage: vi.fn(), sendMessageStreaming: vi.fn() } as unknown as ClaudeClient;
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
      apiKey: 'key',
      model: 'balanced',
      claudeClient: mockClient,
    };
    const agent = new UserStoryAgent(config);
    const resolve = (agent as unknown as { resolveModel: (op: string) => string | undefined }).resolveModel.bind(agent);
    expect(resolve('discovery')).toBe(QUALITY_PRESETS.balanced.discovery);
    expect(resolve('iteration')).toBe(QUALITY_PRESETS.balanced.iteration);
    expect(resolve('judge')).toBe(QUALITY_PRESETS.balanced.judge);
    expect(resolve('rewrite')).toBe(QUALITY_PRESETS.balanced.rewrite);
    expect(resolve('interconnection')).toBe(QUALITY_PRESETS.balanced.interconnection);
    expect(resolve('globalJudge')).toBe(QUALITY_PRESETS.balanced.globalJudge);
    expect(resolve('evaluator')).toBe(QUALITY_PRESETS.balanced.evaluator);
    expect(resolve('titleGeneration')).toBe(QUALITY_PRESETS.balanced.titleGeneration);
  });

  it('resolveModel falls back to default for ModelConfig when operation not set', () => {
    const mockClient = { sendMessage: vi.fn(), sendMessageStreaming: vi.fn() } as unknown as ClaudeClient;
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
      apiKey: 'key',
      model: { default: 'claude-default', judge: 'claude-judge' } as ModelConfig,
      claudeClient: mockClient,
    };
    const agent = new UserStoryAgent(config);
    const resolve = (agent as unknown as { resolveModel: (op: string) => string | undefined }).resolveModel.bind(agent);
    expect(resolve('judge')).toBe('claude-judge');
    expect(resolve('discovery')).toBe('claude-default');
    expect(resolve('iteration')).toBe('claude-default');
  });
});

describe('Judge/Rewriter/Evaluator receive configured model (bug fix)', () => {
  it('StoryJudge.sendMessage receives model from resolveModel("judge")', async () => {
    const mockSendMessage = vi.fn();
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({
        sectionSeparation: { score: 4, reasoning: 'Ok', violations: [] },
        correctnessVsSystemContext: { score: 4, reasoning: '', hallucinations: [] },
        testability: { outcomeAC: { score: 4, reasoning: '' }, systemAC: { score: 4, reasoning: '' } },
        completeness: { score: 4, reasoning: '', missingElements: [] },
        overallScore: 4,
        recommendation: 'approve',
        newRelationships: [],
        needsSystemContextUpdate: false,
        confidenceByRelationship: {},
      }),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 80 },
    });
    const mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
    const resolveModel = vi.fn((op: string) => (op === 'judge' ? 'custom-judge-model' : undefined));
    const judge = new StoryJudge(mockClient, resolveModel);
    const systemContext = {
      timestamp: new Date().toISOString(),
      componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
      sharedContracts: { stateModels: [], eventRegistry: [], standardStates: [], dataFlows: [] },
      componentRoles: [],
      productVocabulary: {},
    };
    await judge.judgeStory('# Story\n\nAs a user...', systemContext);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: UNIFIED_STORY_JUDGE_RUBRIC,
        model: 'custom-judge-model',
      })
    );
  });

  it('StoryRewriter.sendMessage receives model from resolveModel("rewrite")', async () => {
    const mockSendMessage = vi.fn();
    mockSendMessage.mockResolvedValue({
      content: '# Title\n\n## User Story\n\nAs a **user**...',
      stopReason: 'end_turn',
      usage: { inputTokens: 80, outputTokens: 60 },
    });
    const mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
    const resolveModel = vi.fn((op: string) => (op === 'rewrite' ? 'custom-rewrite-model' : undefined));
    const rewriter = new StoryRewriter(mockClient, resolveModel);
    const systemContext = {
      timestamp: new Date().toISOString(),
      componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
      sharedContracts: { stateModels: [], eventRegistry: [], standardStates: [], dataFlows: [] },
      componentRoles: [],
      productVocabulary: {},
    };
    await rewriter.rewriteForSectionSeparation('# Story\n\nAs a user...', [], systemContext);
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: SECTION_SEPARATION_REWRITER_PROMPT,
        model: 'custom-rewrite-model',
      })
    );
  });

  it('Evaluator.sendMessage receives model from resolveModel("evaluator")', async () => {
    const mockSendMessage = vi.fn();
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({
        passed: true,
        score: 0.9,
        reasoning: 'Good',
        issues: [],
      }),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    const mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
    const resolveModel = vi.fn((op: string) => (op === 'evaluator' ? 'custom-evaluator-model' : undefined));
    const evaluator = new Evaluator(mockClient, resolveModel);
    await evaluator.verify('Original', 'Enhanced', 'validation', 'Validate');
    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: EVALUATOR_SYSTEM_PROMPT,
        model: 'custom-evaluator-model',
      })
    );
  });
});
