/**
 * Streaming handler for progressive output during iteration processing
 */

import { EventEmitter } from 'events';
import type { ClaudeUsage } from './claude-client.js';

/**
 * Handler for streaming iteration output with event emission
 */
export class StreamingHandler extends EventEmitter {
  /** Accumulated text content from all chunks */
  public accumulated: string = '';

  /**
   * Creates a new StreamingHandler instance
   *
   * @param iterationId - ID of the iteration being streamed
   */
  constructor(private iterationId: string) {
    super();
  }

  /**
   * Emits a 'start' event indicating streaming has begun
   */
  start(): void {
    this.emit('start', {
      type: 'start' as const,
      iterationId: this.iterationId,
      timestamp: Date.now(),
    });
  }

  /**
   * Processes a chunk of content and emits a 'chunk' event
   *
   * @param content - The new content chunk to add
   */
  chunk(content: string): void {
    this.accumulated += content;
    this.emit('chunk', {
      type: 'chunk' as const,
      iterationId: this.iterationId,
      content,
      accumulated: this.accumulated,
      timestamp: Date.now(),
    });
  }

  /**
   * Emits a 'complete' event with final content and token usage
   *
   * @param tokenUsage - Token usage statistics
   */
  complete(tokenUsage: ClaudeUsage): void {
    this.emit('complete', {
      type: 'complete' as const,
      iterationId: this.iterationId,
      fullContent: this.accumulated,
      tokenUsage: {
        input: tokenUsage.inputTokens,
        output: tokenUsage.outputTokens,
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Emits an 'error' event with the error details
   *
   * @param error - The error that occurred
   */
  error(error: Error): void {
    this.emit('error', {
      type: 'error' as const,
      iterationId: this.iterationId,
      error,
      timestamp: Date.now(),
    });
  }
}
