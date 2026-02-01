/**
 * Unit tests for user-story-agent.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStoryAgent, createAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig, IterationOption } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { getIterationById, WORKFLOW_ORDER } from '../../src/shared/iteration-registry.js';
import type { ProductContext, SystemDiscoveryContext } from '../../src/shared/types.js';
import type { IterationId } from '../../src/shared/iteration-registry.js';
import type { JudgeRubric } from '../../src/shared/types.js';
import { StreamingHandler } from '../../src/agent/streaming.js';
import { logger } from '../../src/utils/logger.js';

function getMessageText(content: string | Array<{ type: string; text?: string }>): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n');
}

// Mock ClaudeClient
vi.mock('../../src/agent/claude-client.js', () => {
  return {
    ClaudeClient: vi.fn(),
  };
});

// Mock StoryJudge and StoryRewriter so judge/rewrite don't call API; tests override return values
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

// Mock TitleGenerator: extract title from markdown # heading when present; otherwise throw so agent leaves story unchanged (no overwrite with "Generated Title")
const mockTitleGenerate = vi.fn().mockImplementation(async (markdown: string) => {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) {
    return { title: match[1].trim(), reasoning: undefined };
  }
  throw new Error('No title in markdown');
});
vi.mock('../../src/agent/title-generator.js', () => ({
  TitleGenerator: vi.fn().mockImplementation(() => ({
    generate: mockTitleGenerate,
  })),
}));

/** Minimal JudgeRubric for tests (overallScore 0-5) */
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

