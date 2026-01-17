# USA-39: SSE Streaming Adapter

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-34, USA-38

## Description

Implement Server-Sent Events (SSE) streaming for real-time job progress updates. Clients can subscribe to job events and receive iteration progress as it happens, enabling progressive UI updates in OpenWebUI.

## Problem Statement

- Polling for job status is inefficient
- Users want real-time feedback during long-running processes
- OpenWebUI expects SSE for tool streaming
- Need to bridge between worker events and HTTP responses

## Acceptance Criteria

- [ ] Create SSE response helper for Express
- [ ] Implement job stream endpoint (`GET /api/v1/jobs/:id/stream`)
- [ ] Bridge worker pool events to SSE
- [ ] Handle client disconnection gracefully
- [ ] Send heartbeat to keep connection alive
- [ ] Support reconnection with Last-Event-ID
- [ ] Format events for OpenWebUI compatibility
- [ ] Clean up subscriptions on disconnect

## Files

### New Directory Structure
```
src/api/sse/
├── stream-response.ts
├── job-stream.ts
└── index.ts
```

### New Files
- `src/api/sse/stream-response.ts` - SSE response utilities
- `src/api/sse/job-stream.ts` - Job streaming logic
- `src/api/sse/index.ts` - Barrel exports

### Modified Files
- `src/api/routes/jobs.ts` - Add stream endpoint

## Technical Notes

### SSE Response Helper

```typescript
// src/api/sse/stream-response.ts
import { Response } from 'express';

export interface SSEEvent {
  event?: string;
  data: unknown;
  id?: string;
  retry?: number;
}

export class SSEResponse {
  private res: Response;
  private eventId = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private closed = false;

  constructor(res: Response) {
    this.res = res;
    this.setupSSE();
  }

  private setupSSE(): void {
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    this.res.flushHeaders();

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      if (!this.closed) {
        this.sendComment('heartbeat');
      }
    }, 15000);

    // Handle client disconnect
    this.res.on('close', () => {
      this.close();
    });
  }

  send(event: SSEEvent): void {
    if (this.closed) return;

    const id = event.id ?? String(++this.eventId);

    let message = '';

    if (event.event) {
      message += `event: ${event.event}\n`;
    }

    message += `id: ${id}\n`;

    if (event.retry) {
      message += `retry: ${event.retry}\n`;
    }

    const data = typeof event.data === 'string'
      ? event.data
      : JSON.stringify(event.data);

    // Handle multi-line data
    for (const line of data.split('\n')) {
      message += `data: ${line}\n`;
    }

    message += '\n';

    this.res.write(message);
  }

  sendComment(comment: string): void {
    if (this.closed) return;
    this.res.write(`: ${comment}\n\n`);
  }

  close(): void {
    if (this.closed) return;

    this.closed = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.res.end();
  }

  isClosed(): boolean {
    return this.closed;
  }

  onClose(callback: () => void): void {
    this.res.on('close', callback);
  }
}
```

### Job Stream

