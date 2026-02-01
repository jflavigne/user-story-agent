/**
 * Unit tests for title-generator.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TitleGenerator } from '../../src/agent/title-generator.js';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { TitleResultSchema } from '../../src/shared/schemas.js';
import { AgentError, ValidationError } from '../../src/shared/errors.js';

vi.mock('../../src/agent/claude-client.js', () => ({
  ClaudeClient: vi.fn(),
}));

describe('TitleGenerator', () => {
  let mockSendMessage: ReturnType<typeof vi.fn>;
  let mockClaudeClient: { sendMessage: ReturnType<typeof vi.fn> };
  let titleGenerator: TitleGenerator;

  const resolveModel = (op: string) => (op === 'titleGeneration' ? 'claude-3-5-haiku-20241022' : undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessage = vi.fn();
    mockClaudeClient = { sendMessage: mockSendMessage };
    vi.mocked(ClaudeClient).mockImplementation(() => mockClaudeClient as unknown as ClaudeClient);
    titleGenerator = new TitleGenerator(mockClaudeClient as unknown as ClaudeClient, resolveModel);
  });

  describe('generate', () => {
    it('returns title and optional reasoning for a simple story', async () => {
      const story = '# Untitled\n\nAs a user, I want to log in so that I can access my account.';
      const mockResult = { title: 'User Login for Account Access', reasoning: 'Summarizes the goal.' };
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 50, outputTokens: 20 },
      });

      const result = await titleGenerator.generate(story);

      expect(result.title).toBe('User Login for Account Access');
      expect(result.reasoning).toBe('Summarizes the goal.');
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(story);
      expect(callArgs.model).toBe('claude-3-5-haiku-20241022');
    });

    it('returns title for a complex story with multiple sections', async () => {
      const story = `# Untitled

As a shopper, I want to filter products by price and category so that I can find relevant items.

## User-visible behavior
- Filter bar with price range and category dropdown
- Results update when filters change

## Acceptance criteria
- Price range 0–1000
- Category matches product taxonomy`;

      const mockResult = { title: 'Product Filter by Price and Category' };
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify(mockResult),
        stopReason: 'end_turn',
        usage: { inputTokens: 120, outputTokens: 15 },
      });

      const result = await titleGenerator.generate(story);

      expect(result.title).toBe('Product Filter by Price and Category');
      expect(result.reasoning).toBeUndefined();
      expect(TitleResultSchema.parse(result)).toEqual(result);
    });

    it('throws AgentError when API fails', async () => {
      mockSendMessage.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(titleGenerator.generate('As a user, I want to login.')).rejects.toThrow(AgentError);
    });

    it('validates title length (max 100) and rejects when over', async () => {
      const longTitle = 'A'.repeat(101);
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({ title: longTitle }),
        stopReason: 'end_turn',
        usage: { inputTokens: 50, outputTokens: 30 },
      });

      await expect(titleGenerator.generate('Short story.')).rejects.toThrow(ValidationError);
    });

    it('throws AgentError on malformed JSON response', async () => {
      mockSendMessage.mockResolvedValue({
        content: 'Here is the title: Login Story. No JSON.',
        stopReason: 'end_turn',
        usage: { inputTokens: 50, outputTokens: 10 },
      });

      await expect(titleGenerator.generate('As a user, I want to login.')).rejects.toThrow(AgentError);
    });

    it('uses resolveModel with titleGeneration operation type', async () => {
      const resolveModelSpy = vi.fn((op: string) => (op === 'titleGeneration' ? 'claude-3-5-haiku-20241022' : undefined));
      const gen = new TitleGenerator(mockClaudeClient as unknown as ClaudeClient, resolveModelSpy);
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({ title: 'Test Title' }),
        stopReason: 'end_turn',
        usage: { inputTokens: 10, outputTokens: 5 },
      });

      await gen.generate('Story content.');

      expect(resolveModelSpy).toHaveBeenCalledWith('titleGeneration');
    });

    it('extracts JSON from markdown code block response', async () => {
      mockSendMessage.mockResolvedValue({
        content: '```json\n{"title": "Extracted From Code Block", "reasoning": "Optional"}\n```',
        stopReason: 'end_turn',
        usage: { inputTokens: 50, outputTokens: 25 },
      });

      const result = await titleGenerator.generate('Story.');

      expect(result.title).toBe('Extracted From Code Block');
      expect(result.reasoning).toBe('Optional');
    });

    it('rejects empty title with ValidationError', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({ title: '' }),
        stopReason: 'end_turn',
        usage: { inputTokens: 50, outputTokens: 5 },
      });

      await expect(titleGenerator.generate('Story.')).rejects.toThrow(ValidationError);
    });

    it('includes system prompt guiding title generation', async () => {
      mockSendMessage.mockResolvedValue({
        content: JSON.stringify({ title: 'Guided Title' }),
        stopReason: 'end_turn',
        usage: { inputTokens: 100, outputTokens: 10 },
      });

      await titleGenerator.generate('As a user, I want to save my work.');

      const callArgs = mockSendMessage.mock.calls[0][0];
      expect(callArgs.systemPrompt).toContain('10 words');
      expect(callArgs.systemPrompt).toContain('active voice');
      expect(callArgs.systemPrompt).toContain('title case');
      expect(callArgs.systemPrompt).toContain('JSON');
    });
  });
});
