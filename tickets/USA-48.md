# USA-48: API Layer Tests

**Epic:** USA - User Story Agent
**Type:** Testing
**Priority:** High
**Status:** Ready
**Dependencies:** USA-40, USA-41, USA-42

## Description

Create comprehensive test suite for the API layer including unit tests, integration tests, and end-to-end tests. Use Vitest with supertest for HTTP testing.

## Problem Statement

- No tests for new API endpoints
- Need integration tests with database
- Must test authentication flows
- Rate limiting logic needs verification
- SSE streaming requires special testing

## Acceptance Criteria

- [ ] Create unit tests for middleware (auth, rate-limit, error-handler)
- [ ] Create integration tests for all API routes
- [ ] Test authentication with JWT and API keys
- [ ] Test rate limiting behavior
- [ ] Test quota enforcement
- [ ] Test job lifecycle (create → process → complete)
- [ ] Test SSE streaming
- [ ] Create test utilities and mocks
- [ ] Achieve 80%+ code coverage for API layer

## Files

### New Files
- `vitest.config.api.ts` - API test configuration
- `tests/api/setup.ts` - Test setup and utilities
- `tests/api/mocks/` - Mock implementations
- `tests/api/routes/jobs.test.ts` - Jobs route tests
- `tests/api/routes/iterations.test.ts` - Iterations route tests
- `tests/api/routes/usage.test.ts` - Usage route tests
- `tests/api/middleware/auth.test.ts` - Auth middleware tests
- `tests/api/middleware/rate-limit.test.ts` - Rate limit tests
- `tests/api/integration/job-lifecycle.test.ts` - E2E job tests

## Technical Notes

### Test Configuration

```typescript
// vitest.config.api.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.ts'],
    setupFiles: ['tests/api/setup.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/api/**/*.ts', 'src/auth/**/*.ts', 'src/quota/**/*.ts'],
      exclude: ['**/*.d.ts', '**/index.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
      },
    },
  },
});
```

### Test Setup

```typescript
// tests/api/setup.ts
import { beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';

// Mock database
let testPool: Pool;

beforeAll(async () => {
  // Use test database or in-memory mock
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/user_story_agent_test';

  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.NODE_ENV = 'test';

  testPool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Run migrations
  // await runMigrations(testPool);
});

afterAll(async () => {
  await testPool?.end();
});

beforeEach(async () => {
  // Clean tables between tests
  await testPool.query('TRUNCATE jobs, usage_records, daily_usage, api_keys CASCADE');
});

// Test utilities
export { testPool };

export function createTestUser(overrides = {}) {
  return {
    userId: 'test-user-id',
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
    quotaTier: 'pro' as const,
    scopes: ['*'],
    authMethod: 'jwt' as const,
    ...overrides,
  };
}

export function createTestApiKey() {
  return 'usa_testpfx_testsecret1234567890123456';
}
```

### Auth Middleware Tests

```typescript
// tests/api/middleware/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { createTestUser, createTestApiKey } from '../setup';

describe('Auth Middleware', () => {
  const app = createApp();

  describe('JWT Authentication', () => {
    it('should reject requests without auth header', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid JWT tokens', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should accept valid JWT tokens', async () => {
      // Mock JWT validation
      vi.mock('../../../src/auth/jwt', () => ({
        validateJwt: vi.fn().mockResolvedValue(createTestUser()),
      }));

      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(res.body.jobs).toBeDefined();
    });
  });

  describe('API Key Authentication', () => {
    it('should accept valid API keys', async () => {
      // Insert test API key in database
      const apiKey = createTestApiKey();

      // Mock API key validation
      vi.mock('../../../src/auth/api-key', () => ({
        validateApiKey: vi.fn().mockResolvedValue(createTestUser({ authMethod: 'api-key' })),
      }));

      const res = await request(app)
        .get('/api/v1/jobs')
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(res.body.jobs).toBeDefined();
    });

    it('should reject expired API keys', async () => {
      vi.mock('../../../src/auth/api-key', () => ({
        validateApiKey: vi.fn().mockResolvedValue(null),
      }));

      const res = await request(app)
        .get('/api/v1/jobs')
        .set('X-API-Key', 'usa_expired_key123')
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
```

### Rate Limit Tests

```typescript
// tests/api/middleware/rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { createTestUser } from '../setup';

describe('Rate Limiting', () => {
  const app = createApp();

  beforeEach(() => {
    // Reset rate limiter between tests
  });

  it('should include rate limit headers', async () => {
    const res = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.headers['x-ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Make requests up to limit
    const limit = 5; // Free tier RPM
    for (let i = 0; i < limit; i++) {
      await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', 'Bearer valid-token');
    }

    // Next request should be rate limited
    const res = await request(app)
      .get('/api/v1/jobs')
      .set('Authorization', 'Bearer valid-token')
      .expect(429);

    expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(res.body.error.retryAfter).toBeDefined();
  });
});
```

### Jobs Route Tests

