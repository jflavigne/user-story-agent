/**
 * Unit tests for user-story-agent.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserStoryAgent, createAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig, IterationOption } from '../../src/agent/types.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { getIterationById, WORKFLOW_ORDER } from '../../src/shared/iteration-registry.js';
import type { ProductContext } from '../../src/shared/types.js';
import type { IterationId } from '../../src/shared/iteration-registry.js';
import { StreamingHandler } from '../../src/agent/streaming.js';

// Mock ClaudeClient
vi.mock('../../src/agent/claude-client.js', () => {
  return {
    ClaudeClient: vi.fn(),
  };
});

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
        /Workflow mode requires productContext with productType/
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

      expect(firstCall.messages[0].content).toContain('As a user, I want to login');
      expect(secondCall.messages[0].content).toContain('Story with user roles');
      expect(thirdCall.messages[0].content).toContain('Story with user roles and validation');
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
      const userMessage = callArgs.messages[0].content;

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
      const userMessage = firstCall.messages[0].content;

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
      const userMessage = firstCall.messages[0].content;

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
      const secondUserMessage = secondCall.messages[0].content;

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
      expect(callArgs.messages[0].content).toContain(longStory);
    });

    it('should handle special characters in story', async () => {
      const agent = new UserStoryAgent(validConfig);
      const specialStory = 'As a user, I want to login with email: user@example.com & password!';

      await agent.processUserStory(specialStory);

      expect(mockSendMessage).toHaveBeenCalled();
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(specialStory);
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
      const initialStory = 'As a user, I want to login';

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
});
