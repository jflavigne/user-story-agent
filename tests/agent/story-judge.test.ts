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
import { GLOBAL_CONSISTENCY_JUDGE_PROMPT } from '../../src/prompts/judge-rubrics/global-consistency.js';
import type { ClaudeClient } from '../../src/agent/claude-client.js';
import type { SystemDiscoveryContext, StoryInterconnections } from '../../src/shared/types.js';

/** Minimal story with interconnections for judgeGlobalConsistency tests */
function storyWithInterconnections(
  id: string,
  content: string,
  interconnections: Partial<StoryInterconnections>
): { id: string; title: string; content: string; interconnections: StoryInterconnections } {
  const base: StoryInterconnections = {
    storyId: id,
    uiMapping: {},
    contractDependencies: [],
    ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
    relatedStories: [],
  };
  return {
    id,
    title: id,
    content,
    interconnections: { ...base, ...interconnections },
  };
}

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
  let mockClient: ClaudeClient;
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
    mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
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

  it('uses GLOBAL_CONSISTENCY_JUDGE_PROMPT as system prompt', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({ issues: [], fixes: [] }),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const stories = [
      storyWithInterconnections('S1', '# S1', {}),
      storyWithInterconnections('S2', '# S2', {}),
    ];
    await judge.judgeGlobalConsistency(stories, systemContext);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const call = mockSendMessage.mock.calls[0][0];
    expect(call.systemPrompt).toBe(GLOBAL_CONSISTENCY_JUDGE_PROMPT);
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

    const stories = [
      storyWithInterconnections('1', '# S1', {}),
      storyWithInterconnections('2', '# S2', {}),
    ];
    const result = await judge.judgeGlobalConsistency(stories, systemContext);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].description).toBe('Terminology mismatch');
    expect(result.issues[0].confidence).toBe(0.8);
    expect(result.fixes).toEqual([]);
  });

  it('returns full GlobalConsistencyReport with issues and fixes including confidence', async () => {
    const fullReport = {
      issues: [
        { description: 'Missing bidirectional link', suggestedFixType: 'missing-bidirectional-link', confidence: 0.9, affectedStories: ['story-10', 'story-25'] },
      ],
      fixes: [
        {
          type: 'add-bidirectional-link',
          storyId: 'story-25',
          path: 'outcomeAcceptanceCriteria',
          operation: 'add',
          item: { id: 'AC-OUT-NEW', text: 'Story 10 is listed as prerequisite.' },
          confidence: 0.85,
          reasoning: 'Story 10 lists this as dependent; add reverse link.',
        },
        {
          type: 'normalize-contract-id',
          storyId: 'story-10',
          path: 'implementationNotes.stateOwnership',
          operation: 'replace',
          item: { id: 'IO-1', text: 'C-STATE-SHOPPING-CART' },
          match: { id: 'IO-0' },
          confidence: 1,
          reasoning: 'Normalize to canonical contract ID from System Context.',
        },
      ],
    };
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(fullReport),
      stopReason: 'end_turn',
      usage: { inputTokens: 150, outputTokens: 120 },
    });

    const stories = [
      storyWithInterconnections('story-10', '# S1', {}),
      storyWithInterconnections('story-25', '# S2', {}),
      storyWithInterconnections('story-30', '# S3', {}),
    ];
    const result = await judge.judgeGlobalConsistency(stories, systemContext);

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].confidence).toBe(0.9);
    expect(result.issues[0].affectedStories).toEqual(['story-10', 'story-25']);
    expect(result.fixes).toHaveLength(2);
    expect(result.fixes[0].type).toBe('add-bidirectional-link');
    expect(result.fixes[0].confidence).toBe(0.85);
    expect(result.fixes[1].type).toBe('normalize-contract-id');
    expect(result.fixes[1].confidence).toBe(1);
    expect(result.fixes[1].match).toEqual({ id: 'IO-0' });
  });

  it('returns fallback report when consistency response is invalid (no JSON)', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'Not JSON',
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    const stories = [storyWithInterconnections('S1', '# S1', {})];
    await expect(judge.judgeGlobalConsistency(stories, systemContext)).rejects.toThrow(
      'Failed to parse global consistency report from LLM response',
    );
  });

  it('returns fallback report when JSON is valid but schema validation fails', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({ issues: [{ description: 'x', suggestedFixType: 'y', confidence: 2, affectedStories: [] }], fixes: [] }),
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 30 },
    });

    const stories = [storyWithInterconnections('S1', '# S1', {})];
    await expect(judge.judgeGlobalConsistency(stories, systemContext)).rejects.toThrow(
      'Failed to parse global consistency report from LLM response',
    );
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

  it('parseGlobalConsistencyReport rejects confidence values outside 0-1 range', () => {
    // Out of range confidence in issues - should fail validation
    const invalidIssue = {
      issues: [{ description: 'x', suggestedFixType: 'y', confidence: 1.5, affectedStories: [] }],
      fixes: [],
    };
    expect(parseGlobalConsistencyReport(invalidIssue)).toBeNull();

    // Out of range confidence in fixes - should fail validation
    const invalidFix = {
      issues: [],
      fixes: [{ type: 'normalize-contract-id', storyId: 's1', path: 'story.asA', operation: 'replace', confidence: -0.1, reasoning: 'r' }],
    };
    expect(parseGlobalConsistencyReport(invalidFix)).toBeNull();

    // Valid confidence values should pass
    const valid = {
      issues: [{ description: 'x', suggestedFixType: 'y', confidence: 0.8, affectedStories: [] }],
      fixes: [{ type: 'normalize-contract-id', storyId: 's1', path: 'story.asA', operation: 'replace', confidence: 0.5, reasoning: 'r' }],
    };
    expect(parseGlobalConsistencyReport(valid)).not.toBeNull();
  });

  describe('Global Consistency Judge (USA-51)', () => {
    it('should detect contradictions and suggest fixes', async () => {
      const mockReport = {
        issues: [
          {
            type: 'contradiction',
            description: 'USA-001 and USA-002 both claim to own C-STATE-USER',
            affectedStories: ['USA-001', 'USA-002'],
            confidence: 0.9,
          },
        ],
        fixes: [
          {
            type: 'add-bidirectional-link',
            storyId: 'USA-002',
            path: 'outcomeAcceptanceCriteria',
            operation: 'add',
            item: {
              id: 'REL-001',
              text: JSON.stringify({
                storyId: 'USA-001',
                relationship: 'prerequisite',
                description: 'Auth must be implemented first',
              }),
            },
            confidence: 0.95,
            reasoning: 'USA-001 lists USA-002 as prerequisite but reverse link missing',
          },
        ],
      };
      // Schema uses suggestedFixType for issues
      const reportForSchema = {
        issues: [
          {
            suggestedFixType: 'contradiction',
            description: mockReport.issues[0].description,
            affectedStories: mockReport.issues[0].affectedStories,
            confidence: mockReport.issues[0].confidence,
          },
        ],
        fixes: mockReport.fixes,
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(reportForSchema),
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      const judge = new StoryJudge(mockClient);
      const systemContext = buildMinimalSystemContext();

      const stories = [
        {
          id: 'USA-001',
          title: 'Login',
          content: 'As a user...',
          interconnections: {
            storyId: 'USA-001',
            uiMapping: {},
            contractDependencies: ['C-STATE-USER'],
            ownership: { ownsState: ['C-STATE-USER'], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [
              { storyId: 'USA-002', relationship: 'prerequisite', description: 'Needs auth' },
            ],
          },
        },
        {
          id: 'USA-002',
          title: 'Auth',
          content: 'As a user...',
          interconnections: {
            storyId: 'USA-002',
            uiMapping: {},
            contractDependencies: ['C-STATE-USER'],
            ownership: { ownsState: ['C-STATE-USER'], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          },
        },
      ];

      const report = await judge.judgeGlobalConsistency(stories, systemContext);

      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].suggestedFixType).toBe('contradiction');
      expect(report.issues[0].affectedStories).toContain('USA-001');
      expect(report.issues[0].affectedStories).toContain('USA-002');

      expect(report.fixes).toHaveLength(1);
      expect(report.fixes[0].type).toBe('add-bidirectional-link');
      expect(report.fixes[0].confidence).toBeGreaterThan(0.8);
    });

    it('should validate contract IDs against system context', async () => {
      const mockReport = {
        issues: [
          {
            suggestedFixType: 'invalid-reference',
            description: 'USA-001 references C-STATE-PROFILE which does not exist',
            affectedStories: ['USA-001'],
            confidence: 1.0,
          },
        ],
        fixes: [
          {
            type: 'normalize-contract-id',
            storyId: 'USA-001',
            path: 'implementationNotes.stateOwnership',
            operation: 'replace',
            item: { id: 'IO-1', text: 'C-STATE-USER' },
            match: { id: 'C-STATE-PROFILE' },
            confidence: 0.85,
            reasoning: 'Replace invalid ID with existing one',
          },
        ],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockReport),
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      const judge = new StoryJudge(mockClient);
      const systemContext = buildMinimalSystemContext();

      const stories = [
        {
          id: 'USA-001',
          title: 'Profile',
          content: 'As a user...',
          interconnections: {
            storyId: 'USA-001',
            uiMapping: {},
            contractDependencies: ['C-STATE-PROFILE'],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          },
        },
      ];

      const report = await judge.judgeGlobalConsistency(stories, systemContext);

      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].suggestedFixType).toBe('invalid-reference');
      expect(report.fixes[0].type).toBe('normalize-contract-id');
    });

    it('should detect missing bidirectional links', async () => {
      const mockReport = {
        issues: [
          {
            suggestedFixType: 'missing-link',
            description: 'USA-001 lists USA-002 as prerequisite, but USA-002 does not list USA-001 as dependent',
            affectedStories: ['USA-001', 'USA-002'],
            confidence: 1.0,
          },
        ],
        fixes: [
          {
            type: 'add-bidirectional-link',
            storyId: 'USA-002',
            path: 'outcomeAcceptanceCriteria',
            operation: 'add',
            item: {
              id: 'REL-001',
              text: JSON.stringify({
                storyId: 'USA-001',
                relationship: 'dependent',
                description: 'Login depends on auth',
              }),
            },
            confidence: 1.0,
            reasoning: 'Add reverse dependency link',
          },
        ],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockReport),
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      const judge = new StoryJudge(mockClient);
      const systemContext = buildMinimalSystemContext();

      const stories = [
        {
          id: 'USA-001',
          title: 'Login',
          content: 'As a user...',
          interconnections: {
            storyId: 'USA-001',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [
              { storyId: 'USA-002', relationship: 'prerequisite', description: 'Needs auth first' },
            ],
          },
        },
        {
          id: 'USA-002',
          title: 'Auth',
          content: 'As a user...',
          interconnections: {
            storyId: 'USA-002',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          },
        },
      ];

      const report = await judge.judgeGlobalConsistency(stories, systemContext);

      expect(report.issues[0].suggestedFixType).toBe('missing-link');
      expect(report.fixes[0].type).toBe('add-bidirectional-link');
    });

    it('should throw when parsing fails', async () => {
      mockSendMessage.mockResolvedValue({
        content: 'Invalid JSON response',
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 100 },
      });

      const judge = new StoryJudge(mockClient);
      const systemContext = buildMinimalSystemContext();

      await expect(judge.judgeGlobalConsistency([], systemContext)).rejects.toThrow(
        'Failed to parse global consistency report from LLM response',
      );
    });
  });

  /** Helper for USA-51 global consistency tests */
  function buildMinimalSystemContext(): SystemDiscoveryContext {
    return {
      componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
      sharedContracts: { stateModels: [], eventRegistry: [], standardStates: [], dataFlows: [] },
      componentRoles: [],
      productVocabulary: {},
      timestamp: new Date().toISOString(),
    };
  }

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