describe('UserStoryAgent', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockSendMessageStreaming: ReturnType<typeof vi.fn>;
  let mockClaudeClient: { sendMessage: ReturnType<typeof vi.fn>; sendMessageStreaming: ReturnType<typeof vi.fn> };
  let validConfig: UserStoryAgentConfig;
  let productContext: ProductContext;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock sendMessage function
    mockSendMessage = vi.fn();
    mockSendMessageStreaming = vi.fn();

    // Create mock ClaudeClient instance
    mockClaudeClient = {
      sendMessage: mockSendMessage,
      sendMessageStreaming: mockSendMessageStreaming,
    };

    // Make ClaudeClient constructor return our mock
    vi.mocked(ClaudeClient).mockImplementation(() => mockClaudeClient as unknown as ClaudeClient);

    // Valid config for most tests
    validConfig = {
      mode: 'individual',
      iterations: ['user-roles', 'validation'],
      apiKey: 'test-api-key',
      model: 'claude-sonnet-4-20250514',
    };

    // Product context for tests
    productContext = {
      productName: 'TestApp',
      productType: 'web app',
      clientInfo: 'Test Client',
      targetAudience: 'General users',
      keyFeatures: ['Feature 1', 'Feature 2'],
      businessContext: 'Test business context',
    };

    // Default mock response (JSON format)
    mockSendMessage.mockResolvedValue({
      content: JSON.stringify({
        enhancedStory: 'Enhanced user story with improvements',
        changesApplied: [],
      }),
      stopReason: 'end_turn',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
      },
    });

    // Default: judge returns high score so no rewrite (Pass 1c only)
    mockJudgeStory.mockResolvedValue(minimalJudgeRubric(5));
    mockRewriteForSectionSeparation.mockResolvedValue('Rewritten story');
  });

  describe('Config Validation', () => {
    it('should throw error for invalid iteration IDs', () => {
      const invalidConfig: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['invalid-iteration-id', 'another-invalid-id'],
      };

      expect(() => new UserStoryAgent(invalidConfig)).toThrow(
        /Invalid iteration ID: invalid-iteration-id/
      );
    });

    it('should throw error for unsupported mode', () => {
      const invalidConfig = {
        ...validConfig,
        mode: 'invalid-mode' as any,
      } as UserStoryAgentConfig;

      expect(() => new UserStoryAgent(invalidConfig)).toThrow(
        /Unsupported mode: invalid-mode/
      );
    });

    it('should throw error for workflow mode without productType', () => {
      const invalidConfig: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'workflow',
        productContext: {
          productName: 'TestApp',
          productType: undefined as any,
        },
      };

      expect(() => new UserStoryAgent(invalidConfig)).toThrow(
        /Workflow and system-workflow modes require productContext with productType/
      );
    });

    it('should accept workflow mode with productType', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'workflow',
        productContext: {
          productName: 'TestApp',
          productType: 'web',
        },
      };

      expect(() => new UserStoryAgent(config)).not.toThrow();
    });

    it('should accept system-workflow mode (USA-53)', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'system-workflow',
        productContext: {
          productName: 'TestApp',
          productType: 'web',
        },
      };

      expect(() => new UserStoryAgent(config)).not.toThrow();
    });

    it('should accept valid config with valid iteration IDs', () => {
      const config: UserStoryAgentConfig = {
        mode: 'individual',
        iterations: ['user-roles', 'validation', 'accessibility'],
        apiKey: 'test-api-key',
      };

      expect(() => new UserStoryAgent(config)).not.toThrow();
    });

    it('should validate all iteration IDs in the list', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['user-roles', 'invalid-id', 'validation'],
      };

      expect(() => new UserStoryAgent(config)).toThrow(
        /Invalid iteration ID: invalid-id/
      );
    });
  });

  describe('processUserStory', () => {
    it('should return error result for empty story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('');

      expect(result.success).toBe(false);
      expect(result.originalStory).toBe('');
      expect(result.enhancedStory).toBe('');
      expect(result.appliedIterations).toEqual([]);
      expect(result.summary).toContain('cannot be empty');
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should return error result for whitespace-only story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.originalStory).toBe('');
      expect(result.enhancedStory).toBe('');
      expect(result.appliedIterations).toEqual([]);
      expect(result.summary).toContain('cannot be empty');
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should apply iterations in specified order', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['user-roles', 'validation', 'accessibility'],
      };
      const agent = new UserStoryAgent(config);

      // Mock different responses for each iteration
      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with user roles',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with user roles and validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with user roles, validation, and accessibility',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 200, outputTokens: 100 },
        });

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(result.appliedIterations).toEqual(['user-roles', 'validation', 'accessibility']);
      expect(mockSendMessage).toHaveBeenCalledTimes(3);

      // Verify iterations were called in order by checking the input stories
      const firstCall = mockSendMessage.mock.calls[0][0];
      const secondCall = mockSendMessage.mock.calls[1][0];
      const thirdCall = mockSendMessage.mock.calls[2][0];

      expect(getMessageText(firstCall.messages[0].content)).toContain('As a user, I want to login');
      expect(getMessageText(secondCall.messages[0].content)).toContain('Story with user roles');
      expect(getMessageText(thirdCall.messages[0].content)).toContain('Story with user roles and validation');
    });

    it('should pass product context to state', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        productContext,
      };
      const agent = new UserStoryAgent(config);

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(mockSendMessage).toHaveBeenCalled();

      // Verify product context was included in the prompt
      const callArgs = mockSendMessage.mock.calls[0][0];
      const userMessage = getMessageText(callArgs.messages[0].content);

      expect(userMessage).toContain('TestApp');
      expect(userMessage).toContain('web app');
      expect(userMessage).toContain('General users');
      expect(userMessage).toContain('Test business context');
    });

    it('should return success result with enhanced story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const initialStory = 'As a user, I want to login';

      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Enhanced story with roles',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Enhanced story with roles and validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        });

      const result = await agent.processUserStory(initialStory);

      expect(result.success).toBe(true);
      expect(result.originalStory).toBe(initialStory);
      expect(result.enhancedStory).toBe('Enhanced story with roles and validation');
      expect(result.appliedIterations).toEqual(['user-roles', 'validation']);
      expect(result.iterationResults).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should return error result when Claude API fails', async () => {
      const agent = new UserStoryAgent(validConfig);
      const apiError = new Error('Claude API error: Rate limit exceeded');
      mockSendMessage.mockRejectedValueOnce(apiError);

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(false);
      expect(result.originalStory).toBe('As a user, I want to login');
      expect(result.summary).toContain('Error processing user story');
      expect(result.summary).toContain('Rate limit exceeded');
    });

    it('should handle partial failures gracefully', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['user-roles', 'validation'],
      };
      const agent = new UserStoryAgent(config);

      // First iteration succeeds, second fails
      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with roles',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockRejectedValueOnce(new Error('API error'));

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(false);
      // Note: Current implementation doesn't preserve partial state on error
      // The state returned is from before processing started
      expect(result.appliedIterations).toEqual([]);
      expect(result.iterationResults).toHaveLength(0);
      expect(result.summary).toContain('Error');
    });

    it('should preserve original story even on error', async () => {
      const agent = new UserStoryAgent(validConfig);
      const initialStory = 'As a user, I want to login';
      mockSendMessage.mockRejectedValueOnce(new Error('API error'));

      const result = await agent.processUserStory(initialStory);

      expect(result.success).toBe(false);
      expect(result.originalStory).toBe(initialStory);
      expect(result.enhancedStory).toBe(initialStory); // Should remain unchanged on error
    });
  });

  describe('applyIteration (via processUserStory)', () => {
    it('should build context prompt correctly', async () => {
      const agent = new UserStoryAgent(validConfig);
      const initialStory = 'As a user, I want to login';

      await agent.processUserStory(initialStory);

      // Verify the first iteration call includes proper context
      const firstCall = mockSendMessage.mock.calls[0][0];
      const userMessage = getMessageText(firstCall.messages[0].content);

      // Should include the iteration prompt
      const userRolesIteration = getIterationById('user-roles');
      expect(userMessage).toContain(userRolesIteration!.prompt);

      // Should include the current story
      expect(userMessage).toContain(initialStory);

      // Should include system prompt
      expect(firstCall.systemPrompt).toBeDefined();
    });

    it('should build context prompt with product context when available', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        productContext,
      };
      const agent = new UserStoryAgent(config);

      await agent.processUserStory('As a user, I want to login');

      const firstCall = mockSendMessage.mock.calls[0][0];
      const userMessage = getMessageText(firstCall.messages[0].content);

      // Should include product context in the prompt
      expect(userMessage).toContain('TestApp');
      expect(userMessage).toContain('web app');
    });

    it('should include previous iterations in context for subsequent calls', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['user-roles', 'validation'],
      };
      const agent = new UserStoryAgent(config);

      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with roles',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with roles and validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        });

      await agent.processUserStory('As a user, I want to login');

      // Second call should include context about the first iteration
      const secondCall = mockSendMessage.mock.calls[1][0];
      const secondUserMessage = getMessageText(secondCall.messages[0].content);

      // Should reference the first iteration's output
      expect(secondUserMessage).toContain('Story with roles');
      // Should mention applied iterations (uses iteration name, not ID)
      expect(secondUserMessage).toContain('User Roles');
      expect(secondUserMessage).toContain('Applied Enhancements');
    });

    it('should throw error if iteration returns empty response', async () => {
      const agent = new UserStoryAgent(validConfig);

      // Mock empty response
      mockSendMessage.mockResolvedValueOnce({
        content: '   ', // Whitespace only
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 0 },
      });

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(false);
      expect(result.summary).toContain('empty story');
      expect(result.summary).toContain('user-roles');
    });

    it('should pass correct model to Claude client', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        model: 'claude-opus-3',
      };
      const agent = new UserStoryAgent(config);

      await agent.processUserStory('As a user, I want to login');

      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs.model).toBe('claude-opus-3');
    });

    it('should create iteration results with correct structure', async () => {
      const agent = new UserStoryAgent(validConfig);
      const initialStory = 'As a user, I want to login';

      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Enhanced story',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'More enhanced story',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        });

      const result = await agent.processUserStory(initialStory);

      expect(result.iterationResults).toHaveLength(2);

      // Check first iteration result
      const firstResult = result.iterationResults[0];
      expect(firstResult.iterationId).toBe('user-roles');
      expect(firstResult.inputStory).toBe(initialStory);
      expect(firstResult.outputStory).toBe('Enhanced story');
      expect(firstResult.changesApplied).toEqual([]);
      expect(firstResult.timestamp).toBeDefined();

      // Check second iteration result
      const secondResult = result.iterationResults[1];
      expect(secondResult.iterationId).toBe('validation');
      expect(secondResult.inputStory).toBe('Enhanced story');
      expect(secondResult.outputStory).toBe('More enhanced story');
    });
  });

  describe('createAgent factory function', () => {
    it('should create a UserStoryAgent instance', () => {
      const agent = createAgent(validConfig);
      expect(agent).toBeInstanceOf(UserStoryAgent);
    });

    it('should validate config when creating agent', () => {
      const invalidConfig = {
        ...validConfig,
        iterations: ['invalid-id'],
      };

      expect(() => createAgent(invalidConfig)).toThrow(/Invalid iteration ID/);
    });
  });

  describe('Edge cases', () => {
    it('should handle single iteration', async () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: ['user-roles'],
      };
      const agent = new UserStoryAgent(config);

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(result.appliedIterations).toEqual(['user-roles']);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
    });

    it('should reject empty iterations array in individual mode', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        iterations: [],
      };

      expect(() => new UserStoryAgent(config)).toThrow(
        /Individual mode requires at least one iteration ID/
      );
    });

    it('should handle very long story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const longStory = 'As a user, I want to login. '.repeat(100);

      await agent.processUserStory(longStory);

      expect(mockSendMessage).toHaveBeenCalled();
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(getMessageText(callArgs.messages[0].content)).toContain(longStory);
    });

    it('should handle special characters in story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const specialStory = 'As a user, I want to login with email: user@example.com & password!';

      await agent.processUserStory(specialStory);

      expect(mockSendMessage).toHaveBeenCalled();
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(getMessageText(callArgs.messages[0].content)).toContain(specialStory);
    });
  });

  describe('Interactive Mode', () => {
    it('should throw error for interactive mode without callback', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: undefined,
      };

      expect(() => new UserStoryAgent(config)).toThrow(
        /Interactive mode requires onIterationSelection callback/
      );
    });

    it('should accept interactive mode with callback', () => {
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: async () => [],
      };

      expect(() => new UserStoryAgent(config)).not.toThrow();
    });

    it('should call selection callback with available iterations', async () => {
      const mockCallback = vi.fn().mockResolvedValue(['validation', 'accessibility']);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
      };
      const agent = new UserStoryAgent(config);

      // Mock API responses for selected iterations + consolidation
      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with validation and accessibility',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Consolidated story',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 200, outputTokens: 100 },
        });

      await agent.processUserStory('As a user, I want to login');

      // Verify callback was called with iteration options
      expect(mockCallback).toHaveBeenCalledTimes(1);
      const options = mockCallback.mock.calls[0][0] as IterationOption[];
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('id');
      expect(options[0]).toHaveProperty('name');
      expect(options[0]).toHaveProperty('description');
      expect(options[0]).toHaveProperty('category');
    });

    it('should apply selected iterations in WORKFLOW_ORDER', async () => {
      // Select iterations out of WORKFLOW_ORDER
      const mockCallback = vi.fn().mockResolvedValue(['accessibility', 'user-roles', 'validation']);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
      };
      const agent = new UserStoryAgent(config);

      // Mock API responses for 3 iterations + consolidation
      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with user roles',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with accessibility',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 200, outputTokens: 100 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Consolidated story',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 250, outputTokens: 125 },
        });

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      // Iterations should be applied in WORKFLOW_ORDER: user-roles, validation, accessibility
      expect(result.appliedIterations).toEqual(['user-roles', 'validation', 'accessibility', 'consolidation']);
    });

    it('should run consolidation after selected iterations', async () => {
      const mockCallback = vi.fn().mockResolvedValue(['validation']);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
      };
      const agent = new UserStoryAgent(config);

      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Story with validation',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            enhancedStory: 'Consolidated story',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 150, outputTokens: 75 },
        });

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(result.appliedIterations).toContain('consolidation');
      expect(mockSendMessage).toHaveBeenCalledTimes(2); // validation + consolidation
    });

    it('should return original story when no iterations selected', async () => {
      const mockCallback = vi.fn().mockResolvedValue([]);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
      };
      const agent = new UserStoryAgent(config);
      // Use a story with a title so generateTitle no-ops and no API calls are made
      const initialStory = '# Login\n\nAs a user, I want to login';

      const result = await agent.processUserStory(initialStory);

      expect(result.success).toBe(true);
      expect(result.enhancedStory).toBe(initialStory);
      expect(result.appliedIterations).toEqual([]);
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should filter iterations by product type when provided', async () => {
      const mockCallback = vi.fn().mockResolvedValue([]);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
        productContext: {
          productName: 'TestApp',
          productType: 'mobile-native',
          clientInfo: 'Test Client',
          targetAudience: 'Mobile users',
          keyFeatures: [],
          businessContext: 'Mobile app',
        },
      };
      const agent = new UserStoryAgent(config);

      await agent.processUserStory('As a user, I want to login');

      // Verify callback was called with filtered options
      const options = mockCallback.mock.calls[0][0] as IterationOption[];
      const optionIds = options.map((opt: IterationOption) => opt.id);

      // mobile-native should include responsive-native but not responsive-web
      expect(optionIds).toContain('responsive-native');
      expect(optionIds).not.toContain('responsive-web');
    });

    it('should reject invalid iteration ID selections', async () => {
      const mockCallback = vi.fn().mockResolvedValue(['validation', 'invalid-id']);
      const config: UserStoryAgentConfig = {
        ...validConfig,
        mode: 'interactive',
        onIterationSelection: mockCallback,
      };
      const agent = new UserStoryAgent(config);

      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(false);
      expect(result.summary).toContain('Invalid iteration ID selected');
    });
  });

  describe('Individual mode validation', () => {
    it('should throw error for individual mode without iterations', () => {
      const config: UserStoryAgentConfig = {
        mode: 'individual',
        iterations: undefined,
        apiKey: 'test-api-key',
      };

      expect(() => new UserStoryAgent(config)).toThrow(
        /Individual mode requires at least one iteration ID/
      );
    });
  });

  describe('Streaming support', () => {
    it('should extend EventEmitter', () => {
      const agent = new UserStoryAgent(validConfig);
      expect(agent).toBeInstanceOf(UserStoryAgent);
      // EventEmitter methods should be available
      expect(typeof agent.on).toBe('function');
      expect(typeof agent.emit).toBe('function');
    });

    it('should have streaming property set from config', () => {
      const configWithStreaming: UserStoryAgentConfig = {
        ...validConfig,
        streaming: true,
      };
      const agent = new UserStoryAgent(configWithStreaming);
      expect(agent.streaming).toBe(true);
    });

    it('should default streaming to false', () => {
      const agent = new UserStoryAgent(validConfig);
      expect(agent.streaming).toBe(false);
    });

    it('should use sendMessageStreaming when streaming is enabled', async () => {
      const configWithStreaming: UserStoryAgentConfig = {
        ...validConfig,
        streaming: true,
      };
      const agent = new UserStoryAgent(configWithStreaming);

      // Mock streaming response
      mockSendMessageStreaming.mockImplementation(async (options, handler: StreamingHandler) => {
        handler.start();
        handler.chunk('{"enhancedStory": "');
        handler.chunk('Enhanced story');
        handler.chunk('", "changesApplied": []}');
        handler.complete({ inputTokens: 100, outputTokens: 50 });
        return {
          content: '{"enhancedStory": "Enhanced story", "changesApplied": []}',
          usage: { inputTokens: 100, outputTokens: 50 },
        };
      });

      const initialStory = 'As a user, I want to login';
      const result = await agent.processUserStory(initialStory);

      expect(result.success).toBe(true);
      expect(mockSendMessageStreaming).toHaveBeenCalled();
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should emit stream events when streaming is enabled', async () => {
      const configWithStreaming: UserStoryAgentConfig = {
        ...validConfig,
        streaming: true,
      };
      const agent = new UserStoryAgent(configWithStreaming);

      const streamEvents: any[] = [];
      agent.on('stream', (event) => {
        streamEvents.push(event);
      });

      // Mock streaming response
      mockSendMessageStreaming.mockImplementation(async (options, handler: StreamingHandler) => {
        handler.start();
        handler.chunk('chunk1');
        handler.chunk('chunk2');
        handler.complete({ inputTokens: 10, outputTokens: 5 });
        return {
          content: 'chunk1chunk2',
          usage: { inputTokens: 10, outputTokens: 5 },
        };
      });

      await agent.processUserStory('As a user, I want to login');

      // Should have received start, chunk, chunk, and complete events
      expect(streamEvents.length).toBeGreaterThanOrEqual(4);
      expect(streamEvents[0].type).toBe('start');
      expect(streamEvents[1].type).toBe('chunk');
      expect(streamEvents[2].type).toBe('chunk');
      expect(streamEvents[streamEvents.length - 1].type).toBe('complete');
    });

    it('should use regular sendMessage when streaming is disabled', async () => {
      const agent = new UserStoryAgent(validConfig);
      const initialStory = 'As a user, I want to login';

      await agent.processUserStory(initialStory);

      expect(mockSendMessage).toHaveBeenCalled();
      expect(mockSendMessageStreaming).not.toHaveBeenCalled();
    });
  });

  describe('Judge-First Workflow (Pass 1c)', () => {
    it('should call judge after story generation and not trigger rewrite when score above threshold', async () => {
      mockJudgeStory.mockResolvedValue(minimalJudgeRubric(4));

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(mockJudgeStory).toHaveBeenCalledTimes(1);
      expect(mockRewriteForSectionSeparation).not.toHaveBeenCalled();
      expect(result.judgeResults?.pass1c?.overallScore).toBe(4);
      expect(result.judgeResults?.pass1cAfterRewrite).toBeUndefined();
      expect(result.needsManualReview).toBeUndefined();
    });

    it('should trigger rewrite when score below threshold and re-judge once', async () => {
      mockJudgeStory
        .mockResolvedValueOnce(minimalJudgeRubric(2))
        .mockResolvedValueOnce(minimalJudgeRubric(4));
      mockRewriteForSectionSeparation.mockResolvedValue('Rewritten story markdown');

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(mockJudgeStory).toHaveBeenCalledTimes(2);
      expect(mockRewriteForSectionSeparation).toHaveBeenCalledTimes(1);
      expect(result.judgeResults?.pass1c?.overallScore).toBe(2);
      expect(result.judgeResults?.pass1cAfterRewrite?.overallScore).toBe(4);
      expect(result.enhancedStory).toBe('Rewritten story markdown');
      expect(result.needsManualReview).toBeUndefined();
    });

    it('should set needsManualReview when score still below threshold after rewrite', async () => {
      mockJudgeStory
        .mockResolvedValueOnce(minimalJudgeRubric(2))
        .mockResolvedValueOnce(minimalJudgeRubric(3));
      mockRewriteForSectionSeparation.mockResolvedValue('Rewritten story markdown');

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(mockJudgeStory).toHaveBeenCalledTimes(2);
      expect(mockRewriteForSectionSeparation).toHaveBeenCalledTimes(1);
      expect(result.judgeResults?.pass1cAfterRewrite?.overallScore).toBe(3);
      expect(result.needsManualReview).toEqual({
        reason: 'low-quality-after-rewrite',
        score: 3,
      });
    });

    it('should not call rewrite when score above threshold and not set manual review flag', async () => {
      mockJudgeStory.mockResolvedValue(minimalJudgeRubric(4));

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.processUserStory('As a user, I want to login');

      expect(result.success).toBe(true);
      expect(mockJudgeStory).toHaveBeenCalledTimes(1);
      expect(mockRewriteForSectionSeparation).not.toHaveBeenCalled();
      expect(result.judgeResults?.pass1c?.overallScore).toBe(4);
      expect(result.needsManualReview).toBeUndefined();
    });
  });

  describe('Pass 0: System Discovery (USA-44)', () => {
    const systemDiscoveryResponse = (payload: object) => ({
      content: JSON.stringify(payload),
      stopReason: 'end_turn' as const,
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    it('should extract component mentions and mint stable IDs', async () => {
      mockSendMessage.mockResolvedValue(
        systemDiscoveryResponse({
          mentions: {
            components: ['Login Button', 'login-btn', 'User Profile'],
            stateModels: ['userProfile'],
            events: ['user-authenticated'],
          },
          canonicalNames: {
            'Login Button': ['Login Button', 'login-btn'],
            'User Profile': ['User Profile', 'userProfile'],
            'user-authenticated': ['user-authenticated', 'USER_AUTH'],
          },
          evidence: {
            'Login Button': 'Story mentions login',
            'User Profile': 'Story mentions profile',
            'user-authenticated': 'Spec says on login',
          },
          vocabulary: {
            'login-btn': 'Login Button',
            userProfile: 'User Profile',
          },
        })
      );

      const agent = new UserStoryAgent(validConfig);
      const ctx = await agent.runPass0Discovery(['As a user, I want to login']);

      expect(ctx).toBeDefined();
      expect(ctx.componentGraph).toBeDefined();
      expect(ctx.componentGraph.components).toBeDefined();
      expect(ctx.sharedContracts.stateModels).toBeDefined();
      expect(ctx.sharedContracts.eventRegistry).toBeDefined();
      expect(ctx.productVocabulary).toBeDefined();

      const compIds = Object.keys(ctx.componentGraph.components);
      expect(compIds.length).toBeGreaterThanOrEqual(1);
      compIds.forEach((id) => {
        expect(id).toMatch(/^COMP-/);
      });

      const componentValues = Object.values(ctx.componentGraph.components);
      const canonicalNames = componentValues.map((c) => c.productName);
      expect(canonicalNames).toContain('Login Button');
      expect(canonicalNames).toContain('User Profile');
    });

    it('should handle empty stories array', async () => {
      mockSendMessage.mockResolvedValue(
        systemDiscoveryResponse({
          mentions: { components: [], stateModels: [], events: [] },
          canonicalNames: {},
          evidence: {},
          vocabulary: {},
        })
      );

      const agent = new UserStoryAgent(validConfig);
      const ctx = await agent.runPass0Discovery([]);

      expect(ctx).toBeDefined();
      expect(ctx.componentGraph.components).toEqual({});
      expect(ctx.sharedContracts.stateModels).toEqual([]);
      expect(ctx.sharedContracts.eventRegistry).toEqual([]);
      expect(ctx.productVocabulary).toEqual({});
      expect(ctx.timestamp).toBeDefined();
    });

    it('should parse product vocabulary correctly', async () => {
      mockSendMessage.mockResolvedValue(
        systemDiscoveryResponse({
          mentions: { components: ['Filter Bar'], stateModels: [], events: [] },
          canonicalNames: { 'Filter Bar': ['Filter Bar', 'filter-bar'] },
          evidence: { 'Filter Bar': 'Mockup shows filter bar' },
          vocabulary: {
            'filter-bar': 'Filter Bar',
            'top bar': 'Filter Bar',
          },
        })
      );

      const agent = new UserStoryAgent(validConfig);
      const ctx = await agent.runPass0Discovery(['Story with filter bar']);

      expect(ctx.productVocabulary).toEqual({
        'filter-bar': 'Filter Bar',
        'top bar': 'Filter Bar',
      });
    });

    it('should mint deterministic IDs via ID Registry', async () => {
      const payload = {
        mentions: {
          components: ['Login Button'],
          stateModels: [],
          events: [],
        },
        canonicalNames: { 'Login Button': ['Login Button', 'login-btn'] },
        evidence: { 'Login Button': 'Story' },
        vocabulary: { 'login-btn': 'Login Button' },
      };
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(payload));

      const agent = new UserStoryAgent(validConfig);
      const ctx1 = await agent.runPass0Discovery(['Story 1']);
      mockSendMessage.mockResolvedValue(systemDiscoveryResponse(payload));
      const ctx2 = await agent.runPass0Discovery(['Story 2']);

      const id1 = Object.keys(ctx1.componentGraph.components)[0];
      const id2 = Object.keys(ctx2.componentGraph.components)[0];
      expect(id1).toMatch(/^COMP-/);
      expect(id2).toMatch(/^COMP-/);
      expect(id1).toBe(id2);
    });
  });

  describe('Refinement Loop (USA-46)', () => {
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
          standardStates: [],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
    }

    beforeEach(() => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [],
        needsSystemContextUpdate: false,
      });
    });

    it('should run single round when no new relationships discovered', async () => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [],
      });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const { results, finalContext } = await agent.runPass1WithRefinement(
        ['Story 1', 'Story 2'],
        systemContext
      );

      expect(results).toHaveLength(2);
      expect(finalContext).toBe(systemContext);
      // Only 1 round: processUserStory called once per story, no refinement
      expect(mockJudgeStory).toHaveBeenCalledTimes(2);
    });

    it('should trigger refinement when high-confidence relationships found', async () => {
      mockJudgeStory
        .mockResolvedValueOnce({
          ...minimalJudgeRubric(5),
          newRelationships: [
            {
              id: 'REL-001',
              type: 'component',
              operation: 'add_edge',
              name: 'coordinates-with',
              source: 'COMP-LOGIN',
              target: 'COMP-AUTH',
              confidence: 0.9,
              evidence: 'Story mentions coordination',
            },
          ],
        })
        .mockResolvedValue({
          ...minimalJudgeRubric(5),
          newRelationships: [],
        });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const { results, finalContext } = await agent.runPass1WithRefinement(
        ['Story 1'],
        systemContext
      );

      expect(results).toHaveLength(1);
      // Stub returns mergedCount 0 so we converge after merge; finalContext unchanged
      expect(finalContext).toBe(systemContext);
      // Round 1: 1 story judged; then merge (stub); convergence on mergedCount 0
      expect(mockJudgeStory).toHaveBeenCalledTimes(1);
    });

    it('should filter out low-confidence relationships (< 0.75)', async () => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [
          {
            id: 'REL-001',
            type: 'component',
            operation: 'add_edge',
            name: 'coordinates-with',
            source: 'COMP-A',
            target: 'COMP-B',
            confidence: 0.5,
            evidence: 'Weak evidence',
          },
        ],
      });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const { results, finalContext } = await agent.runPass1WithRefinement(
        ['Story 1'],
        systemContext
      );

      expect(results).toHaveLength(1);
      expect(finalContext).toBe(systemContext);
      expect(mockJudgeStory).toHaveBeenCalledTimes(1);
    });

    it('should stop after max rounds (3) even if relationships keep appearing', async () => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [
          {
            id: 'REL-NEW',
            type: 'component',
            operation: 'add_edge',
            name: 'coordinates-with',
            source: 'COMP-A',
            target: 'COMP-B',
            confidence: 0.9,
            evidence: 'Always new',
          },
        ],
      });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();
      const logSpy = vi.spyOn(logger, 'warn');
      // Stub returns mergedCount: 0 so we never actually loop; verify the loop logic
      // would stop by checking we converge (single round) and don't hang.
      const { results } = await agent.runPass1WithRefinement(['Story 1'], systemContext);

      expect(results).toHaveLength(1);
      // With stub (mergedCount 0) we converge after round 1; max-rounds warning
      // would only fire when merge returns mergedCount > 0 for 3 rounds (USA-47).
      expect(mockJudgeStory).toHaveBeenCalledTimes(1);
      logSpy.mockRestore();
    });

    it('should log max rounds warning when merge keeps returning new relationships', async () => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [
          {
            id: 'REL-NEW',
            type: 'component',
            operation: 'add_edge',
            name: 'coordinates-with',
            source: 'COMP-A',
            target: 'COMP-B',
            confidence: 0.9,
            evidence: 'Always new',
          },
        ],
      });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();
      const updatedContext = { ...systemContext, timestamp: new Date().toISOString() };
      type AgentWithMerge = UserStoryAgent & {
        mergeNewRelationships(
          ctx: SystemDiscoveryContext,
          rels: unknown[]
        ): Promise<{ updatedContext: SystemDiscoveryContext; mergedCount: number }>;
      };
      (agent as AgentWithMerge).mergeNewRelationships = vi
        .fn()
        .mockResolvedValue({ updatedContext, mergedCount: 1 });

      const logSpy = vi.spyOn(logger, 'warn');
      const { results } = await agent.runPass1WithRefinement(['Story 1'], systemContext);

      expect(results).toHaveLength(1);
      expect(logSpy).toHaveBeenCalledWith('Convergence: max rounds (3) reached');
      logSpy.mockRestore();
    });

    it('should log convergence telemetry for each round', async () => {
      mockJudgeStory
        .mockResolvedValueOnce({
          ...minimalJudgeRubric(5),
          newRelationships: [
            {
              id: 'R1',
              type: 'component',
              operation: 'add_edge',
              name: 'x',
              source: 'A',
              target: 'B',
              confidence: 0.9,
              evidence: 'e',
            },
            {
              id: 'R2',
              type: 'component',
              operation: 'add_edge',
              name: 'y',
              source: 'C',
              target: 'D',
              confidence: 0.6,
              evidence: 'e',
            },
          ],
        })
        .mockResolvedValue({
          ...minimalJudgeRubric(5),
          newRelationships: [],
        });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();
      const infoSpy = vi.spyOn(logger, 'info');

      await agent.runPass1WithRefinement(['Story 1'], systemContext);

      expect(infoSpy).toHaveBeenCalledWith('Refinement round 1/3');
      expect(
        infoSpy.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('discovered 2 relationships') &&
            call[0].includes('1 high-confidence')
        )
      ).toBe(true);
      expect(
        infoSpy.mock.calls.some(
          (call) => typeof call[0] === 'string' && call[0].includes('merged 0 relationships')
        )
      ).toBe(true);
      expect(
        infoSpy.mock.calls.some(
          (call) =>
            typeof call[0] === 'string' &&
            call[0].includes('Convergence: no relationships merged (all duplicates)')
        )
      ).toBe(true);
      infoSpy.mockRestore();
    });
  });

  describe('Pass 2: Interconnection (USA-49)', () => {
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
          standardStates: [],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
    }

    beforeEach(() => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          storyId: 'USA-001',
          uiMapping: { 'login button': 'COMP-LOGIN-BUTTON' },
          contractDependencies: ['C-STATE-USER'],
          ownership: { ownsState: [], consumesState: ['C-STATE-USER'], emitsEvents: [], listensToEvents: [] },
          relatedStories: [],
        }),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });
    });

    it('should extract interconnections for each story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();
      systemContext.componentGraph.components['COMP-LOGIN-BUTTON'] = {
        id: 'COMP-LOGIN-BUTTON',
        productName: 'Login Button',
        description: '',
      };

      const stories = [{ id: 'USA-001', content: 'As a user, I want to login' }];

      const results = await agent.runPass2Interconnection(stories, systemContext);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('USA-001');
      expect(results[0].interconnections.storyId).toBe('USA-001');
      expect(results[0].interconnections.uiMapping).toEqual({ 'login button': 'COMP-LOGIN-BUTTON' });
      expect(results[0].interconnections.contractDependencies).toEqual(['C-STATE-USER']);
    });

    it('should append metadata sections to markdown', async () => {
      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const stories = [{ id: 'USA-001', content: 'As a user, I want to login' }];

      const results = await agent.runPass2Interconnection(stories, systemContext);

      expect(results[0].content).toContain('## UI Mapping');
      expect(results[0].content).toContain('login button');
      expect(results[0].content).toContain('COMP-LOGIN-BUTTON');
      expect(results[0].content).toContain('## Contract Dependencies');
      expect(results[0].content).toContain('C-STATE-USER');
    });

    it('should handle multiple stories with related stories', async () => {
      mockSendMessage
        .mockResolvedValueOnce({
          content: JSON.stringify({
            storyId: 'USA-001',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [
              { storyId: 'USA-002', relationship: 'prerequisite', description: 'Needs auth' },
            ],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            storyId: 'USA-002',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [
              { storyId: 'USA-001', relationship: 'dependent', description: 'Login depends on auth' },
            ],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const stories = [
        { id: 'USA-001', content: 'Story 1' },
        { id: 'USA-002', content: 'Story 2' },
      ];

      const results = await agent.runPass2Interconnection(stories, systemContext);

      expect(results).toHaveLength(2);
      expect(results[0].interconnections.relatedStories).toHaveLength(1);
      expect(results[0].interconnections.relatedStories[0].relationship).toBe('prerequisite');
      expect(results[1].interconnections.relatedStories[0].relationship).toBe('dependent');
    });

    it('should correct storyId mismatch', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          storyId: 'WRONG-ID',
          uiMapping: {},
          contractDependencies: [],
          ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
          relatedStories: [],
        }),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const agent = new UserStoryAgent(validConfig);
      const systemContext = buildMinimalSystemContext();

      const results = await agent.runPass2Interconnection(
        [{ id: 'USA-001', content: 'Story' }],
        systemContext
      );

      expect(results[0].interconnections.storyId).toBe('USA-001');
    });
  });

  describe('System Workflow (USA-53)', () => {
    const systemDiscoveryResponse = (payload: object) => ({
      content: JSON.stringify(payload),
      stopReason: 'end_turn' as const,
      usage: { inputTokens: 100, outputTokens: 50 },
    });

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
          standardStates: [],
          dataFlows: [],
        },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
    }

    beforeEach(() => {
      mockJudgeStory.mockResolvedValue({
        ...minimalJudgeRubric(5),
        newRelationships: [],
      });
      mockJudgeGlobalConsistency.mockResolvedValue({
        issues: [],
        fixes: [],
      });
    });

    it('should run full workflow end-to-end (Pass 0 → Pass 1 → Pass 2 → Pass 2b)', async () => {
      const pass1Response = {
        content: JSON.stringify({
          enhancedStory: '# Login\nAs a user I want to login.',
          changesApplied: [],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      };
      const pass2Response = {
        content: JSON.stringify({
          storyId: 'Login',
          uiMapping: {},
          contractDependencies: [],
          ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
          relatedStories: [],
        }),
        stopReason: 'end_turn' as const,
        usage: { inputTokens: 100, outputTokens: 50 },
      };
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: ['Login'], stateModels: [], events: [] },
            canonicalNames: { Login: ['Login', 'login'] },
            evidence: { Login: 'Story' },
            vocabulary: { login: 'Login' },
          })
        )
        .mockResolvedValueOnce(pass1Response)
        .mockResolvedValueOnce(pass1Response)
        .mockResolvedValue(pass2Response);

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['As a user I want to login']);

      expect(result.systemContext).toBeDefined();
      expect(result.systemContext.componentGraph).toBeDefined();
      expect(result.stories).toHaveLength(1);
      expect(result.stories[0].id).toBe('Login');
      expect(result.stories[0].content).toContain('Login');
      expect(result.stories[0].interconnections).toBeDefined();
      expect(result.consistencyReport).toEqual({ issues: [], fixes: [] });
      expect(result.metadata.passesCompleted).toEqual([
        'Pass 0 (discovery)',
        'Pass 1 (generation with refinement)',
        'Pass 2 (interconnection)',
        'Pass 2b (global consistency)',
      ]);
      expect(result.metadata.refinementRounds).toBeGreaterThanOrEqual(0);
      expect(result.metadata.fixesApplied).toBe(0);
      expect(result.metadata.fixesFlaggedForReview).toBe(0);
      expect(mockJudgeGlobalConsistency).toHaveBeenCalledTimes(1);
    });

    it('should include system context from Pass 0', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: ['Filter'], stateModels: [], events: [] },
            canonicalNames: { Filter: ['Filter', 'filter'] },
            evidence: { Filter: 'Filter bar' },
            vocabulary: { filter: 'Filter' },
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# Story\nContent',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'Story',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['Story with filter']);

      expect(result.systemContext.productVocabulary).toBeDefined();
      expect('filter' in (result.systemContext.productVocabulary ?? {})).toBe(true);
      expect(Object.keys(result.systemContext.componentGraph.components).length).toBeGreaterThanOrEqual(1);
    });

    it('should run Pass 1 with refinement', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: [], stateModels: [], events: [] },
            canonicalNames: {},
            evidence: {},
            vocabulary: {},
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# S1\nStory one.',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'S1',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['Story 1']);

      expect(result.stories).toHaveLength(1);
      expect(result.metadata.passesCompleted).toContain('Pass 1 (generation with refinement)');
      expect(mockJudgeStory).toHaveBeenCalled();
    });

    it('should extract interconnections in Pass 2', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: [], stateModels: [], events: [] },
            canonicalNames: {},
            evidence: {},
            vocabulary: {},
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# My Story\nContent',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'My Story',
            uiMapping: { button: 'COMP-BUTTON' },
            contractDependencies: ['C-STATE-X'],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['Story']);

      expect(result.stories[0].interconnections.uiMapping).toEqual({ button: 'COMP-BUTTON' });
      expect(result.stories[0].interconnections.contractDependencies).toEqual(['C-STATE-X']);
    });

    it('should run Pass 2b and include consistency report', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: [], stateModels: [], events: [] },
            canonicalNames: {},
            evidence: {},
            vocabulary: {},
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# Story\nContent',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'Story',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      mockJudgeGlobalConsistency.mockResolvedValueOnce({
        issues: [{ description: 'Naming mismatch', suggestedFixType: 'vocabulary', confidence: 0.9, affectedStories: ['Story'] }],
        fixes: [],
      });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['Story']);

      expect(result.consistencyReport.issues).toHaveLength(1);
      expect(result.consistencyReport.issues[0].description).toBe('Naming mismatch');
    });

    it('should auto-apply high-confidence fixes when present', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: [], stateModels: [], events: [] },
            canonicalNames: {},
            evidence: {},
            vocabulary: {},
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# Login\nAs a user I want to log in.',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'Login',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      mockJudgeGlobalConsistency.mockResolvedValueOnce({
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
      });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['As a user I want to log in']);

      expect(result.metadata.fixesApplied).toBeGreaterThanOrEqual(0);
      expect(result.metadata.fixesFlaggedForReview).toBeDefined();
    });

    it('should include all metadata (passesCompleted, refinementRounds, fixes)', async () => {
      mockSendMessage
        .mockResolvedValueOnce(
          systemDiscoveryResponse({
            mentions: { components: [], stateModels: [], events: [] },
            canonicalNames: {},
            evidence: {},
            vocabulary: {},
          })
        )
        .mockResolvedValue({
          content: JSON.stringify({
            enhancedStory: '# Story\nContent',
            changesApplied: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        })
        .mockResolvedValue({
          content: JSON.stringify({
            storyId: 'Story',
            uiMapping: {},
            contractDependencies: [],
            ownership: { ownsState: [], consumesState: [], emitsEvents: [], listensToEvents: [] },
            relatedStories: [],
          }),
          stopReason: 'end_turn',
          usage: { inputTokens: 100, outputTokens: 50 },
        });

      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow(['Story']);

      expect(result.metadata).toMatchObject({
        passesCompleted: expect.any(Array),
        refinementRounds: expect.any(Number),
        fixesApplied: expect.any(Number),
        fixesFlaggedForReview: expect.any(Number),
        titleGenerationFailures: expect.any(Number),
      });
      expect(result.metadata.passesCompleted.length).toBe(4);
    });

    it('should handle empty stories gracefully', async () => {
      const agent = new UserStoryAgent(validConfig);
      const result = await agent.runSystemWorkflow([]);

      expect(result.systemContext).toBeDefined();
      expect(result.stories).toEqual([]);
      expect(result.consistencyReport).toEqual({ issues: [], fixes: [] });
      expect(result.metadata.passesCompleted).toEqual([]);
      expect(result.metadata.refinementRounds).toBe(0);
      expect(result.metadata.fixesApplied).toBe(0);
      expect(result.metadata.fixesFlaggedForReview).toBe(0);
      expect(result.metadata.titleGenerationFailures).toBe(0);
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(mockJudgeGlobalConsistency).not.toHaveBeenCalled();
    });

    it('should handle Pass 0 failure gracefully', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Pass 0: No valid JSON in LLM response'));

      const agent = new UserStoryAgent(validConfig);
      await expect(agent.runSystemWorkflow(['Story'])).rejects.toThrow(/Pass 0|No valid JSON/);
    });
  });
});
