/**
 * Claude API client wrapper for Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ImageBlockParam, TextBlockParam } from '@anthropic-ai/sdk/resources';
import { logger } from '../utils/logger.js';
import { withRetry, type RetryOptions } from '../utils/retry.js';
import { APIError, TimeoutError, AgentError } from '../shared/errors.js';
import { StreamingHandler } from './streaming.js';

/**
 * Error structure that may include an HTTP status code (e.g., from Anthropic SDK)
 */
interface ErrorWithStatus extends Error {
  status?: number;
}

/**
 * HTTP status codes that indicate a request should be retried
 */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504] as const;

/**
 * Network error codes that indicate a request should be retried
 */
const NETWORK_ERROR_CODES = ['econnreset', 'etimedout', 'enotfound', 'econnrefused'] as const;

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
 * User message content: plain text or multi-modal (text + images)
 */
export type UserMessageContent = string | Array<TextBlockParam | ImageBlockParam>;

/**
 * Options for sending a message to Claude
 */
export interface SendMessageOptions {
  /** System prompt to use */
  systemPrompt: string;
  /** User messages (array of message objects); content may be string or text+image blocks */
  messages: Array<{ role: 'user'; content: UserMessageContent }>;
  /** Optional model override */
  model?: string;
  /** Optional max tokens */
  maxTokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * Client for interacting with the Anthropic Claude API
 */
export class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string;
  private maxRetries: number;
  private streamTimeout: number;

