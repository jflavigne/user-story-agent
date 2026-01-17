# USA-28: Streaming Support

**Epic:** USA - User Story Agent
**Type:** Enhancement
**Priority:** Medium
**Dependencies:** USA-26, USA-27

## Description

Add streaming support for iteration outputs to improve UX for long-running iterations. Currently, users see no output until an iteration completes. This ticket adds progressive streaming with real-time progress display.

## Problem Statement

- Long iterations (30+ seconds) provide no feedback during processing
- Users can't tell if the agent is working or stuck
- No way to see partial progress on complex iterations
- Poor experience for interactive use

## Acceptance Criteria

- [ ] Add `stream: boolean` option to `ClaudeClient.sendMessage()`
- [ ] Implement streaming message handler with event emitter pattern
- [ ] Create progress event types: `start`, `chunk`, `complete`, `error`
- [ ] Update CLI with `--stream` flag to enable streaming output
- [ ] Display streaming output with visual indicators (spinner, partial text)
- [ ] Handle stream interruption gracefully (Ctrl+C)
- [ ] Accumulate streamed chunks for final structured output parsing
- [ ] Add streaming-specific tests

## Files

### New Files
- `src/agent/streaming.ts` - Streaming handler and event types (~100 lines)
- `tests/agent/streaming.test.ts` - Streaming unit tests

### Modified Files
- `src/agent/claude-client.ts` - Add streaming API call method
- `src/agent/types.ts` - Add streaming event types
- `src/cli.ts` - Add --stream flag and streaming output handler
- `src/agent/user-story-agent.ts` - Wire up streaming events

## Technical Notes

### Event Types

```typescript
// src/agent/types.ts
export interface StreamEvent {
  type: 'start' | 'chunk' | 'complete' | 'error';
  iterationId: string;
  timestamp: number;
}

export interface StreamStartEvent extends StreamEvent {
  type: 'start';
}

export interface StreamChunkEvent extends StreamEvent {
  type: 'chunk';
  content: string;
  accumulated: string;
}

export interface StreamCompleteEvent extends StreamEvent {
  type: 'complete';
  fullContent: string;
  tokenUsage: TokenUsage;
}

export interface StreamErrorEvent extends StreamEvent {
  type: 'error';
  error: Error;
}

export type StreamEventUnion =
  | StreamStartEvent
  | StreamChunkEvent
  | StreamCompleteEvent
  | StreamErrorEvent;
```

### Streaming Handler

```typescript
// src/agent/streaming.ts
import { EventEmitter } from 'events';

export class StreamingHandler extends EventEmitter {
  private accumulated: string = '';

  constructor(private iterationId: string) {
    super();
  }

  start(): void {
    this.emit('event', {
      type: 'start',
      iterationId: this.iterationId,
      timestamp: Date.now()
    });
  }

  chunk(content: string): void {
    this.accumulated += content;
    this.emit('event', {
      type: 'chunk',
      iterationId: this.iterationId,
      content,
      accumulated: this.accumulated,
      timestamp: Date.now()
    });
  }

  complete(tokenUsage: TokenUsage): void {
    this.emit('event', {
      type: 'complete',
      iterationId: this.iterationId,
      fullContent: this.accumulated,
      tokenUsage,
      timestamp: Date.now()
    });
  }

  error(error: Error): void {
    this.emit('event', {
      type: 'error',
      iterationId: this.iterationId,
      error,
      timestamp: Date.now()
    });
  }
}
```

### Claude Client Streaming

```typescript
// In ClaudeClient
async sendMessageStreaming(
  messages: Message[],
  handler: StreamingHandler
): Promise<string> {
  handler.start();

  const stream = await this.client.messages.stream({
    model: this.model,
    max_tokens: this.maxTokens,
    messages,
    system: this.systemPrompt
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      handler.chunk(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  handler.complete({
    input: finalMessage.usage.input_tokens,
    output: finalMessage.usage.output_tokens
  });

  return handler.accumulated;
}
```

### CLI Streaming Display

```typescript
// In CLI
if (options.stream) {
  agent.on('stream', (event: StreamEventUnion) => {
    switch (event.type) {
      case 'start':
        process.stderr.write(`\n[${event.iterationId}] Starting...\n`);
        break;
      case 'chunk':
        process.stderr.write(event.content);
        break;
      case 'complete':
        process.stderr.write(`\n[${event.iterationId}] Complete\n`);
        break;
    }
  });
}
```

## Verification

```bash
# Run streaming tests
npm test -- --grep "streaming"

# Manual test with streaming
echo "As a user I want to login" | npm run agent -- \
  --mode individual --iterations validation --stream

# Should see progressive output during iteration
```

## References

- [Anthropic Streaming API](https://docs.anthropic.com/en/api/streaming)
- [Node.js EventEmitter](https://nodejs.org/api/events.html)
