# USA-36: Rate Limiting & Quota Management

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-33, USA-35

## Description

Implement per-user rate limiting and quota management to enforce usage limits based on quota tier. Support both in-memory (single instance) and Redis-backed (distributed) rate limiting.

## Problem Statement

- No protection against API abuse
- No per-user usage limits
- Different tiers need different limits (free/pro/enterprise)
- Need token-based quotas, not just request counts
- Must work in both single-instance and multi-instance deployments

## Acceptance Criteria

- [ ] Define quota tiers with requests/day, tokens/day, max story size, max iterations
- [ ] Implement rate limiter using rate-limiter-flexible
- [ ] Support in-memory store (development) and Redis (production)
- [ ] Create middleware that checks rate limits before processing
- [ ] Track daily usage in database for quota enforcement
- [ ] Return 429 Too Many Requests when limits exceeded
- [ ] Include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
- [ ] Reset quotas daily at midnight UTC
- [ ] Allow quota override for specific users via database

## Files

### New Directory Structure
```
src/quota/
├── tiers.ts
├── tracker.ts
├── rate-limiter.ts
├── middleware.ts
└── index.ts
```

### New Files
- `src/quota/tiers.ts` - Quota tier definitions
- `src/quota/tracker.ts` - Usage tracking in database
- `src/quota/rate-limiter.ts` - Rate limiter setup
- `src/quota/middleware.ts` - Rate limit middleware
- `src/quota/index.ts` - Barrel exports

## Technical Notes

### Quota Tier Definitions

```typescript
// src/quota/tiers.ts
import { QuotaTier } from '../auth/context.js';

export interface TierLimits {
  requestsPerDay: number;
  tokensPerDay: number;
  maxStoryBytes: number;
  maxIterations: number;
  maxConcurrentJobs: number;
  requestsPerMinute: number;
}

export const TIER_LIMITS: Record<QuotaTier, TierLimits> = {
  free: {
    requestsPerDay: 50,
    tokensPerDay: 100_000,
    maxStoryBytes: 10 * 1024, // 10KB
    maxIterations: 3,
    maxConcurrentJobs: 1,
    requestsPerMinute: 5,
  },
  pro: {
    requestsPerDay: 500,
    tokensPerDay: 1_000_000,
    maxStoryBytes: 30 * 1024, // 30KB
    maxIterations: 6,
    maxConcurrentJobs: 3,
    requestsPerMinute: 20,
  },
  enterprise: {
    requestsPerDay: 5000,
    tokensPerDay: 10_000_000,
    maxStoryBytes: 50 * 1024, // 50KB
    maxIterations: 12,
    maxConcurrentJobs: 10,
    requestsPerMinute: 60,
  },
};

export function getTierLimits(tier: QuotaTier): TierLimits {
  return TIER_LIMITS[tier];
}
```

### Usage Tracker

```typescript
// src/quota/tracker.ts
import { query, queryOne, withTransaction } from '../db/client.js';
import { DailyUsage } from '../db/schema.js';

export interface UsageUpdate {
  userId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function getDailyUsage(userId: string): Promise<DailyUsage | null> {
  return queryOne<DailyUsage>(
    `SELECT * FROM daily_usage WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
}

export async function incrementDailyUsage(update: UsageUpdate): Promise<DailyUsage> {
  const result = await queryOne<DailyUsage>(
    `INSERT INTO daily_usage (user_id, date, request_count, input_tokens, output_tokens, cost_usd)
     VALUES ($1, CURRENT_DATE, 1, $2, $3, $4)
     ON CONFLICT (user_id, date)
     DO UPDATE SET
       request_count = daily_usage.request_count + 1,
       input_tokens = daily_usage.input_tokens + $2,
       output_tokens = daily_usage.output_tokens + $3,
       cost_usd = daily_usage.cost_usd + $4
     RETURNING *`,
    [update.userId, update.inputTokens, update.outputTokens, update.costUsd]
  );

  return result!;
}

export async function checkDailyQuota(
  userId: string,
  limits: { requestsPerDay: number; tokensPerDay: number }
): Promise<{ allowed: boolean; usage: DailyUsage | null; reason?: string }> {
  const usage = await getDailyUsage(userId);

  if (!usage) {
    return { allowed: true, usage: null };
  }

  if (usage.request_count >= limits.requestsPerDay) {
    return {
      allowed: false,
      usage,
      reason: `Daily request limit exceeded (${limits.requestsPerDay}/day)`,
    };
  }

  const totalTokens = usage.input_tokens + usage.output_tokens;
  if (totalTokens >= limits.tokensPerDay) {
    return {
      allowed: false,
      usage,
      reason: `Daily token limit exceeded (${limits.tokensPerDay}/day)`,
    };
  }

  return { allowed: true, usage };
}
```

### Rate Limiter Setup

```typescript
// src/quota/rate-limiter.ts
import { RateLimiterMemory, RateLimiterRedis, RateLimiterAbstract } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let rateLimiter: RateLimiterAbstract | null = null;

