/**
 * Vision support tests: mockup images in config and vision-enabled iterations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStoryAgent, createAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import * as path from 'path';

vi.mock('../../src/agent/claude-client.js', () => ({
  ClaudeClient: vi.fn(),
}));

const mockJudgeStory = vi.fn();
const mockRewriteForSectionSeparation = vi.fn();

vi.mock('../../src/agent/story-judge.js', () => ({
  StoryJudge: vi.fn().mockImplementation(() => ({
    judgeStory: mockJudgeStory,
    judgeGlobalConsistency: vi.fn(),
  })),
}));

vi.mock('../../src/agent/story-rewriter.js', () => ({
  StoryRewriter: vi.fn().mockImplementation(() => ({
    rewriteForSectionSeparation: mockRewriteForSectionSeparation,
  })),
}));

describe('Vision support', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn().mockResolvedValue({
      content: '{"patches":[]}',
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
    (ClaudeClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      sendMessage: mockSendMessage,
      sendMessageStreaming: vi.fn(),
    }));
    mockJudgeStory.mockResolvedValue({
      overallScore: 4,
      sectionSeparation: { score: 4, reasoning: '', violations: [] },
      correctnessVsSystemContext: { score: 4, reasoning: '' },
      testability: { outcomeAC: { score: 4, reasoning: '' }, systemAC: { score: 4, reasoning: '' } },
      completeness: { score: 4, reasoning: '' },
      recommendation: 'approve',
      newRelationships: [],
      needsSystemContextUpdate: false,
      confidenceByRelationship: {},
    });
  });

  it('accepts mockup images in config', () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['interactive-elements'],
      mockupImages: [{ path: path.join(process.cwd(), 'tests/fixtures/mockup-login.png') }],
    };
    expect(() => new UserStoryAgent(config)).not.toThrow();
    const agent = new UserStoryAgent(config);
    expect(agent).toBeDefined();
  });

  it('creates agent with createAgent when mockupImages provided', () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
      mockupImages: [{ base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDQAEhQGAhKmMIQAAAABJRU5ErkJggg==', mediaType: 'image/png' }],
    };
    const agent = createAgent(config);
    expect(agent).toBeDefined();
  });

  it('works without mockup images (backward compatible)', () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
    };
    const agent = new UserStoryAgent(config);
    expect(agent).toBeDefined();
  });

  it('accepts empty mockupImages array', () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['accessibility'],
      mockupImages: [],
    };
    expect(() => new UserStoryAgent(config)).not.toThrow();
  });
});
