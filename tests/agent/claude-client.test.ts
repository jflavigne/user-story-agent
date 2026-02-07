/**
 * Unit tests for ClaudeClient (streaming timeout and error handling)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClaudeClient } from '../../src/agent/claude-client.js';
import { TimeoutError } from '../../src/shared/errors.js';
import { StreamingHandler } from '../../src/agent/streaming.js';

const streamMock = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      stream: (body: unknown, options?: { signal?: AbortSignal }) =>
        streamMock(body, options),
    },
  })),
}));

describe('ClaudeClient', () => {
  const testApiKey = 'test-api-key';
  const defaultOptions = {
    systemPrompt: 'You are helpful.',
    messages: [{ role: 'user' as const, content: 'Hello' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    streamMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendMessageStreaming timeout', () => {
    it('throws TimeoutError when stream creation exceeds streamTimeout', async () => {
      const streamTimeoutMs = 100;
      const client = new ClaudeClient(
        testApiKey,
        'claude-sonnet-4-20250514',
        3,
        streamTimeoutMs
      );
      const handler = new StreamingHandler('test-iteration');
      handler.on('error', () => {}); // prevent unhandled error event from becoming the rejection

      // stream() returns a Promise that never resolves and rejects on abort (simulates hanging stream creation)
      streamMock.mockImplementation((_body: unknown, options?: { signal?: AbortSignal }) => {
        return new Promise<never>((_, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        });
      });

      vi.useFakeTimers();

      const p = client.sendMessageStreaming(defaultOptions, handler);
      vi.advanceTimersByTime(streamTimeoutMs + 50);

      await expect(p).rejects.toThrow(TimeoutError);
    });

    it('TimeoutError has correct type, message and code', async () => {
      const streamTimeoutMs = 100;
      const client = new ClaudeClient(
        testApiKey,
        'claude-sonnet-4-20250514',
        3,
        streamTimeoutMs
      );
      const handler = new StreamingHandler('test-iteration');
      handler.on('error', () => {}); // prevent unhandled error event from becoming the rejection

      streamMock.mockImplementation((_body: unknown, options?: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
      );

      vi.useFakeTimers();

      const p = client.sendMessageStreaming(defaultOptions, handler);
      vi.advanceTimersByTime(streamTimeoutMs + 50);

      try {
        await p;
        expect.fail('Expected sendMessageStreaming to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect((error as TimeoutError).message).toContain(String(streamTimeoutMs));
        expect((error as TimeoutError).code).toBe('TIMEOUT');
      }
    });

    it('completes successfully when stream returns within timeout', async () => {
      const client = new ClaudeClient(
        testApiKey,
        'claude-sonnet-4-20250514',
        3,
        60_000
      );
      const handler = new StreamingHandler('test-iteration');

      streamMock.mockImplementation(() => ({
        async *[Symbol.asyncIterator]() {
          yield {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hi' },
          };
        },
        finalMessage: async () => ({
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      }));

      const result = await client.sendMessageStreaming(defaultOptions, handler);

      expect(result.content).toBe('Hi');
      expect(result.usage).toEqual({ inputTokens: 1, outputTokens: 1 });
    });
  });

  describe('sendMessageStreaming empty stream', () => {
    it('emits error event and throws when stream has no text content', async () => {
      const client = new ClaudeClient(
        testApiKey,
        'claude-sonnet-4-20250514',
        3,
        60_000
      );
      const handler = new StreamingHandler('test-iteration');
      const errorMsg = 'Streaming response contained no text content';

      let capturedErrorEvent: { error: Error } | undefined;
      handler.once('error', (event: { error: Error }) => {
        capturedErrorEvent = { error: event.error };
      });

      streamMock.mockImplementation(() => ({
        async *[Symbol.asyncIterator]() {
          // Yield no text_delta events so handler.accumulated stays ''
        },
        finalMessage: async () => ({
          usage: { input_tokens: 0, output_tokens: 0 },
        }),
      }));

      await expect(client.sendMessageStreaming(defaultOptions, handler)).rejects.toThrow(
        errorMsg
      );

      expect(capturedErrorEvent).toBeDefined();
      expect(capturedErrorEvent!.error).toBeInstanceOf(Error);
      expect(capturedErrorEvent!.error.message).toBe(errorMsg);
    });
  });
});
