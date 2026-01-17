# USA-37: Job Queue System

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-32, USA-33

## Description

Implement a PostgreSQL-based job queue for asynchronous story processing. Jobs are created via API, stored in the database, and processed by workers. Supports concurrency limits per user.

## Problem Statement

- Synchronous API would timeout on long-running agent processes
- Need to track job status and results
- Multiple users submitting concurrent jobs requires queuing
- Per-user concurrency limits based on quota tier
- Jobs must survive server restarts

## Acceptance Criteria

- [ ] Create JobQueue class with create, get, list, cancel methods
- [ ] Support job states: queued, processing, completed, failed, cancelled
- [ ] Store job results in database
- [ ] Implement per-user job limits based on quota tier
- [ ] Add job locking for safe concurrent processing
- [ ] Create job repository for database operations
- [ ] Support job cancellation with status update
- [ ] Include job metadata (timestamps, worker ID)
- [ ] Return proper errors when limits exceeded

## Files

### New Directory Structure
```
src/worker/
├── job-queue.ts
├── job-repository.ts
└── index.ts
```

### New Files
- `src/worker/job-queue.ts` - Job queue operations
- `src/worker/job-repository.ts` - Database queries for jobs
- `src/worker/index.ts` - Barrel exports

## Technical Notes

### Job Repository

```typescript
// src/worker/job-repository.ts
import { query, queryOne, queryMany, withTransaction } from '../db/client.js';
import { Job, JobStatus, JobFile } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateJobInput {
  userId: string;
  tenantId: string;
  story: string;
  iterations: string[];
  options?: Record<string, unknown>;
}

export interface JobWithFiles extends Job {
  files: JobFile[];
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  const id = uuidv4();

  const result = await queryOne<Job>(
    `INSERT INTO jobs (id, user_id, tenant_id, story, iterations, options)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      id,
      input.userId,
      input.tenantId,
      input.story,
      input.iterations,
      JSON.stringify(input.options || {}),
    ]
  );

  return result!;
}

export async function getJobById(
  id: string,
  userId?: string
): Promise<JobWithFiles | null> {
  const job = await queryOne<Job>(
    userId
      ? 'SELECT * FROM jobs WHERE id = $1 AND user_id = $2'
      : 'SELECT * FROM jobs WHERE id = $1',
    userId ? [id, userId] : [id]
  );

  if (!job) return null;

  const files = await queryMany<JobFile>(
    'SELECT * FROM job_files WHERE job_id = $1',
    [id]
  );

  return { ...job, files };
}

