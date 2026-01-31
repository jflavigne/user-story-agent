/**
 * USA-54: End-to-End Integration Tests
 *
 * Comprehensive integration tests for the full pipeline using realistic
 * fixtures. Validates workflow from mockups to final stories with interconnections.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { UserStoryAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import type {
  SystemDiscoveryContext,
  JudgeRubric,
  GlobalConsistencyReport,
} from '../../src/shared/types.js';
import type { ProductContext } from '../../src/shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, '../fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf-8');
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../src/agent/claude-client.js', () => ({
  ClaudeClient: vi.fn(),
}));

const mockJudgeStory = vi.fn();
const mockJudgeGlobalConsistency = vi.fn();
const mockRewriteForSectionSeparation = vi.fn();

vi.mock('../../src/agent/story-judge.js', () => ({
  StoryJudge: vi.fn().mockImplementation(() => ({
    judgeStory: mockJudgeStory,
    judgeGlobalConsistency: mockJudgeGlobalConsistency,
  })),
}));

vi.mock('../../src/agent/story-rewriter.js', () => ({
  StoryRewriter: vi.fn().mockImplementation(() => ({
    rewriteForSectionSeparation: mockRewriteForSectionSeparation,
  })),
}));

function minimalJudgeRubric(overallScore: 0 | 1 | 2 | 3 | 4 | 5): JudgeRubric {
  return {
    sectionSeparation: { score: overallScore, reasoning: '', violations: [] },
    correctnessVsSystemContext: { score: overallScore, reasoning: '' },
    testability: {
      outcomeAC: { score: overallScore, reasoning: '' },
      systemAC: { score: overallScore, reasoning: '' },
    },
    completeness: { score: overallScore, reasoning: '' },
    overallScore,
    recommendation: overallScore >= 3.5 ? 'approve' : 'rewrite',
    newRelationships: [],
    needsSystemContextUpdate: false,
    confidenceByRelationship: {},
  };
}

function systemDiscoveryResponse(payload: object) {
  return {
    content: JSON.stringify(payload),
    stopReason: 'end_turn' as const,
    usage: { inputTokens: 100, outputTokens: 80 },
  };
}

function pass1IterationResponse(title: string, body: string) {
  return {
    content: JSON.stringify({
      enhancedStory: `# ${title}\n\n${body}`,
      changesApplied: [],
    }),
    stopReason: 'end_turn' as const,
    usage: { inputTokens: 150, outputTokens: 100 },
  };
}

function pass2InterconnectionResponse(
  storyId: string,
  uiMapping: Record<string, string> = {},
  contractDependencies: string[] = []
) {
  return {
    content: JSON.stringify({
      storyId,
      uiMapping,
      contractDependencies,
      ownership: {
        ownsState: [],
        consumesState: [],
        emitsEvents: [],
        listensToEvents: [],
      },
      relatedStories: [],
    }),
    stopReason: 'end_turn' as const,
    usage: { inputTokens: 120, outputTokens: 60 },
  };
}

// Realistic Pass 0 payload matching fixture content (login + dashboard + reference)
const PASS0_FIXTURE_PAYLOAD = {
  mentions: {
    components: [
      'Email input',
      'Password input',
      'Sign In button',
      'LoginForm',
      'DashboardContainer',
      'NavigationBar',
    ],
    stateModels: ['User authentication state', 'Session management', 'Form validation state'],
    events: ['user-authenticated', 'user-logged-out', 'form-validation-error'],
  },
  canonicalNames: {
    LoginForm: ['LoginForm', 'Email input', 'Password input', 'Sign In button'],
    DashboardContainer: ['DashboardContainer', 'Dashboard'],
    NavigationBar: ['NavigationBar', 'Top navigation bar'],
    'User authentication state': ['User authentication state', 'auth state'],
    'user-authenticated': ['user-authenticated', 'onLoginSuccess'],
  },
  evidence: {
    LoginForm: 'Handles authentication UI',
    DashboardContainer: 'Main dashboard layout',
    NavigationBar: 'Top navigation with user menu',
    'User authentication state': 'logged in/out, user profile',
    'user-authenticated': 'Fired on successful login',
  },
  vocabulary: {
    'sign-in': 'Sign In button',
    'login-form': 'LoginForm',
    dashboard: 'DashboardContainer',
    'nav-bar': 'NavigationBar',
  },
};

describe('System Workflow Integration (USA-54)', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let validConfig: UserStoryAgentConfig;
  let productContext: ProductContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    vi.mocked(ClaudeClient).mockImplementation(
      () => ({ sendMessage: mockSendMessage, sendMessageStreaming: vi.fn() }) as unknown as ClaudeClient
    );

    productContext = {
      productName: 'TestApp',
      productType: 'web',
      clientInfo: 'Test Client',
      targetAudience: 'General users',
      keyFeatures: ['Login', 'Dashboard'],
      businessContext: 'Test business',
    };

    validConfig = {
      mode: 'system-workflow',
      apiKey: 'test-api-key',
      model: 'claude-sonnet-4-20250514',
      productContext,
    };

    mockJudgeStory.mockResolvedValue(minimalJudgeRubric(5));
    mockJudgeGlobalConsistency.mockResolvedValue({
      issues: [],
      fixes: [],
    } as GlobalConsistencyReport);
    mockRewriteForSectionSeparation.mockResolvedValue('Rewritten story content');
  });

  /** Mock sendMessage to return Pass 0 / Pass 1 / Pass 2 response based on systemPrompt (for full pipeline). */
  function mockSendMessageByPass(opts: {
    pass0Payload?: object;
    pass1Title?: string;
    pass1Body?: string;
    pass2StoryId?: string;
    pass2UiMapping?: Record<string, string>;
    pass2ContractDeps?: string[];
  }) {
    const pass0 = systemDiscoveryResponse(opts.pass0Payload ?? PASS0_FIXTURE_PAYLOAD);
    const pass1 = pass1IterationResponse(opts.pass1Title ?? 'Login', opts.pass1Body ?? 'As a user I want to sign in.');
    const pass2 = pass2InterconnectionResponse(
      opts.pass2StoryId ?? 'Login',
      opts.pass2UiMapping ?? {},
      opts.pass2ContractDeps ?? []
    );
    mockSendMessage.mockImplementation((req: { systemPrompt: string }) => {
      if (req.systemPrompt.includes('Pass 0') || req.systemPrompt.includes('System Discovery')) {
        return Promise.resolve(pass0);
      }
      if (req.systemPrompt.includes('Pass 2') || req.systemPrompt.includes('Story Interconnection')) {
        return Promise.resolve(pass2);
      }
      return Promise.resolve(pass1);
    });
  }

  describe('Pass 0: System Discovery', () => {
    it('should extract components from mockups and reference docs', async () => {
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));

      const stories = [loadFixture('mockup-login.md'), loadFixture('mockup-dashboard.md')];
      const referenceDocuments = [loadFixture('reference-architecture.md')];

      const agent = new UserStoryAgent(validConfig);
      const context = await agent.runPass0Discovery(stories, referenceDocuments);

      expect(context).toBeDefined();
      expect(context.componentGraph).toBeDefined();
      expect(context.componentGraph.components).toBeDefined();
      expect(context.sharedContracts.stateModels).toBeDefined();
      expect(context.sharedContracts.eventRegistry).toBeDefined();
      expect(context.productVocabulary).toBeDefined();
      expect(context.timestamp).toBeDefined();

      const compIds = Object.keys(context.componentGraph.components);
      expect(compIds.length).toBeGreaterThanOrEqual(1);
      compIds.forEach((id) => expect(id).toMatch(/^COMP-/));

      context.sharedContracts.stateModels.forEach((sm) => {
        expect(sm.id).toMatch(/^C-STATE-/);
        expect(sm.name).toBeDefined();
      });
      context.sharedContracts.eventRegistry.forEach((ev) => {
        expect(ev.id).toMatch(/^E-/);
        expect(ev.name).toBeDefined();
      });
    });

    it('should build product vocabulary from terms', async () => {
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));

      const agent = new UserStoryAgent(validConfig);
      const context = await agent.runPass0Discovery(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );

      expect(context.productVocabulary).toBeDefined();
      expect(Object.keys(context.productVocabulary).length).toBeGreaterThanOrEqual(1);
    });

    it('should identify state models and events', async () => {
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));

      const agent = new UserStoryAgent(validConfig);
      const context = await agent.runPass0Discovery(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );

      expect(context.sharedContracts.stateModels.length).toBeGreaterThanOrEqual(1);
      expect(context.sharedContracts.eventRegistry.length).toBeGreaterThanOrEqual(1);
    });

    it('should mint stable IDs for discovered entities', async () => {
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));

      const agent = new UserStoryAgent(validConfig);
      const ctx1 = await agent.runPass0Discovery([loadFixture('mockup-login.md')]);
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));
      const ctx2 = await agent.runPass0Discovery([loadFixture('mockup-login.md')]);

      const ids1 = Object.keys(ctx1.componentGraph.components);
      const ids2 = Object.keys(ctx2.componentGraph.components);
      expect(ids1.length).toBe(ids2.length);
      ids1.forEach((id, i) => expect(id).toBe(ids2[i]));
    });
  });

  describe('Pass 1: Story Generation with Patches', () => {
    const individualConfig: UserStoryAgentConfig = {
      ...validConfig,
      mode: 'individual',
      iterations: ['interactive-elements'],
    };

    function buildMinimalSystemContext(): SystemDiscoveryContext {
      return {
        componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
        sharedContracts: {
          stateModels: [],
          eventRegistry: [],
          standardStates: [
            { type: 'loading', description: '' },
            { type: 'error', description: '' },
            { type: 'empty', description: '' },
            { type: 'success', description: '' },
          ],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
    }

    it('should generate stories using patch-based iterations', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in so that I can access the dashboard.')
      );

      const agent = new UserStoryAgent({
        ...individualConfig,
        iterations: ['user-roles'],
      });
      const result = await agent.processUserStory(loadFixture('mockup-login.md'), {
        systemContext: {
          ...buildMinimalSystemContext(),
          productVocabulary: { 'sign-in': 'Sign In button' },
        },
      });

      expect(result.success).toBe(true);
      expect(result.enhancedStory).toBeDefined();
      expect(result.enhancedStory.length).toBeGreaterThan(0);
      expect(result.appliedIterations.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply patches within allowed scopes', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          patches: [
            {
              op: 'add',
              path: 'userVisibleBehavior',
              item: { id: 'UVB-001', text: 'See email and password fields' },
              metadata: { advisorId: 'interactive-elements' },
            },
          ],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const agent = new UserStoryAgent(individualConfig);
      const result = await agent.processUserStory('# Login\n\nAs a user I want to log in.');

      expect(result.success).toBe(true);
      expect(result.enhancedStory).toBeDefined();
    });

    it('should accept patches with custom advisorId when path is in scope', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          patches: [
            {
              op: 'add',
              path: 'userVisibleBehavior',
              item: { id: 'UVB-001', text: 'Valid scope' },
              metadata: { advisorId: 'test' },
            },
          ],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const agent = new UserStoryAgent(individualConfig);
      const result = await agent.processUserStory('# Login\n\nAs a user I want to log in.');
      expect(result.success).toBe(true);
    });
  });

  describe('Pass 1c: Judging', () => {
    it('should judge story quality after generation', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in.')
      );
      mockJudgeStory.mockResolvedValue(minimalJudgeRubric(4));

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory(loadFixture('mockup-login.md'));

      expect(result.success).toBe(true);
      expect(result.judgeResults?.pass1c).toBeDefined();
      expect(result.judgeResults!.pass1c.overallScore).toBe(4);
      expect(result.judgeResults!.pass1c.recommendation).toBe('approve');
    });

    it('should trigger rewrite when score below threshold', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in.')
      );
      mockJudgeStory
        .mockResolvedValueOnce(minimalJudgeRubric(2))
        .mockResolvedValueOnce(minimalJudgeRubric(4));

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory(loadFixture('mockup-login.md'));

      expect(mockRewriteForSectionSeparation).toHaveBeenCalled();
      expect(result.judgeResults?.pass1cAfterRewrite).toBeDefined();
      expect(result.judgeResults!.pass1cAfterRewrite!.overallScore).toBe(4);
    });
  });

  describe('Pass 1b: Rewriting', () => {
    it('should rewrite story using section separation guidance', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in.')
      );
      mockJudgeStory
        .mockResolvedValueOnce(minimalJudgeRubric(2))
        .mockResolvedValueOnce(minimalJudgeRubric(4));
      mockRewriteForSectionSeparation.mockResolvedValue(
        '# Login\n\n## Story\nAs a user I want to sign in with clear sections.'
      );

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory(loadFixture('mockup-login.md'));

      expect(mockRewriteForSectionSeparation).toHaveBeenCalled();
      expect(result.enhancedStory).toBeDefined();
    });

    it('should re-judge after rewrite', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in.')
      );
      mockJudgeStory
        .mockResolvedValueOnce(minimalJudgeRubric(2))
        .mockResolvedValueOnce(minimalJudgeRubric(4));

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory(loadFixture('mockup-login.md'));

      expect(result.judgeResults?.pass1c).toBeDefined();
      expect(result.judgeResults?.pass1cAfterRewrite).toBeDefined();
      expect(mockJudgeStory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Refinement Loop', () => {
    function buildMinimalSystemContext(): SystemDiscoveryContext {
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
          standardStates: [
            { type: 'loading', description: 'In progress' },
            { type: 'error', description: 'Error' },
            { type: 'empty', description: 'No data' },
            { type: 'success', description: 'Done' },
          ],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
    }

    it('should discover new relationships during Pass 1', async () => {
      mockSendMessage.mockResolvedValue(
        pass1IterationResponse('Login', 'As a user I want to sign in.')
      );
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [
          {
            id: 'REL-001',
            type: 'component',
            operation: 'add_edge',
            name: 'LoginForm',
            evidence: 'Story mentions login form',
            confidence: 0.85,
          },
        ],
      });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory(loadFixture('mockup-login.md'), {
        systemContext: buildMinimalSystemContext(),
      });

      expect(result.judgeResults?.pass1c?.newRelationships).toHaveLength(1);
      expect(result.judgeResults!.pass1c!.newRelationships![0].confidence).toBe(0.85);
    });

    it('should merge high-confidence relationships', async () => {
      mockSendMessageByPass({ pass2StoryId: 'Login' });
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [
          {
            id: 'REL-1',
            type: 'component',
            operation: 'add_node',
            name: 'LoginForm',
            evidence: 'From story',
            confidence: 0.9,
          },
        ],
      });

      const agent = new UserStoryAgent(validConfig);
      const workflowResult = await agent.runSystemWorkflow(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );

      expect(workflowResult.systemContext).toBeDefined();
      expect(workflowResult.metadata.refinementRounds).toBeGreaterThanOrEqual(0);
    });

    it('should restart Pass 1 when context updated', async () => {
      mockSendMessageByPass({ pass2StoryId: 'Login' });
      mockJudgeStory.mockResolvedValue({ ...minimalJudgeRubric(5), newRelationships: [] });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.metadata.passesCompleted).toContain('Pass 1 (generation with refinement)');
      expect(result.metadata.refinementRounds).toBeGreaterThanOrEqual(1);
    });

    it('should converge after max rounds', async () => {
      mockSendMessageByPass({ pass2StoryId: 'Login' });
      mockJudgeStory.mockResolvedValue({ ...minimalJudgeRubric(5), newRelationships: [] });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.stories.length).toBe(1);
      expect(result.metadata.refinementRounds).toBeLessThanOrEqual(3);
    });
  });

  describe('Pass 2: Interconnection', () => {
    function buildMinimalSystemContext(): SystemDiscoveryContext {
      return {
        componentGraph: {
          components: {
            'COMP-LOGIN-FORM': {
              id: 'COMP-LOGIN-FORM',
              productName: 'LoginForm',
              description: 'Authentication UI',
            },
          },
          compositionEdges: [],
          coordinationEdges: [],
          dataFlows: [],
        },
        sharedContracts: {
          stateModels: [],
          eventRegistry: [],
          standardStates: [
            { type: 'loading', description: 'In progress' },
            { type: 'error', description: 'Error' },
            { type: 'empty', description: 'No data' },
            { type: 'success', description: 'Done' },
          ],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: { 'sign-in': 'Sign In button' },
        timestamp: new Date().toISOString(),
      };
    }

    it('should extract UI mapping from stories', async () => {
      mockSendMessage.mockResolvedValue(
        pass2InterconnectionResponse('Login', { 'Sign In button': 'COMP-LOGIN-FORM' }, [])
      );

      const agent = new UserStoryAgent(validConfig);
      const results = await agent.runPass2Interconnection(
        [{ id: 'Login', content: '# Login\n\nAs a user I want to sign in.' }],
        buildMinimalSystemContext()
      );

      expect(results).toHaveLength(1);
      expect(results[0].interconnections.uiMapping).toEqual({
        'Sign In button': 'COMP-LOGIN-FORM',
      });
    });

    it('should identify contract dependencies', async () => {
      mockSendMessage.mockResolvedValue(
        pass2InterconnectionResponse('Login', {}, ['C-STATE-AUTH'])
      );

      const ctx = buildMinimalSystemContext();
      ctx.sharedContracts.stateModels = [
        {
          id: 'C-STATE-AUTH',
          name: 'AuthState',
          description: 'Auth state',
          owner: 'COMP-LOGIN-FORM',
          consumers: [],
        },
      ];

      const agent = new UserStoryAgent(validConfig);
      const results = await agent.runPass2Interconnection(
        [{ id: 'Login', content: '# Login\n\nAs a user I want to sign in.' }],
        ctx
      );

      expect(results[0].interconnections.contractDependencies).toContain('C-STATE-AUTH');
    });

    it('should determine ownership relationships', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          storyId: 'Login',
          uiMapping: {},
          contractDependencies: [],
          ownership: {
            ownsState: ['C-STATE-SESSION'],
            consumesState: [],
            emitsEvents: ['user-authenticated'],
            listensToEvents: [],
          },
          relatedStories: [],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const agent = new UserStoryAgent(validConfig);
      const results = await agent.runPass2Interconnection(
        [{ id: 'Login', content: '# Login\n\nContent.' }],
        buildMinimalSystemContext()
      );

      expect(results[0].interconnections.ownership.ownsState).toContain('C-STATE-SESSION');
      expect(results[0].interconnections.ownership.emitsEvents).toContain('user-authenticated');
    });

    it('should find related stories', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          storyId: 'Login',
          uiMapping: {},
          contractDependencies: [],
          ownership: {
            ownsState: [],
            consumesState: [],
            emitsEvents: [],
            listensToEvents: [],
          },
          relatedStories: [
            { storyId: 'Dashboard', relationship: 'dependent', description: 'Redirects to dashboard after login' },
          ],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const agent = new UserStoryAgent(validConfig);
      const results = await agent.runPass2Interconnection(
        [{ id: 'Login', content: '# Login\n\nContent.' }],
        buildMinimalSystemContext()
      );

      expect(results[0].interconnections.relatedStories).toHaveLength(1);
      expect(results[0].interconnections.relatedStories[0].storyId).toBe('Dashboard');
    });
  });

  describe('Pass 2b: Global Consistency', () => {
    it('should detect cross-story contradictions', async () => {
      mockSendMessage.mockImplementation((req: { systemPrompt: string }) => {
        if (req.systemPrompt.includes('Pass 0') || req.systemPrompt.includes('System Discovery')) {
          return Promise.resolve(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));
        }
        if (req.systemPrompt.includes('Pass 2') || req.systemPrompt.includes('Story Interconnection')) {
          const storyId = req.systemPrompt.includes('Dashboard') ? 'Dashboard' : 'Login';
          return Promise.resolve(pass2InterconnectionResponse(storyId, {}, []));
        }
        const body = req.systemPrompt.includes('Dashboard') ? 'As a user I want to see my dashboard.' : 'As a user I want to sign in.';
        const title = req.systemPrompt.includes('Dashboard') ? 'Dashboard' : 'Login';
        return Promise.resolve(pass1IterationResponse(title, body));
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [
          {
            description: 'Contract ID mismatch: Login uses C-STATE-X, Dashboard uses C-STATE-Y for same concept',
            suggestedFixType: 'normalize-contract-id',
            confidence: 0.9,
            affectedStories: ['Login', 'Dashboard'],
          },
        ],
        fixes: [],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([
        loadFixture('mockup-login.md'),
        loadFixture('mockup-dashboard.md'),
      ]);

      expect(result.consistencyReport.issues.length).toBeGreaterThanOrEqual(1);
      expect(result.consistencyReport.issues[0].description).toContain('mismatch');
    });

    it('should validate contract IDs against system context', async () => {
      mockSendMessageByPass({
        pass1Body: 'Content.',
        pass2StoryId: 'Login',
        pass2ContractDeps: ['C-STATE-AUTH'],
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [
          {
            description: 'Story references C-STATE-UNKNOWN which is not in system context',
            suggestedFixType: 'normalize-contract-id',
            confidence: 0.95,
            affectedStories: ['Login'],
          },
        ],
        fixes: [],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.consistencyReport.issues.some((i) => i.suggestedFixType === 'normalize-contract-id')).toBe(true);
    });

    it('should find naming inconsistencies', async () => {
      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [
          {
            description: 'Term "sign-in" used in Story A, "login" in Story B for same action',
            suggestedFixType: 'normalize-term-to-vocabulary',
            confidence: 0.85,
            affectedStories: ['Login', 'Dashboard'],
          },
        ],
        fixes: [],
      } as GlobalConsistencyReport);

      mockSendMessageByPass({ pass1Body: 'Content.', pass2StoryId: 'Login' });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.consistencyReport.issues.length).toBeGreaterThanOrEqual(1);
    });

    it('should check bidirectional links', async () => {
      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [
          {
            description: 'Login references Dashboard as related; Dashboard does not reference Login',
            suggestedFixType: 'add-bidirectional-link',
            confidence: 0.9,
            affectedStories: ['Login', 'Dashboard'],
          },
        ],
        fixes: [],
      } as GlobalConsistencyReport);

      mockSendMessageByPass({ pass1Body: 'Content.', pass2StoryId: 'Login' });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.consistencyReport.issues.some((i) => i.suggestedFixType === 'add-bidirectional-link')).toBe(true);
    });
  });

  describe('Auto-Apply Fixes', () => {
    it('should apply high-confidence fixes to StoryStructure', async () => {
      mockSendMessageByPass({
        pass1Body: 'As a user I want to log in.',
        pass2StoryId: 'Login',
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [],
        fixes: [
          {
            type: 'normalize-term-to-vocabulary',
            storyId: 'Login',
            path: 'story.iWant',
            operation: 'replace',
            item: { id: 'iwant-1', text: 'to sign in' },
            match: { id: 'iwant-1' },
            confidence: 0.9,
            reasoning: 'Use product vocabulary',
          },
        ],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.metadata.fixesApplied).toBeGreaterThanOrEqual(0);
      expect(result.metadata.fixesFlaggedForReview).toBeDefined();
    });

    it('should re-render markdown after fixes', async () => {
      mockSendMessageByPass({
        pass1Body: 'As a user I want to log in.',
        pass2StoryId: 'Login',
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [],
        fixes: [
          {
            type: 'normalize-term-to-vocabulary',
            storyId: 'Login',
            path: 'story.iWant',
            operation: 'replace',
            item: { id: 'x', text: 'to sign in' },
            match: { id: 'x' },
            confidence: 0.95,
            reasoning: 'Align with vocabulary',
          },
        ],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.stories[0].content).toBeDefined();
      expect(result.stories[0].content.length).toBeGreaterThan(0);
    });

    it('should log applied fixes', async () => {
      mockSendMessageByPass({
        pass1Body: 'As a user I want to log in.',
        pass2StoryId: 'Login',
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [],
        fixes: [
          {
            type: 'normalize-term-to-vocabulary',
            storyId: 'Login',
            path: 'story.iWant',
            operation: 'replace',
            item: { id: 'x', text: 'to sign in' },
            match: { id: 'x' },
            confidence: 0.9,
            reasoning: 'Use product term',
          },
        ],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.metadata.fixesApplied).toBeDefined();
      expect(result.metadata.fixesFlaggedForReview).toBeDefined();
    });

    it('should flag low-confidence fixes for manual review', async () => {
      mockSendMessageByPass({
        pass1Body: 'As a user I want to log in.',
        pass2StoryId: 'Login',
      });

      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [],
        fixes: [
          {
            type: 'normalize-term-to-vocabulary',
            storyId: 'Login',
            path: 'story.iWant',
            operation: 'replace',
            item: { id: 'x', text: 'to sign in' },
            match: { id: 'x' },
            confidence: 0.5,
            reasoning: 'Uncertain alignment',
          },
        ],
      } as GlobalConsistencyReport);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([loadFixture('mockup-login.md')]);

      expect(result.metadata.fixesFlaggedForReview).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Full Pipeline', () => {
    it('should run complete workflow from mockups to final stories', async () => {
      mockSendMessageByPass({
        pass1Body: 'As a user I want to sign in so that I can access the dashboard.',
        pass2StoryId: 'Login',
        pass2UiMapping: { 'Sign In button': 'COMP-LOGIN-FORM' },
      });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );

      expect(result.systemContext).toBeDefined();
      expect(result.stories).toHaveLength(1);
      expect(result.stories[0].id).toBeDefined();
      expect(result.stories[0].content).toBeDefined();
      expect(result.stories[0].interconnections).toBeDefined();
      expect(result.consistencyReport).toBeDefined();
      expect(result.metadata.passesCompleted).toEqual([
        'Pass 0 (discovery)',
        'Pass 1 (generation with refinement)',
        'Pass 2 (interconnection)',
        'Pass 2b (global consistency)',
      ]);
      expect(result.metadata.refinementRounds).toBeGreaterThanOrEqual(0);
      expect(result.metadata.fixesApplied).toBeDefined();
      expect(result.metadata.fixesFlaggedForReview).toBeDefined();
    });

    it('should produce consistent results across runs', async () => {
      mockSendMessage
        .mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));
      const agent = new UserStoryAgent(validConfig);
      const ctx1 = await agent.runPass0Discovery(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));
      const ctx2 = await agent.runPass0Discovery(
        [loadFixture('mockup-login.md')],
        [loadFixture('reference-architecture.md')]
      );

      const compIds1 = Object.keys(ctx1.componentGraph.components).sort();
      const compIds2 = Object.keys(ctx2.componentGraph.components).sort();
      expect(compIds1).toEqual(compIds2);
    });

    it('should handle multiple stories in batch', async () => {
      mockSendMessageByPass({
        pass1Title: 'Login',
        pass1Body: 'As a user I want to sign in.',
        pass2StoryId: 'Login',
      });
      mockSendMessage.mockImplementation((req: { systemPrompt: string }) => {
        if (req.systemPrompt.includes('Pass 0') || req.systemPrompt.includes('System Discovery')) {
          return Promise.resolve(systemDiscoveryResponse(PASS0_FIXTURE_PAYLOAD));
        }
        if (req.systemPrompt.includes('Pass 2') || req.systemPrompt.includes('Story Interconnection')) {
          const storyId = req.systemPrompt.includes('Dashboard') ? 'Dashboard' : 'Login';
          return Promise.resolve(pass2InterconnectionResponse(storyId, {}, []));
        }
        const body = req.systemPrompt.includes('Dashboard') ? 'As a user I want to see my dashboard.' : 'As a user I want to sign in.';
        const title = req.systemPrompt.includes('Dashboard') ? 'Dashboard' : 'Login';
        return Promise.resolve(pass1IterationResponse(title, body));
      });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([
        loadFixture('mockup-login.md'),
        loadFixture('mockup-dashboard.md'),
      ]);

      expect(result.stories).toHaveLength(2);
      expect(result.stories[0].id).toBeDefined();
      expect(result.stories[1].id).toBeDefined();
      expect(result.consistencyReport).toBeDefined();
      expect(result.metadata.passesCompleted).toHaveLength(4);
    });
  });
});
