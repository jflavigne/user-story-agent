/**
 * Claude API client wrapper for Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';
import { withRetry, type RetryOptions } from '../utils/retry.js';
import { APIError, TimeoutError, AgentError } from '../shared/errors.js';

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
  private maxRetries: number;

  /**
   * Creates a new ClaudeClient instance
   *
   * @param apiKey - API key for Anthropic (defaults to ANTHROPIC_API_KEY env var)
   * @param defaultModel - Default model to use (defaults to claude-sonnet-4-20250514)
   * @param maxRetries - Maximum number of retry attempts (defaults to 3)
   */
  constructor(apiKey?: string, defaultModel: string = 'claude-sonnet-4-20250514', maxRetries: number = 3) {
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
              content: msg.content,
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
}