```typescript
// tests/api/routes/jobs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { createTestUser, testPool } from '../setup';

describe('Jobs API', () => {
  const app = createApp();

  beforeEach(() => {
    vi.mock('../../../src/auth/middleware', () => ({
      authMiddleware: (req, res, next) => {
        req.user = createTestUser();
        next();
      },
    }));
  });

  describe('POST /api/v1/jobs', () => {
    it('should create a new job', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({
          story: 'As a user, I want to log in',
          iterations: ['validation'],
        })
        .expect(201);

      expect(res.body.job.id).toBeDefined();
      expect(res.body.job.status).toBe('queued');
      expect(res.body.queuePosition).toBe(1);
      expect(res.body.links.self).toContain('/api/v1/jobs/');
      expect(res.body.links.stream).toContain('/stream');
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ story: 'Test' }) // Missing iterations
        .expect(400);

      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should enforce iteration limit', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({
          story: 'Test',
          iterations: Array(15).fill('validation'), // Exceeds max
        })
        .expect(400);

      expect(res.body.error.code).toContain('LIMIT');
    });

    it('should enforce story size limit', async () => {
      const largeStory = 'x'.repeat(100001); // > 100KB

      const res = await request(app)
        .post('/api/v1/jobs')
        .send({
          story: largeStory,
          iterations: ['validation'],
        })
        .expect(400);

      expect(res.body.error.code).toBe('STORY_TOO_LARGE');
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should list user jobs', async () => {
      // Create test jobs
      await testPool.query(
        `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
         VALUES ($1, $2, $3, $4, $5)`,
        ['test-user-id', 'test-tenant-id', 'Test story', ['validation'], 'completed']
      );

      const res = await request(app)
        .get('/api/v1/jobs')
        .expect(200);

      expect(res.body.jobs).toHaveLength(1);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/v1/jobs?status=completed')
        .expect(200);

      expect(res.body.jobs.every(j => j.status === 'completed')).toBe(true);
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should return job details', async () => {
      const { rows } = await testPool.query(
        `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['test-user-id', 'test-tenant-id', 'Test', ['validation'], 'queued']
      );

      const res = await request(app)
        .get(`/api/v1/jobs/${rows[0].id}`)
        .expect(200);

      expect(res.body.id).toBe(rows[0].id);
      expect(res.body.story).toBe('Test');
    });

    it('should return 404 for non-existent job', async () => {
      await request(app)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should not return other users jobs', async () => {
      const { rows } = await testPool.query(
        `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['other-user', 'other-tenant', 'Test', ['validation'], 'queued']
      );

      await request(app)
        .get(`/api/v1/jobs/${rows[0].id}`)
        .expect(404); // Treated as not found for security
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should cancel a queued job', async () => {
      const { rows } = await testPool.query(
        `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['test-user-id', 'test-tenant-id', 'Test', ['validation'], 'queued']
      );

      const res = await request(app)
        .delete(`/api/v1/jobs/${rows[0].id}`)
        .expect(200);

      expect(res.body.status).toBe('cancelled');
    });

    it('should not cancel completed jobs', async () => {
      const { rows } = await testPool.query(
        `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['test-user-id', 'test-tenant-id', 'Test', ['validation'], 'completed']
      );

      await request(app)
        .delete(`/api/v1/jobs/${rows[0].id}`)
        .expect(404);
    });
  });
});
```

### SSE Streaming Tests

```typescript
// tests/api/routes/jobs-stream.test.ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { testPool } from '../setup';

describe('Job Streaming', () => {
  const app = createApp();

  it('should return JSON for completed jobs', async () => {
    const { rows } = await testPool.query(
      `INSERT INTO jobs (user_id, tenant_id, story, iterations, status, result)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      ['test-user-id', 'test-tenant-id', 'Test', ['validation'], 'completed', '{"enhanced": "story"}']
    );

    const res = await request(app)
      .get(`/api/v1/jobs/${rows[0].id}/stream`)
      .set('Accept', 'text/event-stream')
      .expect(200);

    expect(res.body.status).toBe('completed');
    expect(res.body.result).toBeDefined();
  });

  it('should return SSE for processing jobs', async () => {
    const { rows } = await testPool.query(
      `INSERT INTO jobs (user_id, tenant_id, story, iterations, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['test-user-id', 'test-tenant-id', 'Test', ['validation'], 'processing']
    );

    const res = await request(app)
      .get(`/api/v1/jobs/${rows[0].id}/stream`)
      .set('Accept', 'text/event-stream')
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    // SSE response should include connected event
    expect(res.text).toContain('event: connected');
  });
});
```

### Integration Test

```typescript
// tests/api/integration/job-lifecycle.test.ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../src/api/app';
import { workerPool } from '../../../src/worker/worker-pool';

describe('Job Lifecycle Integration', () => {
  const app = createApp();

  it('should process job from creation to completion', async () => {
    // Create job
    const createRes = await request(app)
      .post('/api/v1/jobs')
      .send({
        story: 'As a user, I want to log in',
        iterations: ['validation'],
      })
      .expect(201);

    const jobId = createRes.body.job.id;

    // Wait for processing (with timeout)
    let status = 'queued';
    const maxAttempts = 30;

    for (let i = 0; i < maxAttempts && status !== 'completed'; i++) {
      await new Promise(r => setTimeout(r, 1000));

      const statusRes = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .expect(200);

      status = statusRes.body.status;

      if (status === 'failed') {
        throw new Error(`Job failed: ${statusRes.body.error?.message}`);
      }
    }

    expect(status).toBe('completed');

    // Verify result
    const resultRes = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .expect(200);

    expect(resultRes.body.result).toBeDefined();
    expect(resultRes.body.result.enhancedStory).toBeDefined();
    expect(resultRes.body.result.tokenUsage).toBeDefined();
  }, 60000); // 60 second timeout
});
```

## Verification

```bash
# Run API tests
npm run test:api

# Run with coverage
npm run test:api -- --coverage

# Run specific test file
npm run test:api -- tests/api/routes/jobs.test.ts

# Run in watch mode
npm run test:api -- --watch
```

## Notes

- Tests use isolated test database
- Mocking used for external services (Claude API)
- Integration tests may require longer timeouts
- Coverage threshold set to 80%
- SSE testing requires special handling
- Clean database between tests for isolation
