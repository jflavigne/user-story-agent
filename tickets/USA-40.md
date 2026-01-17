# USA-40: API Routes - Jobs

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-35, USA-36, USA-37, USA-39

## Description

Implement the jobs API routes for creating, listing, retrieving, cancelling, and streaming jobs. This is the primary interface for async story processing.

## Problem Statement

- No HTTP interface to submit and manage jobs
- Need CRUD operations for job management
- Must integrate auth, rate limiting, and streaming

## Acceptance Criteria

- [ ] Implement `POST /api/v1/jobs` - Create new job
- [ ] Implement `GET /api/v1/jobs` - List user's jobs
- [ ] Implement `GET /api/v1/jobs/:id` - Get job details
- [ ] Implement `DELETE /api/v1/jobs/:id` - Cancel job
- [ ] Implement `GET /api/v1/jobs/:id/stream` - SSE stream
- [ ] Validate request body with Zod schemas
- [ ] Apply auth and rate limit middleware
- [ ] Return proper HTTP status codes
- [ ] Include pagination for job listing
- [ ] Return queue position for new jobs

## Files

### New Files
- `src/api/routes/jobs.ts` - Jobs router

### Modified Files
- `src/api/app.ts` - Mount jobs router

## Technical Notes

### Request/Response Schemas

```typescript
// src/api/routes/jobs.ts
import { z } from 'zod';

const CreateJobSchema = z.object({
  story: z.string().min(1).max(100_000),
  iterations: z.array(z.string()).min(1).max(12),
  options: z.object({
    streaming: z.boolean().optional().default(true),
    verify: z.boolean().optional().default(true),
    productType: z.enum(['web', 'mobile-native', 'mobile-web', 'desktop', 'api']).optional(),
  }).optional().default({}),
});

const ListJobsSchema = z.object({
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

type CreateJobRequest = z.infer<typeof CreateJobSchema>;
type ListJobsQuery = z.infer<typeof ListJobsSchema>;
```

### Jobs Router

```typescript
// src/api/routes/jobs.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { jobQueue } from '../../worker/job-queue.js';
import { streamJobEvents } from '../sse/job-stream.js';
import { authMiddleware } from '../../auth/middleware.js';
import { rateLimitMiddleware, validateRequestLimits } from '../../quota/middleware.js';
import { ApiError } from '../middleware/error-handler.js';
import { logger } from '../../utils/logger.js';

export const jobsRouter = Router();

// Apply auth and rate limiting to all routes
jobsRouter.use(authMiddleware);
jobsRouter.use(rateLimitMiddleware);

// Validation middleware factory
function validate<T extends z.ZodType>(schema: T, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(source === 'body' ? req.body : req.query);
    if (!result.success) {
      throw new ApiError(400, result.error.message, 'VALIDATION_ERROR');
    }
    if (source === 'body') {
      req.body = result.data;
    }
    next();
  };
}

// Create job
jobsRouter.post(
  '/',
  validate(CreateJobSchema),
  validateRequestLimits,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { story, iterations, options } = req.body as CreateJobRequest;
      const user = req.user!;

      const { job, position } = await jobQueue.createJob(
        {
          userId: user.userId,
          tenantId: user.tenantId,
          story,
          iterations,
          options,
        },
        user.quotaTier
      );

      res.status(201).json({
        job: {
          id: job.id,
          status: job.status,
          iterations: job.iterations,
          createdAt: job.created_at,
        },
        queuePosition: position,
        links: {
          self: `/api/v1/jobs/${job.id}`,
          stream: `/api/v1/jobs/${job.id}/stream`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// List jobs
jobsRouter.get(
  '/',
  validate(ListJobsSchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { status, limit, offset } = req.query as unknown as ListJobsQuery;

      const jobs = await jobQueue.listJobs(user.userId, {
        status,
        limit,
        offset,
      });

      res.json({
        jobs: jobs.map(job => ({
          id: job.id,
          status: job.status,
          iterations: job.iterations,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          hasResult: !!job.result,
          hasError: !!job.error,
        })),
        pagination: {
          limit,
          offset,
          hasMore: jobs.length === limit,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get job details
jobsRouter.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const job = await jobQueue.getJob(id, user.userId);

      if (!job) {
        throw new ApiError(404, 'Job not found', 'NOT_FOUND');
      }

      res.json({
        id: job.id,
        status: job.status,
        story: job.story,
        iterations: job.iterations,
        options: job.options,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        result: job.result,
        error: job.error,
        files: job.files?.map(f => ({
          id: f.id,
          fileName: f.file_name,
          contentType: f.content_type,
          sizeBytes: f.size_bytes,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel job
jobsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      const job = await jobQueue.cancelJob(id, user.userId);

      if (!job) {
        throw new ApiError(404, 'Job not found or already completed', 'NOT_FOUND');
      }

      res.json({
        id: job.id,
        status: job.status,
        message: 'Job cancelled',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Stream job events (SSE)
jobsRouter.get(
  '/:id/stream',
  streamJobEvents
);
```

