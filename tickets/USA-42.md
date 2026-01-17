# USA-42: API Routes - Usage & Health

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** Medium
**Status:** Ready
**Dependencies:** USA-33, USA-35, USA-36

## Description

Implement usage tracking API routes for users to view their token consumption, costs, and quota status. Also enhance health endpoints with additional diagnostics.

## Problem Statement

- Users can't see their API usage
- No way to check remaining quota
- Need historical usage data for billing
- Health endpoints need more detail for debugging

## Acceptance Criteria

- [ ] Implement `GET /api/v1/usage` - Get current usage summary
- [ ] Implement `GET /api/v1/usage/daily` - Get daily usage history
- [ ] Implement `GET /api/v1/usage/quota` - Get quota status and limits
- [ ] Add version info to health endpoint
- [ ] Add detailed status endpoint for diagnostics
- [ ] Include cost breakdown by date range
- [ ] Support date filtering for usage history

## Files

### New Files
- `src/api/routes/usage.ts` - Usage router

### Modified Files
- `src/api/routes/health.ts` - Enhance health endpoints

## Technical Notes

### Usage Router

```typescript
// src/api/routes/usage.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { queryOne, queryMany } from '../../db/client.js';
import { DailyUsage, UsageRecord } from '../../db/schema.js';
import { authMiddleware } from '../../auth/middleware.js';
import { getTierLimits } from '../../quota/tiers.js';
import { getDailyUsage } from '../../quota/tracker.js';

export const usageRouter = Router();

usageRouter.use(authMiddleware);

// Get current day usage summary
usageRouter.get('/', async (req: Request, res: Response) => {
  const user = req.user!;
  const limits = getTierLimits(user.quotaTier);

  const todayUsage = await getDailyUsage(user.userId);

  const requestsUsed = todayUsage?.request_count || 0;
  const tokensUsed = (todayUsage?.input_tokens || 0) + (todayUsage?.output_tokens || 0);

  res.json({
    period: 'today',
    date: new Date().toISOString().split('T')[0],
    usage: {
      requests: requestsUsed,
      inputTokens: todayUsage?.input_tokens || 0,
      outputTokens: todayUsage?.output_tokens || 0,
      totalTokens: tokensUsed,
      costUsd: Number(todayUsage?.cost_usd || 0),
    },
    limits: {
      requestsPerDay: limits.requestsPerDay,
      tokensPerDay: limits.tokensPerDay,
    },
    remaining: {
      requests: Math.max(0, limits.requestsPerDay - requestsUsed),
      tokens: Math.max(0, limits.tokensPerDay - tokensUsed),
    },
    percentUsed: {
      requests: Math.round((requestsUsed / limits.requestsPerDay) * 100),
      tokens: Math.round((tokensUsed / limits.tokensPerDay) * 100),
    },
    tier: user.quotaTier,
  });
});

// Get daily usage history
const DailyUsageQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(90).optional().default(30),
});

usageRouter.get('/daily', async (req: Request, res: Response) => {
  const user = req.user!;

  const result = DailyUsageQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: { message: result.error.message } });
    return;
  }

  const { startDate, endDate, limit } = result.data;

  let query = `
    SELECT * FROM daily_usage
    WHERE user_id = $1
  `;
  const params: unknown[] = [user.userId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  query += ` ORDER BY date DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const days = await queryMany<DailyUsage>(query, params);

  // Calculate totals
  const totals = days.reduce(
    (acc, day) => ({
      requests: acc.requests + day.request_count,
      inputTokens: acc.inputTokens + Number(day.input_tokens),
      outputTokens: acc.outputTokens + Number(day.output_tokens),
      costUsd: acc.costUsd + Number(day.cost_usd),
    }),
    { requests: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 }
  );

  res.json({
    days: days.map(day => ({
      date: day.date,
      requests: day.request_count,
      inputTokens: Number(day.input_tokens),
      outputTokens: Number(day.output_tokens),
      totalTokens: Number(day.input_tokens) + Number(day.output_tokens),
      costUsd: Number(day.cost_usd),
    })),
    totals,
    period: {
      start: days.length > 0 ? days[days.length - 1].date : null,
      end: days.length > 0 ? days[0].date : null,
      days: days.length,
    },
  });
});