export async function listJobsByUser(
  userId: string,
  options: { status?: JobStatus; limit?: number; offset?: number } = {}
): Promise<Job[]> {
  const { status, limit = 50, offset = 0 } = options;

  if (status) {
    return queryMany<Job>(
      `SELECT * FROM jobs
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, status, limit, offset]
    );
  }

  return queryMany<Job>(
    `SELECT * FROM jobs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
}

export async function countActiveJobs(userId: string): Promise<number> {
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM jobs
     WHERE user_id = $1 AND status IN ('queued', 'processing')`,
    [userId]
  );

  return parseInt(result?.count || '0', 10);
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  updates: Partial<Pick<Job, 'result' | 'error' | 'startedAt' | 'completedAt'>> = {}
): Promise<Job | null> {
  const setClauses = ['status = $2'];
  const params: unknown[] = [id, status];
  let paramIndex = 3;

  if (updates.result !== undefined) {
    setClauses.push(`result = $${paramIndex}`);
    params.push(JSON.stringify(updates.result));
    paramIndex++;
  }

  if (updates.error !== undefined) {
    setClauses.push(`error = $${paramIndex}`);
    params.push(JSON.stringify(updates.error));
    paramIndex++;
  }

  if (updates.startedAt !== undefined) {
    setClauses.push(`started_at = $${paramIndex}`);
    params.push(updates.startedAt);
    paramIndex++;
  }

  if (updates.completedAt !== undefined) {
    setClauses.push(`completed_at = $${paramIndex}`);
    params.push(updates.completedAt);
    paramIndex++;
  }

  return queryOne<Job>(
    `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
}

export async function claimNextJob(workerId: string): Promise<Job | null> {
  // Use SKIP LOCKED for safe concurrent processing
  return queryOne<Job>(
    `UPDATE jobs
     SET status = 'processing',
         started_at = NOW(),
         worker_id = $1,
         locked_until = NOW() + INTERVAL '10 minutes'
     WHERE id = (
       SELECT id FROM jobs
       WHERE status = 'queued'
       ORDER BY created_at
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [workerId]
  );
}

export async function releaseExpiredLocks(): Promise<number> {
  const result = await query(
    `UPDATE jobs
     SET status = 'queued',
         worker_id = NULL,
         locked_until = NULL
     WHERE status = 'processing'
       AND locked_until < NOW()`,
    []
  );

  return result.rowCount || 0;
}

export async function cancelJob(id: string, userId: string): Promise<Job | null> {
  return queryOne<Job>(
    `UPDATE jobs
     SET status = 'cancelled',
         completed_at = NOW()
     WHERE id = $1
       AND user_id = $2
       AND status IN ('queued', 'processing')
     RETURNING *`,
    [id, userId]
  );
}
```

### Job Queue

```typescript
// src/worker/job-queue.ts
import {
  createJob as createJobInDb,
  getJobById,
  listJobsByUser,
  countActiveJobs,
  cancelJob as cancelJobInDb,
  CreateJobInput,
} from './job-repository.js';
import { getTierLimits } from '../quota/tiers.js';
import { QuotaTier } from '../auth/context.js';
import { Job } from '../db/schema.js';
import { ApiError } from '../api/middleware/error-handler.js';
import { logger } from '../utils/logger.js';

export interface QueueJobResult {
  job: Job;
  position?: number;
}

export class JobQueue {
  async createJob(
    input: CreateJobInput,
    quotaTier: QuotaTier
  ): Promise<QueueJobResult> {
    const limits = getTierLimits(quotaTier);

    // Check concurrent job limit
    const activeCount = await countActiveJobs(input.userId);
    if (activeCount >= limits.maxConcurrentJobs) {
      throw new ApiError(
        429,
        `Concurrent job limit exceeded (max: ${limits.maxConcurrentJobs})`,
        'CONCURRENT_JOB_LIMIT'
      );
    }

    // Validate iterations count
    if (input.iterations.length > limits.maxIterations) {
      throw new ApiError(
        400,
        `Too many iterations (max: ${limits.maxIterations})`,
        'TOO_MANY_ITERATIONS'
      );
    }

    // Validate story size
    const storyBytes = Buffer.byteLength(input.story, 'utf8');
    if (storyBytes > limits.maxStoryBytes) {
      throw new ApiError(
        400,
        `Story too large (max: ${limits.maxStoryBytes} bytes)`,
        'STORY_TOO_LARGE'
      );
    }

    const job = await createJobInDb(input);

    logger.info('Job created', {
      jobId: job.id,
      userId: input.userId,
      iterations: input.iterations.length,
    });

    return {
      job,
      position: activeCount + 1,
    };
  }

  async getJob(id: string, userId?: string): Promise<Job | null> {
    return getJobById(id, userId);
  }

  async listJobs(
    userId: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<Job[]> {
    return listJobsByUser(userId, options as any);
  }

  async cancelJob(id: string, userId: string): Promise<Job | null> {
    const job = await cancelJobInDb(id, userId);

    if (job) {
      logger.info('Job cancelled', { jobId: id, userId });
    }

    return job;
  }

  async getQueuePosition(userId: string): Promise<number> {
    return countActiveJobs(userId);
  }
}

// Singleton instance
export const jobQueue = new JobQueue();
```

### Barrel Exports

```typescript
// src/worker/index.ts
export * from './job-queue.js';
export * from './job-repository.js';
```

## Verification

```bash
# Create a job
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"story": "As a user...", "iterations": ["validation"]}' \
  http://localhost:3000/api/v1/jobs

# Check job status
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs/<job-id>

# List user's jobs
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs

# Cancel a job
curl -X DELETE -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs/<job-id>

# Test concurrent limit
# Create multiple jobs for free tier (max: 1)
for i in {1..3}; do
  curl -X POST -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"story": "Test", "iterations": ["validation"]}' \
    http://localhost:3000/api/v1/jobs
done
# After first job → 429 Concurrent job limit exceeded
```

## Notes

- PostgreSQL SKIP LOCKED ensures safe concurrent worker claims
- Lock timeout (10 minutes) allows recovery from crashed workers
- Job position returned to help users understand queue status
- Cancelled jobs can't be resumed (create new job instead)
- Job files relationship handled separately (see USA-43)
