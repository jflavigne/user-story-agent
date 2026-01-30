/**
 * Unit tests for story-rewriter.ts with mock LLM responses (USA-35).
 * Includes edge-case tests for LLM output variability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StoryRewriter,
  extractRewrittenStory,
} from '../../src/agent/story-rewriter.js';
import type { ClaudeClient } from '../../src/agent/claude-client.js';
import type { SystemDiscoveryContext, JudgeRubric } from '../../src/shared/types.js';

const mockRewrittenStory = `# Login

## User Story

As a **user**, I want **to log in**, so that **I can access the app**.

## User-Visible Behavior

- See the login form.`;

/** Minimal valid SystemDiscoveryContext (same shape as story-judge tests). */
const systemContext: SystemDiscoveryContext = {
  timestamp: new Date().toISOString(),
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
};

describe('StoryRewriter', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let rewriter: StoryRewriter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    const mockClient = { sendMessage: mockSendMessage } as unknown as ClaudeClient;
    rewriter = new StoryRewriter(mockClient);
  });

  it('returns rewritten markdown from mock LLM response', async () => {
    mockSendMessage.mockResolvedValue({
      content: mockRewrittenStory,
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 120 },
    });

    const result = await rewriter.rewriteForSectionSeparation(
      '# Story\n\nAs a user...',
      ['Jargon in As a/I want'],
      systemContext
    );

    expect(result).toBe(mockRewrittenStory);
    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const call = mockSendMessage.mock.calls[0][0];
    expect(call.systemPrompt).toBeDefined();
    expect(call.messages[0].content).toContain('Jargon in As a/I want');
  });

  it('accepts JudgeRubric and uses sectionSeparation.violations (structured)', async () => {
    mockSendMessage.mockResolvedValue({
      content: mockRewrittenStory,
      stopReason: 'end_turn',
      usage: { inputTokens: 80, outputTokens: 100 },
    });

    const rubric: JudgeRubric = {
      sectionSeparation: {
        score: 2,
        reasoning: 'Bad',
        violations: [
          {
            section: 'Outcome AC',
            quote: 'API returns 200',
            suggestedRewrite: 'User sees success state',
          },
        ],
      },
      correctnessVsSystemContext: { score: 5, reasoning: 'Ok', hallucinations: [] },
      testability: { outcomeAC: { score: 4, reasoning: '' }, systemAC: { score: 4, reasoning: '' } },
      completeness: { score: 4, reasoning: '', missingElements: [] },
      overallScore: 3,
      recommendation: 'rewrite',
      newRelationships: [],
      needsSystemContextUpdate: false,
      confidenceByRelationship: {},
    };

    const result = await rewriter.rewriteForSectionSeparation('# Story', rubric, systemContext);

    expect(result).toBe(mockRewrittenStory);
    const content = mockSendMessage.mock.calls[0][0].messages[0].content;
    expect(content).toContain('Outcome AC');
    expect(content).toContain('API returns 200');
    expect(content).toContain('User sees success state');
  });

  it('accepts JudgeRubric with empty violations', async () => {
    mockSendMessage.mockResolvedValue({
      content: mockRewrittenStory,
      stopReason: 'end_turn',
      usage: { inputTokens: 60, outputTokens: 80 },
    });

    const rubric: JudgeRubric = {
      sectionSeparation: { score: 4, reasoning: 'Ok', violations: [] },
      correctnessVsSystemContext: { score: 5, reasoning: '', hallucinations: [] },
      testability: { outcomeAC: { score: 4, reasoning: '' }, systemAC: { score: 4, reasoning: '' } },
      completeness: { score: 4, reasoning: '', missingElements: [] },
      overallScore: 4,
      recommendation: 'approve',
      newRelationships: [],
      needsSystemContextUpdate: false,
      confidenceByRelationship: {},
    };

    const result = await rewriter.rewriteForSectionSeparation('# Story', rubric, systemContext);
    expect(result).toBe(mockRewrittenStory);
    const content = mockSendMessage.mock.calls[0][0].messages[0].content;
    expect(content).toContain('(none listed)');
  });

  it('throws when LLM returns empty content', async () => {
    mockSendMessage.mockResolvedValue({
      content: '   \n  ',
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 0 },
    });

    await expect(
      rewriter.rewriteForSectionSeparation('# Story', [], systemContext)
    ).rejects.toThrow('Empty response from rewriter');
  });

  it('extracts markdown when response is wrapped in code fence', async () => {
    const wrapped = '```markdown\n' + mockRewrittenStory + '\n```';
    mockSendMessage.mockResolvedValue({
      content: wrapped,
      stopReason: 'end_turn',
      usage: { inputTokens: 60, outputTokens: 90 },
    });

    const result = await rewriter.rewriteForSectionSeparation('# Story', [], systemContext);

    expect(result).toBe(mockRewrittenStory);
  });

  it('extracts markdown when response uses plain ``` fence', async () => {
    const wrapped = '```\n' + mockRewrittenStory + '\n```';
    mockSendMessage.mockResolvedValue({
      content: wrapped,
      stopReason: 'end_turn',
      usage: { inputTokens: 60, outputTokens: 90 },
    });

    const result = await rewriter.rewriteForSectionSeparation('# Story', [], systemContext);

    expect(result).toBe(mockRewrittenStory);
  });

  it('throws when response has no ## section headings (partial story)', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'Just a paragraph. No headings.',
      stopReason: 'end_turn',
      usage: { inputTokens: 50, outputTokens: 10 },
    });

    await expect(
      rewriter.rewriteForSectionSeparation('# Story', [], systemContext)
    ).rejects.toThrow('does not appear to be a complete story');
  });

  it('throws when response is malformed (empty after stripping fence)', async () => {
    mockSendMessage.mockResolvedValue({
      content: '```markdown\n\n```',
      stopReason: 'end_turn',
      usage: { inputTokens: 40, outputTokens: 5 },
    });

    await expect(
      rewriter.rewriteForSectionSeparation('# Story', [], systemContext)
    ).rejects.toThrow('Empty response from rewriter');
  });
});

describe('extractRewrittenStory', () => {
  it('returns trimmed content when no fence', () => {
    expect(extractRewrittenStory('  ## User Story\n\nText  ')).toBe(
      '## User Story\n\nText'
    );
  });

  it('strips ```markdown fence and returns inner content', () => {
    const inner = '# Title\n\n## User Story\n\nBody';
    expect(extractRewrittenStory('```markdown\n' + inner + '\n```')).toBe(inner);
  });

  it('strips ``` fence and returns inner content', () => {
    const inner = '# Title\n\n## User Story\n\nBody';
    expect(extractRewrittenStory('```\n' + inner + '\n```')).toBe(inner);
  });

  it('throws on null/undefined content', () => {
    expect(() => extractRewrittenStory(null)).toThrow('Empty response from rewriter');
    expect(() => extractRewrittenStory(undefined)).toThrow('Empty response from rewriter');
  });

  it('throws on whitespace-only content', () => {
    expect(() => extractRewrittenStory('   \n\t  ')).toThrow(
      'Empty response from rewriter'
    );
  });
});