### Mount Router in App

```typescript
// In src/api/app.ts
import { jobsRouter } from './routes/jobs.js';

// Add after health router
app.use('/api/v1/jobs', jobsRouter);
```

## API Examples

### Create Job

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "story": "As a user, I want to log in so that I can access my account",
    "iterations": ["validation", "accessibility", "security"],
    "options": {
      "verify": true,
      "productType": "web"
    }
  }'

# Response (201 Created):
{
  "job": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "queued",
    "iterations": ["validation", "accessibility", "security"],
    "createdAt": "2024-01-17T10:00:00Z"
  },
  "queuePosition": 1,
  "links": {
    "self": "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000",
    "stream": "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000/stream"
  }
}
```

### List Jobs

```bash
curl "http://localhost:3000/api/v1/jobs?status=completed&limit=10" \
  -H "Authorization: Bearer <token>"

# Response:
{
  "jobs": [
    {
      "id": "...",
      "status": "completed",
      "iterations": ["validation"],
      "createdAt": "...",
      "completedAt": "...",
      "hasResult": true,
      "hasError": false
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### Get Job

```bash
curl http://localhost:3000/api/v1/jobs/<id> \
  -H "Authorization: Bearer <token>"

# Response:
{
  "id": "...",
  "status": "completed",
  "story": "As a user...",
  "iterations": ["validation"],
  "result": {
    "enhancedStory": "...",
    "tokenUsage": { "input": 2000, "output": 1000 },
    "costUsd": 0.018
  }
}
```

### Cancel Job

```bash
curl -X DELETE http://localhost:3000/api/v1/jobs/<id> \
  -H "Authorization: Bearer <token>"

# Response:
{
  "id": "...",
  "status": "cancelled",
  "message": "Job cancelled"
}
```

## Verification

```bash
# Run API tests
npm run test:api -- --grep "jobs"

# Manual testing flow
TOKEN="Bearer <your-token>"

# 1. Create job
JOB=$(curl -s -X POST http://localhost:3000/api/v1/jobs \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"story": "Test story", "iterations": ["validation"]}')
JOB_ID=$(echo $JOB | jq -r '.job.id')
echo "Created job: $JOB_ID"

# 2. Get job status
curl -s http://localhost:3000/api/v1/jobs/$JOB_ID \
  -H "Authorization: $TOKEN" | jq '.status'

# 3. Stream events
curl -N http://localhost:3000/api/v1/jobs/$JOB_ID/stream \
  -H "Authorization: $TOKEN" \
  -H "Accept: text/event-stream"

# 4. List completed jobs
curl -s "http://localhost:3000/api/v1/jobs?status=completed" \
  -H "Authorization: $TOKEN" | jq '.jobs | length'
```

## Notes

- All routes require authentication
- Rate limiting applied to all routes
- Request validation with clear error messages
- Pagination with hasMore flag for infinite scroll
- Links included for API discoverability
- Story truncated in list view, full in detail view
