# USA-38: Worker Pool Implementation

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-37

## Description

Implement a worker pool that processes jobs from the queue by running the UserStoryAgent. Workers poll for jobs, process them with streaming support, and update status on completion or failure.

## Problem Statement

- Jobs sit in queue without processing
- Need to integrate with existing UserStoryAgent
- Must handle agent errors gracefully
- Support streaming updates during processing
- Respect job cancellation requests

## Acceptance Criteria

- [ ] Create JobProcessor class that runs UserStoryAgent
- [ ] Poll database for queued jobs with configurable interval
- [ ] Claim jobs with locking to prevent double-processing
- [ ] Update job status (processing → completed/failed)
- [ ] Store agent results in job.result
- [ ] Handle agent errors and store in job.error
- [ ] Emit SSE events during processing (for streaming)
- [ ] Check cancellation flag between iterations
- [ ] Support graceful shutdown (finish current job)
- [ ] Run lock cleanup for expired/abandoned jobs

## Files

### New Files
- `src/worker/job-processor.ts` - Job processing logic
- `src/worker/worker-pool.ts` - Worker pool manager

### Modified Files
- `src/worker/index.ts` - Add exports

## Technical Notes

### Job Processor

```typescript
// src/worker/job-processor.ts
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Job } from '../db/schema.js';
import { updateJobStatus, getJobById } from './job-repository.js';
import { UserStoryAgent, createAgent } from '../agent/index.js';
import { incrementDailyUsage } from '../quota/tracker.js';
import { logger } from '../utils/logger.js';

export interface ProcessingEvent {
  type: 'start' | 'iteration:start' | 'iteration:complete' | 'complete' | 'error';
  jobId: string;
  data: Record<string, unknown>;
}

export class JobProcessor extends EventEmitter {
  private workerId: string;
  private currentJob: Job | null = null;
  private abortController: AbortController | null = null;

  constructor() {
    super();
    this.workerId = `worker-${uuidv4().slice(0, 8)}`;
  }

  getWorkerId(): string {
    return this.workerId;
  }

  isProcessing(): boolean {
    return this.currentJob !== null;
  }

  getCurrentJobId(): string | null {
    return this.currentJob?.id || null;
  }

  async processJob(job: Job): Promise<void> {
    this.currentJob = job;
    this.abortController = new AbortController();

    const startTime = Date.now();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    try {
      this.emit('processing', {
        type: 'start',
        jobId: job.id,
        data: { iterations: job.iterations },
      } as ProcessingEvent);

      // Create agent with job configuration
      const agent = createAgent({
        mode: 'individual',
        iterations: job.iterations,
        streaming: true,
        verify: (job.options as any)?.verify ?? true,
      });

      // Subscribe to agent events for streaming
      agent.on('stream', (event) => {
        // Check for cancellation
        if (this.abortController?.signal.aborted) {
          throw new Error('Job cancelled');
        }

        // Emit SSE-compatible events
        if (event.type === 'start') {
          this.emit('processing', {
            type: 'iteration:start',
            jobId: job.id,
            data: { iteration: event.iterationId },
          } as ProcessingEvent);
        } else if (event.type === 'complete') {
          totalInputTokens += event.usage?.inputTokens || 0;
          totalOutputTokens += event.usage?.outputTokens || 0;

          this.emit('processing', {
            type: 'iteration:complete',
            jobId: job.id,
            data: {
              iteration: event.iterationId,
              tokenUsage: event.usage,
            },
          } as ProcessingEvent);
        }
      });

      // Run the agent
      const result = await agent.processUserStory(job.story);

      // Check final cancellation
      const latestJob = await getJobById(job.id);
      if (latestJob?.status === 'cancelled') {
        throw new Error('Job cancelled');
      }

      // Calculate cost
      const costUsd = this.calculateCost(totalInputTokens, totalOutputTokens);

      // Update usage tracking
      await incrementDailyUsage({
        userId: job.user_id,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd,
      });

      // Mark job as completed
      await updateJobStatus(job.id, 'completed', {
        result: {
          ...result,
          tokenUsage: {
            input: totalInputTokens,
            output: totalOutputTokens,
          },
          costUsd,
          durationMs: Date.now() - startTime,
        },
        completedAt: new Date(),
      });

      this.emit('processing', {
        type: 'complete',
        jobId: job.id,
        data: {
          result,
          tokenUsage: { input: totalInputTokens, output: totalOutputTokens },
          costUsd,
        },
      } as ProcessingEvent);

      logger.info('Job completed', {
        jobId: job.id,
        userId: job.user_id,
        durationMs: Date.now() - startTime,
        tokens: totalInputTokens + totalOutputTokens,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Job cancelled') {
        logger.info('Job was cancelled during processing', { jobId: job.id });
        // Status already set to cancelled by cancel endpoint
      } else {
        await updateJobStatus(job.id, 'failed', {
          error: {
            code: 'PROCESSING_ERROR',
            message: errorMessage,
          },
          completedAt: new Date(),
        });

        this.emit('processing', {
          type: 'error',
          jobId: job.id,
          data: { error: errorMessage },
        } as ProcessingEvent);

        logger.error('Job failed', {
          jobId: job.id,
          userId: job.user_id,
          error: errorMessage,
        });
      }
    } finally {
      this.currentJob = null;
      this.abortController = null;
    }
  }

  abort(): void {
    this.abortController?.abort();
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Claude Sonnet 4 pricing
    const inputCostPer1M = 3.0;
    const outputCostPer1M = 15.0;

    return (
      (inputTokens / 1_000_000) * inputCostPer1M +
      (outputTokens / 1_000_000) * outputCostPer1M
    );
  }
}
```