```typescript
// src/api/sse/job-stream.ts
import { Request, Response } from 'express';
import { SSEResponse } from './stream-response.js';
import { workerPool, ProcessingEvent } from '../../worker/index.js';
import { getJobById } from '../../worker/job-repository.js';
import { logger } from '../../utils/logger.js';

export async function streamJobEvents(req: Request, res: Response): Promise<void> {
  const { id: jobId } = req.params;
  const userId = req.user?.userId;

  // Verify job exists and belongs to user
  const job = await getJobById(jobId, userId);

  if (!job) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Job not found' },
    });
    return;
  }

  // If job already completed/failed, return final status
  if (['completed', 'failed', 'cancelled'].includes(job.status)) {
    res.json({
      status: job.status,
      result: job.result,
      error: job.error,
    });
    return;
  }

  // Set up SSE stream
  const sse = new SSEResponse(res);

  // Handle Last-Event-ID for reconnection
  const lastEventId = req.headers['last-event-id'];
  if (lastEventId) {
    logger.debug('SSE reconnection', { jobId, lastEventId });
  }

  // Send initial event
  sse.send({
    event: 'connected',
    data: {
      jobId,
      status: job.status,
      iterations: job.iterations,
    },
  });

  // Subscribe to worker events
  const unsubscribe = workerPool.subscribeToJob(
    jobId,
    (event: ProcessingEvent) => {
      if (sse.isClosed()) {
        unsubscribe();
        return;
      }

      // Map internal events to SSE events
      switch (event.type) {
        case 'start':
          sse.send({
            event: 'start',
            data: event.data,
          });
          break;

        case 'iteration:start':
          sse.send({
            event: 'iteration_start',
            data: event.data,
          });
          break;

        case 'iteration:complete':
          sse.send({
            event: 'iteration_complete',
            data: event.data,
          });
          break;

        case 'complete':
          sse.send({
            event: 'complete',
            data: event.data,
          });
          sse.close();
          break;

        case 'error':
          sse.send({
            event: 'error',
            data: event.data,
          });
          sse.close();
          break;
      }
    }
  );

  // Clean up on disconnect
  sse.onClose(() => {
    unsubscribe();
    logger.debug('SSE connection closed', { jobId });
  });

  // Poll for job status if not currently processing
  // (in case job completes before subscription)
  const checkCompletion = setInterval(async () => {
    if (sse.isClosed()) {
      clearInterval(checkCompletion);
      return;
    }

    const currentJob = await getJobById(jobId);
    if (currentJob && ['completed', 'failed', 'cancelled'].includes(currentJob.status)) {
      sse.send({
        event: currentJob.status,
        data: {
          result: currentJob.result,
          error: currentJob.error,
        },
      });
      sse.close();
      clearInterval(checkCompletion);
    }
  }, 5000);

  sse.onClose(() => {
    clearInterval(checkCompletion);
  });
}
```

### Barrel Exports

```typescript
// src/api/sse/index.ts
export * from './stream-response.js';
export * from './job-stream.js';
```

### OpenWebUI Event Format

For OpenWebUI compatibility, events follow this structure:

```typescript
// Start event
{
  event: 'start',
  data: {
    jobId: string,
    iterations: string[],
    estimatedTime?: number
  }
}

// Iteration progress
{
  event: 'iteration_start',
  data: {
    iteration: string,
    index: number,
    total: number
  }
}

{
  event: 'iteration_complete',
  data: {
    iteration: string,
    tokenUsage: { input: number, output: number }
  }
}

// Completion
{
  event: 'complete',
  data: {
    result: AgentResult,
    tokenUsage: { input: number, output: number },
    costUsd: number
  }
}

// Error
{
  event: 'error',
  data: {
    code: string,
    message: string,
    retryable: boolean
  }
}
```

## Verification

```bash
# Create a job
JOB_ID=$(curl -s -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"story": "As a user...", "iterations": ["validation", "accessibility"]}' \
  http://localhost:3000/api/v1/jobs | jq -r '.job.id')

# Stream job events
curl -N -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  http://localhost:3000/api/v1/jobs/$JOB_ID/stream

# Expected output:
# event: connected
# id: 1
# data: {"jobId":"...","status":"queued","iterations":["validation","accessibility"]}
#
# event: start
# id: 2
# data: {"iterations":["validation","accessibility"]}
#
# event: iteration_start
# id: 3
# data: {"iteration":"validation"}
#
# event: iteration_complete
# id: 4
# data: {"iteration":"validation","tokenUsage":{"input":1000,"output":500}}
#
# ... more events ...
#
# event: complete
# id: 10
# data: {"result":{...},"tokenUsage":{"input":3000,"output":1500},"costUsd":0.025}

# Test reconnection with Last-Event-ID
curl -N -H "Authorization: Bearer <token>" \
  -H "Accept: text/event-stream" \
  -H "Last-Event-ID: 4" \
  http://localhost:3000/api/v1/jobs/$JOB_ID/stream
```

## Notes

- Heartbeat every 15 seconds keeps connection alive through proxies
- X-Accel-Buffering header prevents nginx from buffering SSE
- Last-Event-ID support enables reconnection (future enhancement)
- Completed jobs return JSON immediately instead of SSE
- Subscriptions cleaned up on client disconnect
- 5-second polling catches jobs that complete before subscription
