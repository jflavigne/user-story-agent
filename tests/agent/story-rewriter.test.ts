/**
 * Unit tests for story-rewriter.ts with mock LLM responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryRewriter } from '../../src/agent/story-rewriter.js';
import type { ClaudeClient } from '../../src/agent/claude-client.js';
import type { SystemDiscoveryContext, JudgeRubric } from '../../src/shared/types.js';

const mockRewrittenStory = `# Login

## User Story

As a **user**, I want **to log in**, so that **I can access the app**.

## User-Visible Behavior

- See the login form.`;

describe('StoryRewriter', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let rewriter: StoryRewriter;
  const systemContext: SystemDiscoveryContext = { digest: 'ctx', summary: 'App' };

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

  it('accepts JudgeRubric and uses sectionSeparation.violations', async () => {
    mockSendMessage.mockResolvedValue({
      content: mockRewrittenStory,
      stopReason: 'end_turn',
      usage: { inputTokens: 80, outputTokens: 100 },
    });

    const rubric: JudgeRubric = {
      sectionSeparation: { score: 2, reasoning: 'Bad', violations: ['Tech term in user story'] },
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
    expect(content).toContain('Tech term in user story');
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
});
