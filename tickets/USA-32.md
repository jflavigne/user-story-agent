# USA-32: Database Schema & Migrations

**Epic:** USA - User Story Agent
**Type:** Infrastructure
**Priority:** High
**Status:** Ready
**Dependencies:** USA-31

## Description

Create the PostgreSQL database schema for the enterprise API, including tables for jobs, usage tracking, API keys, and daily usage aggregates. Implement a simple migration system.

## Problem Statement

- No persistent storage for job queue and results
- No way to track API usage per user/tenant
- No storage for API keys (service accounts)
- No quota enforcement without usage aggregates

## Acceptance Criteria

- [ ] Create `jobs` table for async job queue with status tracking
- [ ] Create `job_files` table for mockup file references
- [ ] Create `usage_records` table for per-request token usage
- [ ] Create `api_keys` table for service account authentication
- [ ] Create `daily_usage` table for quota enforcement aggregates
- [ ] Create indexes for common query patterns
- [ ] Implement simple migration runner (up/down)
- [ ] Create initial migration file (001_initial.sql)
- [ ] Support rollback with down migration
- [ ] Add migration tracking table

## Files

### New Directory Structure
```
src/db/
├── migrations/
│   └── 001_initial.sql
├── migrate.ts
└── schema.ts
```

### New Files
- `src/db/migrations/001_initial.sql` - Initial schema DDL
- `src/db/migrate.ts` - Migration runner script
- `src/db/schema.ts` - TypeScript types matching schema

## Technical Notes

### Schema Design

```sql
-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs table for async processing
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  story TEXT NOT NULL,
  iterations TEXT[] NOT NULL,
  options JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error JSONB,
  worker_id VARCHAR(255),
  locked_until TIMESTAMPTZ
);

-- Job files (mockup references)
CREATE TABLE job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  blob_path VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usage tracking per request
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  request_id VARCHAR(255) NOT NULL,
  job_id UUID REFERENCES jobs(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  iterations_run TEXT[] NOT NULL,
  duration_ms INTEGER NOT NULL
);

-- API keys for service accounts
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  quota_tier VARCHAR(50) NOT NULL DEFAULT 'pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Daily usage aggregates for quota enforcement
CREATE TABLE daily_usage (
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  input_tokens BIGINT NOT NULL DEFAULT 0,
  output_tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Indexes
CREATE INDEX idx_jobs_user ON jobs(user_id);
CREATE INDEX idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_pending ON jobs(status, created_at) WHERE status = 'queued';
CREATE INDEX idx_jobs_locked ON jobs(locked_until) WHERE status = 'processing';

CREATE INDEX idx_usage_tenant ON usage_records(tenant_id);
CREATE INDEX idx_usage_date ON usage_records(timestamp);
CREATE INDEX idx_usage_user_date ON usage_records(user_id, timestamp);

CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

### Migration Runner

```typescript
// src/db/migrate.ts
import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

async function migrate(direction: 'up' | 'down' = 'up') {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Ensure migrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = join(__dirname, 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const version = file.replace('.sql', '');
      const { rows } = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [version]
      );

      if (direction === 'up' && rows.length === 0) {
        const sql = await readFile(join(migrationsDir, file), 'utf-8');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [version]
        );
        console.log(`Applied: ${version}`);
      }
      // down migration logic would parse -- DOWN section
    }
  } finally {
    await pool.end();
  }
}

migrate(process.argv[2] as 'up' | 'down');
```

### TypeScript Schema Types

```typescript
// src/db/schema.ts
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  userId: string;
  tenantId: string;
  status: JobStatus;
  story: string;
  iterations: string[];
  options: Record<string, unknown>;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  error?: { code: string; message: string };
  workerId?: string;
  lockedUntil?: Date;
}

export interface JobFile {
  id: string;
  jobId: string;
  fileName: string;
  blobPath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface UsageRecord {
  id: string;
  userId: string;
  tenantId: string;
  requestId: string;
  jobId?: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  iterationsRun: string[];
  durationMs: number;
}

export interface ApiKey {
  id: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  tenantId: string;
  name: string;
  scopes: string[];
  quotaTier: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
}

export interface DailyUsage {
  userId: string;
  date: Date;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}
```

## Verification

```bash
# Start local PostgreSQL (via Docker)
docker run -d --name usa-postgres \
  -e POSTGRES_DB=user_story_agent \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 postgres:15

# Set connection string
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/user_story_agent"

# Run migrations
npm run db:migrate

# Verify tables exist
psql $DATABASE_URL -c "\dt"

# Rollback (if needed)
npm run db:migrate:down
```

## Notes

- gen_random_uuid() requires PostgreSQL 13+ or pgcrypto extension
- JSONB used for flexible options and results storage
- Cascading deletes on job_files when job is deleted
- key_prefix stored for quick API key lookup (first 8 chars)