// Get quota status
usageRouter.get('/quota', async (req: Request, res: Response) => {
  const user = req.user!;
  const limits = getTierLimits(user.quotaTier);

  const todayUsage = await getDailyUsage(user.userId);

  // Get this month's total cost
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyTotal = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(cost_usd), 0) as total
     FROM daily_usage
     WHERE user_id = $1 AND date >= $2`,
    [user.userId, monthStart.toISOString().split('T')[0]]
  );

  res.json({
    tier: user.quotaTier,
    limits: {
      requestsPerDay: limits.requestsPerDay,
      tokensPerDay: limits.tokensPerDay,
      maxStoryBytes: limits.maxStoryBytes,
      maxIterations: limits.maxIterations,
      maxConcurrentJobs: limits.maxConcurrentJobs,
      requestsPerMinute: limits.requestsPerMinute,
    },
    today: {
      requests: todayUsage?.request_count || 0,
      tokens: (todayUsage?.input_tokens || 0) + (todayUsage?.output_tokens || 0),
      costUsd: Number(todayUsage?.cost_usd || 0),
    },
    month: {
      costUsd: Number(monthlyTotal?.total || 0),
    },
    resetsAt: getNextMidnightUTC().toISOString(),
  });
});

function getNextMidnightUTC(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}
```

### Enhanced Health Endpoints

```typescript
// src/api/routes/health.ts (additions)
import { Router } from 'express';
import { healthCheck as dbHealthCheck, getPool } from '../../db/client.js';
import { workerPool } from '../../worker/worker-pool.js';

export const healthRouter = Router();

// Version info
const VERSION = process.env.npm_package_version || '0.2.0';
const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();
const COMMIT_SHA = process.env.COMMIT_SHA || 'unknown';

// Basic liveness
healthRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Readiness (dependencies)
healthRouter.get('/ready', async (req, res) => {
  const checks: Record<string, 'ok' | 'failed'> = {};

  // Database
  checks.database = (await dbHealthCheck()) ? 'ok' : 'failed';

  const allOk = Object.values(checks).every(v => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Detailed status (authenticated)
healthRouter.get('/status', async (req, res) => {
  // This endpoint could be protected by an admin API key
  const pool = getPool();
  const poolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };

  res.json({
    version: VERSION,
    buildTime: BUILD_TIME,
    commitSha: COMMIT_SHA,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      connected: await dbHealthCheck(),
      pool: poolStats,
    },
    workers: {
      // Would need to expose worker stats
      active: 0, // workerPool.getActiveCount()
    },
    timestamp: new Date().toISOString(),
  });
});

// Version endpoint
healthRouter.get('/version', (req, res) => {
  res.json({
    version: VERSION,
    buildTime: BUILD_TIME,
    commitSha: COMMIT_SHA,
  });
});
```

## API Examples

### Get Current Usage

```bash
curl http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer <token>"

# Response:
{
  "period": "today",
  "date": "2024-01-17",
  "usage": {
    "requests": 15,
    "inputTokens": 30000,
    "outputTokens": 15000,
    "totalTokens": 45000,
    "costUsd": 0.315
  },
  "limits": {
    "requestsPerDay": 500,
    "tokensPerDay": 1000000
  },
  "remaining": {
    "requests": 485,
    "tokens": 955000
  },
  "percentUsed": {
    "requests": 3,
    "tokens": 5
  },
  "tier": "pro"
}
```

### Get Daily History

```bash
curl "http://localhost:3000/api/v1/usage/daily?startDate=2024-01-01&limit=7" \
  -H "Authorization: Bearer <token>"

# Response:
{
  "days": [
    {
      "date": "2024-01-17",
      "requests": 15,
      "inputTokens": 30000,
      "outputTokens": 15000,
      "totalTokens": 45000,
      "costUsd": 0.315
    },
    ...
  ],
  "totals": {
    "requests": 100,
    "inputTokens": 200000,
    "outputTokens": 100000,
    "costUsd": 2.1
  },
  "period": {
    "start": "2024-01-11",
    "end": "2024-01-17",
    "days": 7
  }
}
```

### Get Quota Status

```bash
curl http://localhost:3000/api/v1/usage/quota \
  -H "Authorization: Bearer <token>"

# Response:
{
  "tier": "pro",
  "limits": {
    "requestsPerDay": 500,
    "tokensPerDay": 1000000,
    "maxStoryBytes": 30720,
    "maxIterations": 6,
    "maxConcurrentJobs": 3,
    "requestsPerMinute": 20
  },
  "today": {
    "requests": 15,
    "tokens": 45000,
    "costUsd": 0.315
  },
  "month": {
    "costUsd": 5.25
  },
  "resetsAt": "2024-01-18T00:00:00.000Z"
}
```

### Health/Status

```bash
# Basic health
curl http://localhost:3000/health

# Readiness
curl http://localhost:3000/ready

# Version
curl http://localhost:3000/version

# Detailed status
curl http://localhost:3000/status
```

## Verification

```bash
# Run some requests to generate usage data
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/v1/iterations/run \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"story": "Test", "iterations": ["validation"]}'
done

# Check usage
curl -s http://localhost:3000/api/v1/usage \
  -H "Authorization: Bearer <token>" | jq '.usage.requests'

# Check quota remaining
curl -s http://localhost:3000/api/v1/usage/quota \
  -H "Authorization: Bearer <token>" | jq '.remaining'

# View daily history
curl -s http://localhost:3000/api/v1/usage/daily \
  -H "Authorization: Bearer <token>" | jq '.totals'
```

## Notes

- Usage data comes from daily_usage aggregate table
- Quotas reset at midnight UTC
- Monthly cost is calculated from daily aggregates
- History limited to 90 days for performance
- Status endpoint shows internal metrics (consider access control)
