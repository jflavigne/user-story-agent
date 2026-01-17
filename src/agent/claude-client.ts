/**
 * Claude API client wrapper for Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Usage statistics from a Claude API call
 */
export interface ClaudeUsage {
  /** Number of input tokens used */
  inputTokens: number;
  /** Number of output tokens used */
  outputTokens: number;
}

/**
 * Result of a Claude API message call
 */
export interface ClaudeMessageResult {
  /** The text content of the response */
  content: string;
  /** The stop reason for the response */
  stopReason: string;
  /** Token usage statistics */
  usage: ClaudeUsage;
}

/**
 * Options for sending a message to Claude
 */
export interface SendMessageOptions {
  /** System prompt to use */
  systemPrompt: string;
  /** User messages (array of message objects) */
  messages: Array<{ role: 'user'; content: string }>;
  /** Optional model override */
  model?: string;
  /** Optional max tokens */
  maxTokens?: number;
}

/**
 * Client for interacting with the Anthropic Claude API
 */
export class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string;

  /**
   * Creates a new ClaudeClient instance
   *
   * @param apiKey - API key for Anthropic (defaults to ANTHROPIC_API_KEY env var)
   * @param defaultModel - Default model to use (defaults to claude-sonnet-4-20250514)
   */
  constructor(apiKey?: string, defaultModel: string = 'claude-sonnet-4-20250514') {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        'Anthropic API key is required. Provide it via apiKey parameter or ANTHROPIC_API_KEY environment variable.'
      );
    }
    this.client = new Anthropic({ apiKey: key });
    this.defaultModel = defaultModel;
  }

  /**
   * Sends a message to Claude and returns the response
   *
   * @param options - Message options including system prompt and user messages
   * @returns Promise resolving to the message result
   */
  async sendMessage(options: SendMessageOptions): Promise<ClaudeMessageResult> {
    const { systemPrompt, messages, model, maxTokens = 4096 } = options;
    const modelToUse = model || this.defaultModel;

    try {
      const response = await this.client.messages.create({
        model: modelToUse,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      // Extract text content from the response
      // The response.content is an array of content blocks
      const textBlocks = response.content.filter((block) => block.type === 'text');
      
      if (textBlocks.length === 0) {
        throw new Error('No text content in Claude response');
      }

      // Combine all text blocks into a single string
      const content = textBlocks.map((block) => (block as { type: 'text'; text: string }).text).join('\n\n');

      return {
        content,
        stopReason: response.stop_reason || 'unknown',
        usage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        const apiError = new Error(`Claude API error: ${error.message}`);
        apiError.cause = error;
        throw apiError;
      }
      throw new Error('Unknown error calling Claude API');
    }
  }
}
