/**
 * Unit tests for story-judge.ts with mock LLM responses.
 * Includes edge-case tests for LLM output variability (USA-34).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StoryJudge,
  parseJudgeRubric,
  parseGlobalConsistencyReport,
} from '../../src/agent/story-judge.js';
import type { ClaudeClient } from '../../src/agent/claude-client.js';
import type { SystemDiscoveryContext } from '../../src/shared/types.js';

const mockJudgeRubric = {
  sectionSeparation: { score: 4, reasoning: 'Good', violations: [] as Array<{ section: string; quote: string; suggestedRewrite: string }> },
  correctnessVsSystemContext: { score: 5, reasoning: 'Aligned', hallucinations: [] },
  testability: {
    outcomeAC: { score: 4, reasoning: 'Testable' },
    systemAC: { score: 4, reasoning: 'Testable' },
  },
  completeness: { score: 4, reasoning: 'Complete', missingElements: [] },
  overallScore: 4,
  recommendation: 'approve' as const,
  newRelationships: [] as Array<{ id: string; type: 'component' | 'event' | 'stateModel' | 'dataFlow'; operation: 'add_node' | 'add_edge' | 'edit_node' | 'edit_edge'; name: string; evidence: string }>,
  needsSystemContextUpdate: false,
  confidenceByRelationship: {} as Record<string, number>,
};

describe('StoryJudge', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let judge: StoryJudge;
  const systemContext: SystemDiscoveryContext = {
    timestamp: new Date().toISOString(),
    componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
    sharedContracts: { stateModels: [], eventRegistry: [], standardStates: [], dataFlows: [] },
    componentRoles: [],
    productVocabulary: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    const mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
    judge = new StoryJudge(mockClient);
  });

  it('returns parsed JudgeRubric from mock LLM response', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(mockJudgeRubric),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 80 },
    });

    const result = await judge.judgeStory('# Story\n\nAs a user...', systemContext);

    expect(result.recommendation).toBe('approve');
    expect(result.overallScore).toBe(4);
    expect(result.sectionSeparation.score).toBe(4);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });

  it('throws when LLM response has no valid JSON', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'Here are my thoughts: no JSON here',
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 20 },
    });

    await expect(judge.judgeStory('story', systemContext)).rejects.toThrow('No valid JSON');
  });

  it('throws when parsed JSON fails schema validation', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({ recommendation: 'approve' }), // missing required fields
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 20 },
    });

    await expect(judge.judgeStory('story', systemContext)).rejects.toThrow('Invalid judge rubric');
  });

  it('returns GlobalConsistencyReport from mock LLM response', async () => {
    const reportWithIssue = {
      issues: [{ description: 'Terminology mismatch', suggestedFixType: 'normalize-term', confidence: 0.8, affectedStories: ['1', '2'] }],
      fixes: [],
    };
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(reportWithIssue),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const result = await judge.judgeGlobalConsistency(['# S1', '# S2'], systemContext);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].description).toBe('Terminology mismatch');
    expect(result.fixes).toEqual([]);
  });

  it('returns fallback report when consistency response is invalid', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'Not JSON',
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    const result = await judge.judgeGlobalConsistency(['# S1'], systemContext);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].description).toContain('Failed to parse');
    expect(result.fixes).toEqual([]);
  });

  // --- Edge case: JSON wrapped in extra text ---
  it('succeeds when LLM response has JSON wrapped in extra text', async () => {
    const wrapped = `Here is the result:\n${JSON.stringify(mockJudgeRubric)}`;
    mockSendMessage.mockResolvedValue({
      content: wrapped,
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 120 },
    });

    const result = await judge.judgeStory('# Story\n\nAs a user...', systemContext);

    expect(result.recommendation).toBe('approve');
    expect(result.overallScore).toBe(4);
  });

  // --- Edge case: score as float (4.5 → 5) ---
  it('rounds float scores to 0-5 literals (e.g. 4.5 → 5)', async () => {
    const withFloats = {
      ...mockJudgeRubric,
      sectionSeparation: { score: 4.5, reasoning: 'Good', violations: [] },
      overallScore: 4.5,
    };
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(withFloats),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 80 },
    });

    const result = await judge.judgeStory('story', systemContext);

    expect(result.sectionSeparation.score).toBe(5);
    expect(result.overallScore).toBe(5);
  });

  // --- Edge case: violations as string array ---
  it('normalizes sectionSeparation.violations from string array to structured objects', () => {
    const raw = {
      ...mockJudgeRubric,
      sectionSeparation: {
        score: 3,
        reasoning: 'Some violations',
        violations: ['jargon in As a section', 'API in UVB'],
      },
    };
    const result = parseJudgeRubric(raw);
    expect(result.sectionSeparation.violations).toHaveLength(2);
    expect(result.sectionSeparation.violations![0]).toEqual({
      section: '',
      quote: 'jargon in As a section',
      suggestedRewrite: '',
    });
    expect(result.sectionSeparation.violations![1].quote).toBe('API in UVB');
  });

  // --- Edge case: non-object input ---
  it('parseJudgeRubric throws when raw is null or not an object', () => {
    expect(() => parseJudgeRubric(null)).toThrow('Invalid judge rubric');
    expect(() => parseJudgeRubric('not json')).toThrow('Invalid judge rubric');
  });

  // --- Edge case: missing required fields ---
  it('parseJudgeRubric throws when required fields are missing', () => {
    const minimal = { recommendation: 'approve' };
    expect(() => parseJudgeRubric(minimal)).toThrow('Invalid judge rubric');
  });

  // --- Edge case: invalid enum ---
  it('parseJudgeRubric throws when recommendation is invalid enum', () => {
    const badEnum = { ...mockJudgeRubric, recommendation: 'invalid' };
    expect(() => parseJudgeRubric(badEnum)).toThrow('Invalid judge rubric');
  });

  // --- parseGlobalConsistencyReport edge cases ---
  it('parseGlobalConsistencyReport returns null for invalid shape', () => {
    // Invalid issue shape (confidence out of range) fails validation
    expect(parseGlobalConsistencyReport({ issues: [{ description: 'x', suggestedFixType: 'y', confidence: 2, affectedStories: [] }], fixes: [] })).toBeNull();
    // Empty arrays normalize and validate
    expect(parseGlobalConsistencyReport({ issues: [], fixes: [] })).not.toBeNull();
  });

  it('parseGlobalConsistencyReport normalizes missing issues/fixes to empty arrays', () => {
    const raw = { issues: [], fixes: [] };
    const report = parseGlobalConsistencyReport(raw);
    expect(report).not.toBeNull();
    expect(report!.issues).toEqual([]);
    expect(report!.fixes).toEqual([]);
  });

  // --- formatSystemContext: include all SystemDiscoveryContext fields ---
  it('formatSystemContext includes componentGraph, sharedContracts, roles, vocabulary, timestamp, referenceDocuments', () => {
    const fullContext: SystemDiscoveryContext = {
      timestamp: '2025-01-30T12:00:00Z',
      componentGraph: {
        components: {
          A: { id: 'A', productName: 'Comp A', description: '', technicalName: 'CompA' },
        },
        compositionEdges: [{ parent: 'Root', child: 'A' }],
        coordinationEdges: [{ from: 'A', to: 'B', via: 'onClick' }],
        dataFlows: [{ id: 'DF-1', source: 'A', target: 'B', description: 'data' }],
      },
      sharedContracts: {
        stateModels: [{ id: 'S1', name: 'S1', description: '', owner: 'A', consumers: [] }],
        eventRegistry: [{ id: 'E1', name: 'E1', payload: {}, emitter: 'A', listeners: [] }],
        standardStates: [{ type: 'loading', description: 'loading' }],
        dataFlows: [{ id: 'CF-1', source: 'A', target: 'B', description: '' }],
      },
      componentRoles: [{ componentId: 'A', role: 'owner', description: '' }],
      productVocabulary: { btn: 'button' },
      referenceDocuments: ['doc1.md'],
    };
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(mockJudgeRubric),
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 80 },
    });
    return judge.judgeStory('story', fullContext).then((result) => {
      expect(result.recommendation).toBe('approve');
      const call = mockSendMessage.mock.calls[0][0];
      const userContent = (call.messages as { role: string; content: string }[])[0].content;
      expect(userContent).toContain('System context');
      expect(userContent).toContain('Timestamp: 2025-01-30');
      expect(userContent).toContain('Components:');
      expect(userContent).toContain('Composition:');
      expect(userContent).toContain('Coordination:');
      expect(userContent).toContain('Data flows:');
      expect(userContent).toContain('State models:');
      expect(userContent).toContain('Events:');
      expect(userContent).toContain('Standard states:');
      expect(userContent).toContain('Contract data flows:');
      expect(userContent).toContain('Roles:');
      expect(userContent).toContain('Vocabulary:');
      expect(userContent).toContain('Reference documents:');
    });
  });
});
