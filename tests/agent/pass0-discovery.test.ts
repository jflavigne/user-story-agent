/**
 * Unit tests for Pass 0 discovery (runPass0Discovery)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStoryAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { createInitialState } from '../../src/agent/state/story-state.js';

vi.mock('../../src/agent/claude-client.js', () => ({
  ClaudeClient: vi.fn(),
}));

const mockSystemDiscoveryResponse = {
  mentions: {
    components: ['Login Button', 'login-btn', 'LoginButton'],
    stateModels: ['userProfile', 'user-profile-state'],
    events: ['user-authenticated', 'USER_AUTH', 'onLoginSuccess'],
  },
  canonicalNames: {
    'Login Button': ['Login Button', 'login-btn', 'LoginButton'],
    'User Profile': ['userProfile', 'user-profile-state'],
    'user-authenticated': ['user-authenticated', 'USER_AUTH', 'onLoginSuccess'],
  },
  evidence: {
    'Login Button': 'Wireframe 2 shows Login button in top-right',
    'User Profile': 'Data model doc references userProfile state',
    'user-authenticated': 'Spec says: on successful login, header updates',
  },
  vocabulary: {
    userProfile: 'User Profile',
    'login-btn': 'Login Button',
    'heart icon': 'Favorite Button',
  },
};

describe('runPass0Discovery', () => {
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

    mockSendMessage.mockResolvedValue({
      content: JSON.stringify(mockSystemDiscoveryResponse),
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 80 },
    });
  });

  it('returns SystemDiscoveryContext with stable IDs', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['As a user I want to log in.']);

    expect(context).toBeDefined();
    expect(context.timestamp).toBeDefined();
    expect(typeof context.timestamp).toBe('string');
    expect(context.componentGraph).toBeDefined();
    expect(context.sharedContracts).toBeDefined();
    expect(context.componentRoles).toEqual([]);
    expect(context.productVocabulary).toBeDefined();
  });

  it('mints COMP-* IDs for components', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story with Login Button.']);

    const components = context.componentGraph.components;
    const ids = Object.keys(components);
    expect(ids.length).toBeGreaterThanOrEqual(1);
    ids.forEach((id) => {
      expect(id).toMatch(/^COMP-/);
    });
    const comp = Object.values(components)[0];
    expect(comp.id).toMatch(/^COMP-/);
    expect(comp.productName).toBeDefined();
    expect(comp.description).toBeDefined();
  });

  it('mints C-STATE-* IDs for state models', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story with user profile.']);

    const stateModels = context.sharedContracts.stateModels;
    expect(stateModels.length).toBeGreaterThanOrEqual(1);
    stateModels.forEach((sm) => {
      expect(sm.id).toMatch(/^C-STATE-/);
      expect(sm.name).toBeDefined();
    });
  });

  it('mints E-* IDs for events', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story with login event.']);

    const eventRegistry = context.sharedContracts.eventRegistry;
    expect(eventRegistry.length).toBeGreaterThanOrEqual(1);
    eventRegistry.forEach((ev) => {
      expect(ev.id).toMatch(/^E-/);
      expect(ev.name).toBeDefined();
    });
  });

  it('populates productVocabulary from LLM vocabulary', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Login story.']);

    expect(context.productVocabulary).toMatchObject({
      userProfile: 'User Profile',
      'login-btn': 'Login Button',
      'heart icon': 'Favorite Button',
    });
  });

  it('includes referenceDocuments when provided', async () => {
    const agent = new UserStoryAgent(validConfig);
    const refs = ['Doc1.pdf', 'Spec.md'];
    const context = await agent.runPass0Discovery(['Story.'], refs);

    expect(context.referenceDocuments).toEqual(refs);
  });

  it('omits referenceDocuments when not provided', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story.']);

    expect(context.referenceDocuments).toBeUndefined();
  });

  it('calls LLM with system-discovery prompt and stories in user message', async () => {
    const agent = new UserStoryAgent(validConfig);
    const stories = ['Story one.', 'Story two.'];
    await agent.runPass0Discovery(stories);

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
    const call = mockSendMessage.mock.calls[0][0];
    expect(call.systemPrompt).toContain('Pass 0');
    expect(call.systemPrompt).toContain('System Discovery');
    expect(call.messages[0].content).toContain('Story one.');
    expect(call.messages[0].content).toContain('Story two.');
  });

  it('stores context in state when caller assigns to state.systemContext', async () => {
    const agent = new UserStoryAgent(validConfig);
    const state = createInitialState('As a user I want to log in.');
    const context = await agent.runPass0Discovery([state.currentStory]);
    state.systemContext = context;

    expect(state.systemContext).toBe(context);
    expect(state.systemContext?.componentGraph.components).toBeDefined();
  });

  it('throws when LLM response contains no valid JSON', async () => {
    mockSendMessage.mockResolvedValue({
      content: 'This is not JSON at all',
      stopReason: 'end_turn',
      usage: { inputTokens: 100, outputTokens: 20 },
    });
    const agent = new UserStoryAgent(validConfig);

    await expect(agent.runPass0Discovery(['Story.'])).rejects.toThrow(/Pass 0.*JSON/);
  });

  it('includes standardStates in sharedContracts', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story.']);

    expect(context.sharedContracts.standardStates).toBeDefined();
    expect(Array.isArray(context.sharedContracts.standardStates)).toBe(true);
    expect(context.sharedContracts.standardStates.length).toBeGreaterThanOrEqual(1);
  });

  it('componentGraph has empty edges when only mentions are extracted', async () => {
    const agent = new UserStoryAgent(validConfig);
    const context = await agent.runPass0Discovery(['Story.']);

    expect(context.componentGraph.compositionEdges).toEqual([]);
    expect(context.componentGraph.coordinationEdges).toEqual([]);
    expect(context.componentGraph.dataFlows).toEqual([]);
    expect(context.sharedContracts.dataFlows).toEqual([]);
  });
});