export function getRateLimiter(): RateLimiterAbstract {
  if (rateLimiter) return rateLimiter;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const redis = new Redis(redisUrl, {
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    redis.on('error', (err) => {
      logger.warn('Redis connection error, falling back to memory', { error: err });
    });

    rateLimiter = new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: 'ratelimit',
      points: 60, // Max requests per minute (enterprise tier)
      duration: 60, // Per minute
      blockDuration: 0, // Don't block, just reject
    });

    logger.info('Rate limiter initialized with Redis');
  } else {
    rateLimiter = new RateLimiterMemory({
      points: 60,
      duration: 60,
    });

    logger.info('Rate limiter initialized with in-memory store');
  }

  return rateLimiter;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export async function checkRateLimit(
  userId: string,
  pointsToConsume: number = 1
): Promise<RateLimitResult> {
  const limiter = getRateLimiter();

  try {
    const result = await limiter.consume(userId, pointsToConsume);

    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetAt: new Date(Date.now() + result.msBeforeNext),
      limit: limiter.points,
    };
  } catch (rateLimitRes: any) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + rateLimitRes.msBeforeNext),
      limit: limiter.points,
    };
  }
}
```

### Rate Limit Middleware

```typescript
// src/quota/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { getTierLimits } from './tiers.js';
import { checkDailyQuota } from './tracker.js';
import { checkRateLimit } from './rate-limiter.js';
import { logger } from '../utils/logger.js';

export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return next(); // Auth middleware should have rejected
  }

  const limits = getTierLimits(req.user.quotaTier);

  // Check per-minute rate limit
  const rateResult = await checkRateLimit(req.user.userId);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', limits.requestsPerMinute);
  res.setHeader('X-RateLimit-Remaining', rateResult.remaining);
  res.setHeader('X-RateLimit-Reset', Math.floor(rateResult.resetAt.getTime() / 1000));

  if (!rateResult.allowed) {
    logger.warn('Rate limit exceeded', {
      userId: req.user.userId,
      tier: req.user.quotaTier,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again after ${rateResult.resetAt.toISOString()}`,
        retryAfter: Math.ceil((rateResult.resetAt.getTime() - Date.now()) / 1000),
      },
    });
    return;
  }

  // Check daily quota
  const quotaResult = await checkDailyQuota(req.user.userId, limits);

  if (!quotaResult.allowed) {
    logger.warn('Daily quota exceeded', {
      userId: req.user.userId,
      tier: req.user.quotaTier,
      usage: quotaResult.usage,
    });

    res.status(429).json({
      error: {
        code: 'DAILY_QUOTA_EXCEEDED',
        message: quotaResult.reason,
        usage: quotaResult.usage,
      },
    });
    return;
  }

  next();
}

// Middleware to validate request size limits
export function validateRequestLimits(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    return next();
  }

  const limits = getTierLimits(req.user.quotaTier);

  // Check story size
  const story = req.body?.story;
  if (story && Buffer.byteLength(story, 'utf8') > limits.maxStoryBytes) {
    res.status(400).json({
      error: {
        code: 'STORY_TOO_LARGE',
        message: `Story exceeds maximum size (${limits.maxStoryBytes} bytes)`,
        maxBytes: limits.maxStoryBytes,
      },
    });
    return;
  }

  // Check iterations count
  const iterations = req.body?.iterations;
  if (iterations && iterations.length > limits.maxIterations) {
    res.status(400).json({
      error: {
        code: 'TOO_MANY_ITERATIONS',
        message: `Too many iterations requested (max: ${limits.maxIterations})`,
        maxIterations: limits.maxIterations,
      },
    });
    return;
  }

  next();
}
```

### Barrel Exports

```typescript
// src/quota/index.ts
export * from './tiers.js';
export * from './tracker.js';
export * from './rate-limiter.js';
export * from './middleware.js';
```

## Environment Variables

```bash
# Redis for distributed rate limiting (optional)
REDIS_URL=redis://localhost:6379

# Custom rate limits (override defaults)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=60
```

## Verification

```bash
# Test rate limiting (exceed 5 req/min for free tier)
for i in {1..10}; do
  curl -H "Authorization: Bearer <token>" \
    http://localhost:3000/api/v1/jobs
done
# After 5 requests → 429 Too Many Requests

# Check rate limit headers
curl -v -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/v1/jobs 2>&1 | grep X-RateLimit

# Test daily quota (mock high usage in database)
psql $DATABASE_URL -c "INSERT INTO daily_usage VALUES ('user-id', CURRENT_DATE, 50, 100000, 50000, 0.50)"
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/jobs
# → 429 Daily quota exceeded

# Test story size limit
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"story": "<very long story>"}' \
  http://localhost:3000/api/v1/jobs
# → 400 Story too large
```

## Notes

- In-memory rate limiter works for single instance (development)
- Redis required for multi-instance production deployment
- Daily quotas reset at midnight UTC via database date comparison
- Rate limit headers follow standard conventions for client SDKs
- Token usage tracked post-request (doesn't block request)
