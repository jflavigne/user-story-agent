/**
 * Unit tests for evaluator.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Evaluator, EvaluationError } from '../../src/agent/evaluator.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { VerificationResultSchema } from '../../src/shared/schemas.js';

// Mock ClaudeClient
vi.mock('../../src/agent/claude-client.js', () => {
  return {
    ClaudeClient: vi.fn(),
  };
});

describe('Evaluator', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockClaudeClient: { sendMessage: ReturnType<typeof vi.fn> };
  let evaluator: Evaluator;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock sendMessage function
    mockSendMessage = vi.fn();

    // Create mock ClaudeClient instance
    mockClaudeClient = {
      sendMessage: mockSendMessage,
    };

    // Make ClaudeClient constructor return our mock
    vi.mocked(ClaudeClient).mockImplementation(() => mockClaudeClient as unknown as ClaudeClient);

    // Create evaluator instance (resolveModel optional for tests - no model override)
    const resolveModel = () => undefined;
    evaluator = new Evaluator(mockClaudeClient as unknown as ClaudeClient, resolveModel);
  });

  describe('verify', () => {
    it('should return successful verification result when iteration improved the story', async () => {
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login with email and password validation';
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      const mockVerificationResult = {
        passed: true,
        score: 0.9,
        reasoning: 'The iteration successfully added validation requirements while preserving the original intent',
        issues: [],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockVerificationResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await evaluator.verify(originalStory, enhancedStory, iterationId, iterationPurpose);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(0.9);
      expect(result.reasoning).toBe(mockVerificationResult.reasoning);
      expect(result.issues).toEqual([]);
      expect(mockSendMessage).toHaveBeenCalledTimes(1);

      // Verify the call included the evaluator system prompt
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs.systemPrompt).toBeDefined();
      expect(callArgs.messages[0].content).toContain(originalStory);
      expect(callArgs.messages[0].content).toContain(enhancedStory);
      expect(callArgs.messages[0].content).toContain(iterationId);
      expect(callArgs.messages[0].content).toContain(iterationPurpose);
    });

    it('should return failed verification result when iteration has issues', async () => {
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login'; // No changes
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      const mockVerificationResult = {
        passed: false,
        score: 0.3,
        reasoning: 'The iteration did not add the expected validation requirements',
        issues: [
          {
            severity: 'warning',
            category: 'relevance',
            description: 'No validation requirements were added',
            suggestion: 'Ensure the iteration prompt is clear about adding validation',
          },
        ],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockVerificationResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await evaluator.verify(originalStory, enhancedStory, iterationId, iterationPurpose);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0.3);
      expect(result.reasoning).toBe(mockVerificationResult.reasoning);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('warning');
      expect(result.issues[0].category).toBe('relevance');
    });

    it('should handle parse errors gracefully in non-strict mode', async () => {
      const nonStrictEvaluator = new Evaluator(
        mockClaudeClient as unknown as ClaudeClient,
        () => undefined,
        false
      );
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login with validation';
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      mockSendMessage.mockResolvedValue({
        content: 'This is not valid JSON',
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await nonStrictEvaluator.verify(
        originalStory,
        enhancedStory,
        iterationId,
        iterationPurpose
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.reasoning).toMatch(/^EVAL_ERROR:/);
      expect(result.evaluationFailed).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[0].category).toBe('evaluation');
      expect(() => VerificationResultSchema.parse(result)).not.toThrow();
    });

    it('should handle API errors gracefully in non-strict mode', async () => {
      const nonStrictEvaluator = new Evaluator(
        mockClaudeClient as unknown as ClaudeClient,
        () => undefined,
        false
      );
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login with validation';
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      mockSendMessage.mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await nonStrictEvaluator.verify(
        originalStory,
        enhancedStory,
        iterationId,
        iterationPurpose
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0.0);
      expect(result.reasoning).toMatch(/^EVAL_ERROR:/);
      expect(result.evaluationFailed).toBe(true);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].description).toContain('API rate limit exceeded');
      expect(() => VerificationResultSchema.parse(result)).not.toThrow();
    });

    it('should throw EvaluationError in strict mode when API fails', async () => {
      mockSendMessage.mockRejectedValue(new Error('API rate limit exceeded'));

      await expect(
        evaluator.verify('story', 'story', 'validation', 'Add validation')
      ).rejects.toThrow(EvaluationError);
    });

    it('should distinguish eval crash from validation failure', async () => {
      const nonStrictEvaluator = new Evaluator(
        mockClaudeClient as unknown as ClaudeClient,
        () => undefined,
        false
      );

      // Validation failure: API returns passed: false (no crash)
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          passed: false,
          score: 0.3,
          reasoning: 'Content did not meet quality bar',
          issues: [{ severity: 'warning', category: 'relevance', description: 'Needs improvement' }],
        }),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });
      const validationResult = await nonStrictEvaluator.verify(
        'story',
        'story',
        'validation',
        'Add validation'
      );
      expect(validationResult.passed).toBe(false);
      expect(validationResult.evaluationFailed).toBeUndefined();

      // Eval crash: API throws
      mockSendMessage.mockRejectedValue(new Error('Network error'));
      const crashResult = await nonStrictEvaluator.verify(
        'story',
        'story',
        'validation',
        'Add validation'
      );
      expect(crashResult.passed).toBe(false);
      expect(crashResult.evaluationFailed).toBe(true);
      expect(crashResult.reasoning).toMatch(/^EVAL_ERROR:/);
    });

    it('should validate verification result against schema', async () => {
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login with validation';
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      const mockVerificationResult = {
        passed: true,
        score: 0.85,
        reasoning: 'Good enhancement',
        issues: [
          {
            severity: 'info',
            category: 'coherence',
            description: 'Minor formatting issue',
            suggestion: 'Consider improving formatting',
          },
        ],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockVerificationResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await evaluator.verify(originalStory, enhancedStory, iterationId, iterationPurpose);

      // Verify the result matches the schema
      expect(() => VerificationResultSchema.parse(result)).not.toThrow();
      expect(result.passed).toBe(true);
      expect(result.score).toBe(0.85);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].severity).toBe('info');
    });

    it('should use correct system prompt', async () => {
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login with validation';
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({
          passed: true,
          score: 0.9,
          reasoning: 'Good',
          issues: [],
        }),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      await evaluator.verify(originalStory, enhancedStory, iterationId, iterationPurpose);

      const callArgs = mockSendMessage.mock.calls[0][0];
      // The system prompt should contain evaluator instructions
      expect(callArgs.systemPrompt).toContain('quality evaluator');
      expect(callArgs.systemPrompt).toContain('ENHANCEMENT');
      expect(callArgs.systemPrompt).toContain('COHERENCE');
      expect(callArgs.systemPrompt).toContain('RELEVANCE');
      expect(callArgs.systemPrompt).toContain('NON-DESTRUCTIVE');
    });

    it('should handle verification result with multiple issues', async () => {
      const originalStory = 'As a user, I want to login';
      const enhancedStory = 'As a user, I want to login'; // No changes
      const iterationId = 'validation';
      const iterationPurpose = 'Add validation requirements';

      const mockVerificationResult = {
        passed: false,
        score: 0.2,
        reasoning: 'Multiple issues found',
        issues: [
          {
            severity: 'error',
            category: 'relevance',
            description: 'No validation added',
            suggestion: 'Add validation requirements',
          },
          {
            severity: 'warning',
            category: 'coherence',
            description: 'Story unchanged',
            suggestion: 'Ensure iteration makes changes',
          },
        ],
      };

      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockVerificationResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await evaluator.verify(originalStory, enhancedStory, iterationId, iterationPurpose);

      expect(result.passed).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[1].severity).toBe('warning');
    });
  });
});