### Worker Pool

```typescript
// src/worker/worker-pool.ts
import { JobProcessor, ProcessingEvent } from './job-processor.js';
import { claimNextJob, releaseExpiredLocks } from './job-repository.js';
import { logger } from '../utils/logger.js';

export interface WorkerPoolConfig {
  concurrency?: number;
  pollIntervalMs?: number;
  lockCleanupIntervalMs?: number;
}

export class WorkerPool {
  private processors: JobProcessor[] = [];
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Set<(event: ProcessingEvent) => void>> = new Map();

  private config: Required<WorkerPoolConfig>;

  constructor(config: WorkerPoolConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 3,
      pollIntervalMs: config.pollIntervalMs ?? 1000,
      lockCleanupIntervalMs: config.lockCleanupIntervalMs ?? 60000,
    };
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;

    // Create processor pool
    for (let i = 0; i < this.config.concurrency; i++) {
      const processor = new JobProcessor();

      processor.on('processing', (event: ProcessingEvent) => {
        this.notifyListeners(event.jobId, event);
      });

      this.processors.push(processor);
    }

    // Start polling for jobs
    this.poll();

    // Start lock cleanup
    this.cleanupTimer = setInterval(
      () => this.cleanupExpiredLocks(),
      this.config.lockCleanupIntervalMs
    );

    logger.info('Worker pool started', {
      concurrency: this.config.concurrency,
      pollIntervalMs: this.config.pollIntervalMs,
    });
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Wait for active processors to finish
    const activeProcessors = this.processors.filter(p => p.isProcessing());
    if (activeProcessors.length > 0) {
      logger.info('Waiting for active jobs to complete...', {
        count: activeProcessors.length,
      });

      // Wait up to 60 seconds for jobs to complete
      const timeout = 60000;
      const start = Date.now();

      while (
        this.processors.some(p => p.isProcessing()) &&
        Date.now() - start < timeout
      ) {
        await new Promise(r => setTimeout(r, 1000));
      }

      // Force abort any remaining jobs
      for (const processor of this.processors) {
        if (processor.isProcessing()) {
          processor.abort();
        }
      }
    }

    this.processors = [];
    logger.info('Worker pool stopped');
  }

  subscribeToJob(
    jobId: string,
    listener: (event: ProcessingEvent) => void
  ): () => void {
    if (!this.eventListeners.has(jobId)) {
      this.eventListeners.set(jobId, new Set());
    }

    this.eventListeners.get(jobId)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(jobId);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(jobId);
        }
      }
    };
  }

  private notifyListeners(jobId: string, event: ProcessingEvent): void {
    const listeners = this.eventListeners.get(jobId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          logger.warn('Error in job event listener', { jobId, error });
        }
      }
    }
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      // Find idle processors
      const idleProcessors = this.processors.filter(p => !p.isProcessing());

      for (const processor of idleProcessors) {
        const job = await claimNextJob(processor.getWorkerId());

        if (job) {
          // Process in background (don't await)
          processor.processJob(job).catch(error => {
            logger.error('Unexpected error in job processing', { error });
          });
        } else {
          // No more jobs, stop claiming
          break;
        }
      }
    } catch (error) {
      logger.error('Error polling for jobs', { error });
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private async cleanupExpiredLocks(): Promise<void> {
    try {
      const released = await releaseExpiredLocks();
      if (released > 0) {
        logger.warn('Released expired job locks', { count: released });
      }
    } catch (error) {
      logger.error('Error cleaning up expired locks', { error });
    }
  }
}

// Singleton instance
export const workerPool = new WorkerPool();
```

### Updated Barrel Exports

```typescript
// src/worker/index.ts
export * from './job-queue.js';
export * from './job-repository.js';
export * from './job-processor.js';
export * from './worker-pool.js';
```

## Verification

```bash
# Start the API server (workers start automatically)
npm run dev:api

# Create a job
JOB_ID=$(curl -s -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"story": "As a user, I want to log in", "iterations": ["validation"]}' \
  http://localhost:3000/api/v1/jobs | jq -r '.job.id')

# Poll for completion
while true; do
  STATUS=$(curl -s -H "Authorization: Bearer <token>" \
    http://localhost:3000/api/v1/jobs/$JOB_ID | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  [ "$STATUS" = "failed" ] && break
  sleep 2
done

# Get results
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs/$JOB_ID | jq '.result'

# Test cancellation
JOB_ID=$(curl -s -X POST ... | jq -r '.job.id')
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs/$JOB_ID
```

## Notes

- Default concurrency is 3 workers (configurable via environment)
- Workers poll every 1 second for new jobs
- Lock cleanup runs every 60 seconds to recover crashed jobs
- SSE subscriptions allow clients to receive real-time updates
- Graceful shutdown waits up to 60 seconds for jobs to complete
- Token usage tracked and stored in job results
