/**
 * Unit tests for streaming.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamingHandler } from '../../src/agent/streaming.js';
import type { ClaudeUsage } from '../../src/agent/claude-client.js';

describe('StreamingHandler', () => {
  let handler: StreamingHandler;
  const iterationId = 'test-iteration';

  beforeEach(() => {
    handler = new StreamingHandler(iterationId);
  });

  describe('constructor', () => {
    it('should initialize with empty accumulated content', () => {
      expect(handler.accumulated).toBe('');
    });

    it('should store the iteration ID', () => {
      const newHandler = new StreamingHandler('custom-id');
      expect(newHandler).toBeInstanceOf(StreamingHandler);
    });
  });

  describe('start', () => {
    it('should emit start event with correct structure', () => {
      return new Promise<void>((resolve) => {
        handler.once('start', (event) => {
          expect(event.type).toBe('start');
          expect(event.iterationId).toBe(iterationId);
          expect(event.timestamp).toBeGreaterThan(0);
          expect(typeof event.timestamp).toBe('number');
          resolve();
        });

        handler.start();
      });
    });

    it('should emit start event synchronously', () => {
      let eventReceived = false;
      handler.once('start', () => {
        eventReceived = true;
      });

      handler.start();
      expect(eventReceived).toBe(true);
    });
  });

  describe('chunk', () => {
    it('should accumulate content and emit chunk event', () => {
      return new Promise<void>((resolve) => {
        const content1 = 'Hello ';
        const content2 = 'World';

        handler.once('chunk', (event) => {
          expect(event.type).toBe('chunk');
          expect(event.iterationId).toBe(iterationId);
          expect(event.content).toBe(content1);
          expect(event.accumulated).toBe(content1);
          expect(handler.accumulated).toBe(content1);

          handler.once('chunk', (event2) => {
            expect(event2.content).toBe(content2);
            expect(event2.accumulated).toBe(content1 + content2);
            expect(handler.accumulated).toBe(content1 + content2);
            resolve();
          });

          handler.chunk(content2);
        });

        handler.chunk(content1);
      });
    });

    it('should handle empty chunks', () => {
      handler.chunk('');
      expect(handler.accumulated).toBe('');
    });

    it('should handle multiple chunks correctly', () => {
      handler.chunk('a');
      handler.chunk('b');
      handler.chunk('c');
      expect(handler.accumulated).toBe('abc');
    });
  });

  describe('complete', () => {
    it('should emit complete event with full content and token usage', () => {
      return new Promise<void>((resolve) => {
        handler.chunk('Hello ');
        handler.chunk('World');

        const tokenUsage: ClaudeUsage = {
          inputTokens: 100,
          outputTokens: 50,
        };

        handler.once('complete', (event) => {
          expect(event.type).toBe('complete');
          expect(event.iterationId).toBe(iterationId);
          expect(event.fullContent).toBe('Hello World');
          expect(event.tokenUsage.input).toBe(100);
          expect(event.tokenUsage.output).toBe(50);
          expect(event.timestamp).toBeGreaterThan(0);
          resolve();
        });

        handler.complete(tokenUsage);
      });
    });

    it('should include accumulated content in complete event', () => {
      return new Promise<void>((resolve) => {
        handler.chunk('Test ');
        handler.chunk('Content');

        handler.once('complete', (event) => {
          expect(event.fullContent).toBe('Test Content');
          expect(event.fullContent).toBe(handler.accumulated);
          resolve();
        });

        handler.complete({ inputTokens: 0, outputTokens: 0 });
      });
    });
  });

  describe('error', () => {
    it('should emit error event with error object', () => {
      return new Promise<void>((resolve) => {
        const error = new Error('Test error');

        handler.once('error', (event) => {
          expect(event.type).toBe('error');
          expect(event.iterationId).toBe(iterationId);
          expect(event.error).toBe(error);
          expect(event.error.message).toBe('Test error');
          expect(event.timestamp).toBeGreaterThan(0);
          resolve();
        });

        handler.error(error);
      });
    });

    it('should preserve error stack trace', () => {
      return new Promise<void>((resolve) => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at test.js:1:1';

        handler.once('error', (event) => {
          expect(event.error.stack).toBe(error.stack);
          resolve();
        });

        handler.error(error);
      });
    });
  });

  describe('event emission order', () => {
    it('should emit events in correct order', () => {
      return new Promise<void>((resolve) => {
        const events: string[] = [];

        handler.on('start', () => events.push('start'));
        handler.on('chunk', () => events.push('chunk'));
        handler.on('complete', () => {
          events.push('complete');
          expect(events).toEqual(['start', 'chunk', 'chunk', 'complete']);
          resolve();
        });

        handler.start();
        handler.chunk('a');
        handler.chunk('b');
        handler.complete({ inputTokens: 0, outputTokens: 0 });
      });
    });
  });

  describe('multiple listeners', () => {
    it('should notify all listeners', () => {
      return new Promise<void>((resolve) => {
        let callCount = 0;
        const checkDone = () => {
          callCount++;
          if (callCount === 2) {
            resolve();
          }
        };

        handler.on('start', checkDone);
        handler.on('start', checkDone);

        handler.start();
      });
    });
  });
});

describe('StreamingHandler with ClaudeClient integration', () => {
  it('should work with mocked Anthropic SDK stream', async () => {
    const handler = new StreamingHandler('test-iteration');
    const events: Array<{ type: string; content?: string }> = [];

    handler.on('start', () => events.push({ type: 'start' }));
    handler.on('chunk', (event) => events.push({ type: 'chunk', content: event.content }));
    handler.on('complete', () => events.push({ type: 'complete' }));

    // Simulate streaming behavior
    handler.start();
    handler.chunk('Hello');
    handler.chunk(' ');
    handler.chunk('World');
    handler.complete({ inputTokens: 10, outputTokens: 5 });

    expect(events).toEqual([
      { type: 'start' },
      { type: 'chunk', content: 'Hello' },
      { type: 'chunk', content: ' ' },
      { type: 'chunk', content: 'World' },
      { type: 'complete' },
    ]);

    expect(handler.accumulated).toBe('Hello World');
  });
});
