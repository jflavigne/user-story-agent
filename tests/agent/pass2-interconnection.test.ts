/**
 * Unit tests for Pass 2 interconnection (runPass2Interconnection)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStoryAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import type { SystemDiscoveryContext } from '../../src/shared/types.js';

vi.mock('../../src/agent/claude-client.js', () => ({
  ClaudeClient: vi.fn(),
}));

function minimalSystemContext(): SystemDiscoveryContext {
  return {
    componentGraph: {
      components: {
        'COMP-FAVORITE-BUTTON': {
          id: 'COMP-FAVORITE-BUTTON',
          productName: 'Favorite Button',
          description: 'Heart icon to favorite items',
        },
      },
      compositionEdges: [],
      coordinationEdges: [],
      dataFlows: [],
    },
    sharedContracts: {
      stateModels: [
        { id: 'C-STATE-FAVORITES', name: 'Favorites', description: 'User favorites', owner: '', consumers: [] },
      ],
      eventRegistry: [
        { id: 'E-ITEM-FAVORITED', name: 'item-favorited', payload: {}, emitter: '', listeners: [] },
      ],
      standardStates: [],
      dataFlows: [],
    },
    componentRoles: [],
    productVocabulary: { 'heart icon': 'Favorite Button' },
    timestamp: new Date().toISOString(),
  };
}

const mockInterconnectionResponse = (storyId: string) => ({
  storyId,
  uiMapping: { 'heart icon': 'COMP-FAVORITE-BUTTON' },
  contractDependencies: ['C-STATE-FAVORITES', 'E-ITEM-FAVORITED'],
  ownership: {
    ownsState: ['C-STATE-FAVORITES'],
    consumesState: [],
    emitsEvents: ['E-ITEM-FAVORITED'],
    listensToEvents: [],
  },
  relatedStories: [
    { storyId: 'story-auth', relationship: 'prerequisite' as const, description: 'Requires user auth first' },
  ],
});

describe('runPass2Interconnection', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockClaudeClient: { sendMessage: ReturnType<typeof vi.fn>; sendMessageStreaming: ReturnType<typeof vi.fn> };
  let validConfig: UserStoryAgentConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    mockClaudeClient = {
      sendMessage: mockSendMessage,
      sendMessageStreaming: vi.fn(),
    };
    vi.mocked(ClaudeClient).mockImplementation(() => mockClaudeClient as unknown as ClaudeClient);
    validConfig = {
      mode: 'individual',
      iterations: ['user-roles'],
      apiKey: 'test-api-key',
      model: 'claude-sonnet-4-20250514',
    };
  });

  it('returns Pass2InterconnectionResult with interconnections and updatedStories', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(mockInterconnectionResponse('story-1')),
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 150 },
    });

    const agent = new UserStoryAgent(validConfig);
    const stories = [
      { id: 'story-1', content: '# Favorite item\n\nAs a user I want to favorite items.' },
    ];
    const systemContext = minimalSystemContext();
    const result = await agent.runPass2Interconnection(stories, systemContext);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('story-1');
    expect(result[0].interconnections.storyId).toBe('story-1');
    expect(result[0].interconnections.uiMapping).toEqual({ 'heart icon': 'COMP-FAVORITE-BUTTON' });
    expect(result[0].interconnections.contractDependencies).toContain('C-STATE-FAVORITES');
    expect(result[0].interconnections.ownership.ownsState).toContain('C-STATE-FAVORITES');
    expect(result[0].interconnections.relatedStories).toHaveLength(1);
    expect(result[0].interconnections.relatedStories[0].relationship).toBe('prerequisite');
  });

  it('appends interconnection metadata sections to markdown', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(mockInterconnectionResponse('story-1')),
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 150 },
    });

    const agent = new UserStoryAgent(validConfig);
    const stories = [
      { id: 'story-1', content: '# Favorite item\n\nAs a user I want to favorite items.' },
    ];
    const result = await agent.runPass2Interconnection(stories, minimalSystemContext());

    const updated = result[0];
    expect(updated).toBeDefined();
    expect(updated!.content).toContain('## UI Mapping');
    expect(updated!.content).toContain('## Contract Dependencies');
    expect(updated!.content).toContain('## Ownership');
    expect(updated!.content).toContain('## Related Stories');
    expect(updated!.content).toContain('heart icon');
    expect(updated!.content).toContain('COMP-FAVORITE-BUTTON');
    expect(updated!.content).toContain('C-STATE-FAVORITES');
  });

  it('calls LLM once per story with system context and other story IDs', async () => {
    mockSendMessage
      .mockResolvedValueOnce({
        content: JSON.stringify(mockInterconnectionResponse('story-a')),
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 150 },
      })
      .mockResolvedValueOnce({
        content: JSON.stringify(mockInterconnectionResponse('story-b')),
        stopReason: 'end_turn',
        usage: { inputTokens: 200, outputTokens: 150 },
      });

    const agent = new UserStoryAgent(validConfig);
    const stories = [
      { id: 'story-a', content: '# Story A' },
      { id: 'story-b', content: '# Story B' },
    ];
    const systemContext = minimalSystemContext();
    await agent.runPass2Interconnection(stories, systemContext);

    expect(mockSendMessage).toHaveBeenCalledTimes(2);
    const firstCall = mockSendMessage.mock.calls[0][0];
    expect(firstCall.systemPrompt).toContain('Pass 2');
    expect(firstCall.systemPrompt).toContain('Story Interconnection');
    expect(firstCall.messages[0].content).toContain('Story A');
    expect(firstCall.messages[0].content).toContain('story-b');
    expect(firstCall.messages[0].content).toContain('COMP-FAVORITE-BUTTON');
    const secondCall = mockSendMessage.mock.calls[1][0];
    expect(secondCall.messages[0].content).toContain('Story B');
    expect(secondCall.messages[0].content).toContain('story-a');
  });

  it('normalizes storyId to current story and ensures ownership object', async () => {
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({
        storyId: 'wrong-id',
        uiMapping: {},
        contractDependencies: [],
        ownership: {},
        relatedStories: [],
      }),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const agent = new UserStoryAgent(validConfig);
    const stories = [{ id: 'correct-id', content: '# Story' }];
    const result = await agent.runPass2Interconnection(stories, minimalSystemContext());

    expect(result[0].interconnections.storyId).toBe('correct-id');
    expect(result[0].interconnections.ownership).toEqual({
      ownsState: [],
      consumesState: [],
      emitsEvents: [],
      listensToEvents: [],
    });
  });

  it('throws when LLM response contains no valid JSON', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'This is not JSON at all',
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 20 },
    });

    const agent = new UserStoryAgent(validConfig);
    const stories = [{ id: 'story-1', content: '# Story' }];

    await expect(agent.runPass2Interconnection(stories, minimalSystemContext())).rejects.toThrow(
      /Pass 2.*JSON/
    );
  });

  it('returns one interconnection and one updated story per input story', async () => {
    mockSendMessage.mockResolvedValueOnce({
      content: JSON.stringify(mockInterconnectionResponse('story-x')),
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 150 },
    });
    mockSendMessage.mockResolvedValueOnce({
      content: JSON.stringify({ ...mockInterconnectionResponse('story-y'), relatedStories: [] }),
      stopReason: 'end_turn',
      usage: { inputTokens: 200, outputTokens: 150 },
    });

    const agent = new UserStoryAgent(validConfig);
    const stories = [
      { id: 'story-x', content: '# X' },
      { id: 'story-y', content: '# Y' },
    ];

    const result = await agent.runPass2Interconnection(stories, minimalSystemContext());

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('story-x');
    expect(result[1].id).toBe('story-y');
  });
});