  /**
   * Creates a new ClaudeClient instance
   *
   * @param apiKey - API key for Anthropic (defaults to ANTHROPIC_API_KEY env var)
   * @param defaultModel - Default model to use (defaults to claude-sonnet-4-20250514)
   * @param maxRetries - Maximum number of retry attempts (defaults to 3)
   * @param streamTimeout - Stream creation timeout in ms (defaults to 60000)
   */
  constructor(
    apiKey?: string,
    defaultModel: string = 'claude-sonnet-4-20250514',
    maxRetries: number = 3,
    streamTimeout: number = 60_000
  ) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error(
        'Anthropic API key is required. Provide it via apiKey parameter or ANTHROPIC_API_KEY environment variable.'
      );
    }
    const baseURL = process.env.ANTHROPIC_BASE_URL || undefined;
    this.client = new Anthropic({ apiKey: key, baseURL });
    this.defaultModel = defaultModel;
    this.maxRetries = maxRetries;
    this.streamTimeout = streamTimeout;
  }

  /**
   * Extracts HTTP status code from an error object
   *
   * Checks for status property first, then attempts to parse from error message
   *
   * @param error - The error to extract status from
   * @returns The status code if found, null otherwise
   */
  private extractStatusFromError(error: Error): number | null {
    // Check for status property
    const status = (error as ErrorWithStatus).status;
    if (typeof status === 'number') {
      return status;
    }

    // Try to extract from error message
    const statusMatch = error.message.match(/status[:\s]+(\d+)/i);
    if (statusMatch) {
      const parsed = parseInt(statusMatch[1], 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  /**
   * Determines if an error is retryable based on its type and status code
   *
   * @param error - The error to check
   * @returns True if the error should be retried
   */
  private isRetryableError(error: Error): boolean {
    // If it's already an APIError, use its retryable flag
    if (error instanceof APIError) {
      return error.retryable;
    }

    // Timeout errors are always retryable
    if (error instanceof TimeoutError) {
      return true;
    }

    // Check for network errors
    const errorMessage = error.message.toLowerCase();
    if (NETWORK_ERROR_CODES.some((code) => errorMessage.includes(code))) {
      return true;
    }

    // Check for retryable status codes
    const statusCode = this.extractStatusFromError(error);
    if (statusCode !== null) {
      return RETRYABLE_STATUS_CODES.includes(statusCode as typeof RETRYABLE_STATUS_CODES[number]);
    }

    // Default to non-retryable for unknown errors
    return false;
  }

  /**
   * Converts an Anthropic SDK error to an AgentError
   *
   * @param error - The original error
   * @returns An appropriate AgentError subclass
   */
  private normalizeError(error: unknown): AgentError {
    if (error instanceof AgentError) {
      return error;
    }

    if (!(error instanceof Error)) {
      return new AgentError('Unknown error calling Claude API', 'UNKNOWN_ERROR');
    }

    // Extract status code from error (checks status property and error message)
    const statusCode = this.extractStatusFromError(error);
    
    // If we found a status code in the error message but not in status property, handle it
    if (statusCode !== null) {
      const retryable = RETRYABLE_STATUS_CODES.includes(statusCode as typeof RETRYABLE_STATUS_CODES[number]);
      return new APIError(
        `Claude API error: ${error.message}`,
        statusCode,
        retryable,
        error
      );
    }

    // Check for timeout errors
    const errorMessage = error.message.toLowerCase();
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return new TimeoutError(`Request timeout: ${error.message}`, error);
    }

    // Check for network errors
    if (NETWORK_ERROR_CODES.some((code) => errorMessage.includes(code))) {
      return new APIError(`Network error: ${error.message}`, 0, true, error);
    }

    // Default to generic AgentError
    return new AgentError(`Claude API error: ${error.message}`, 'API_ERROR', error);
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

    const startTime = Date.now();
    logger.debug(`API call starting (model: ${modelToUse}, maxTokens: ${maxTokens})`);

    // Retry options
    const retryOptions: RetryOptions = {
      maxAttempts: this.maxRetries,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      shouldRetry: (error) => this.isRetryableError(error),
    };

    try {
      const response = await withRetry(
        async () => {
          return await this.client.messages.create({
            model: modelToUse,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: messages.map((msg) => ({
              role: msg.role,
              content: typeof msg.content === 'string' ? msg.content : msg.content,
            })),
          });
        },
        retryOptions
      );

      const durationMs = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;

      // Track token usage
      logger.addTokenUsage(inputTokens, outputTokens);
      logger.debug(
        `API call completed (${(durationMs / 1000).toFixed(2)}s, ${inputTokens} in / ${outputTokens} out tokens)`
      );

      // Extract text content from the response
      // The response.content is an array of content blocks
      const textBlocks = response.content.filter((block) => block.type === 'text');

      if (response.content.length > textBlocks.length) {
        logger.warn(`Response contained ${response.content.length - textBlocks.length} non-text blocks (dropped)`);
      }

      if (textBlocks.length === 0) {
        logger.warn('Claude response contained no text content');
        throw new Error('No text content in Claude response');
      }

      // Combine all text blocks into a single string
      const content = textBlocks.map((block) => (block as { type: 'text'; text: string }).text).join('\n\n');

      return {
        content,
        stopReason: response.stop_reason || 'unknown',
        usage: {
          inputTokens,
          outputTokens,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const normalizedError = this.normalizeError(error);
      logger.error(
        `API call failed after ${(durationMs / 1000).toFixed(2)}s: ${normalizedError.message}`
      );
      throw normalizedError;
    }
  }

  /**
   * Sends a message to Claude with streaming support
   *
   * @param options - Message options including system prompt and user messages
   * @param handler - Streaming handler to emit events
   * @returns Promise resolving to the content and usage statistics
   */
  async sendMessageStreaming(
    options: SendMessageOptions,
    handler: StreamingHandler
  ): Promise<{ content: string; usage: ClaudeUsage }> {
    const { systemPrompt, messages, model, maxTokens = 4096 } = options;
    const modelToUse = model || this.defaultModel;

    const startTime = Date.now();
    logger.debug(`Streaming API call starting (model: ${modelToUse}, maxTokens: ${maxTokens})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.streamTimeout);

    try {
      handler.start();

      // Create streaming request (timeout applies to stream creation)
      const stream = await this.client.messages.stream(
        {
          model: modelToUse,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : msg.content,
          })),
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            handler.chunk(delta.text);
          }
        }
      }

      // Get final message with usage stats
      const finalMessage = await stream.finalMessage();
      const inputTokens = finalMessage.usage?.input_tokens ?? 0;
      const outputTokens = finalMessage.usage?.output_tokens ?? 0;

      const durationMs = Date.now() - startTime;
      logger.addTokenUsage(inputTokens, outputTokens);
      logger.debug(
        `Streaming API call completed (${(durationMs / 1000).toFixed(2)}s, ${inputTokens} in / ${outputTokens} out tokens)`
      );

      handler.complete({
        inputTokens,
        outputTokens,
      });

      // Empty stream: notify both event listeners (handler.error) and promise callers (throw).
      if (!handler.accumulated.trim()) {
        const errorMsg = 'Streaming response contained no text content';
        logger.warn(errorMsg);
        handler.error(new Error(errorMsg));
        throw new Error(errorMsg);
      }

      return {
        content: handler.accumulated,
        usage: { inputTokens, outputTokens },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new TimeoutError(
          `Stream creation timed out after ${this.streamTimeout}ms`,
          error
        );
        logger.error(
          `Streaming API call failed after ${((Date.now() - startTime) / 1000).toFixed(2)}s: ${timeoutError.message}`
        );
        handler.error(timeoutError);
        throw timeoutError;
      }
      const durationMs = Date.now() - startTime;
      const normalizedError = this.normalizeError(error);
      logger.error(
        `Streaming API call failed after ${(durationMs / 1000).toFixed(2)}s: ${normalizedError.message}`
      );
      handler.error(normalizedError);
      throw normalizedError;
    }
  }
}
