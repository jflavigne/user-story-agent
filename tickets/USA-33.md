# USA-33: PostgreSQL Client & Connection Pool

**Epic:** USA - User Story Agent
**Type:** Infrastructure
**Priority:** High
**Status:** Ready
**Dependencies:** USA-32

## Description

Implement a PostgreSQL connection pool with typed query helpers and transaction support. This provides the data access layer for all API database operations.

## Problem Statement

- Need connection pooling for efficient database access
- Raw pg queries return untyped results
- No transaction support for multi-step operations
- Connection string management across environments

## Acceptance Criteria

- [ ] Create connection pool singleton with lazy initialization
- [ ] Support connection string from environment or Azure Key Vault
- [ ] Implement typed query helpers (query, queryOne, queryMany)
- [ ] Implement transaction support with automatic rollback on error
- [ ] Add connection health check for readiness probe
- [ ] Handle connection errors gracefully with retry
- [ ] Support graceful shutdown (drain connections)
- [ ] Log slow queries (> 100ms) for debugging

## Files

### New Files
- `src/db/client.ts` - PostgreSQL client with connection pool
- `src/db/index.ts` - Barrel exports

### Modified Files
- `src/config/index.ts` - Add database configuration

## Technical Notes

### Connection Pool Implementation

```typescript
// src/db/client.ts
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger.js';

let pool: Pool | null = null;

export interface DbConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number; // Max pool size (default: 10)
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function getPool(): Pool {
  if (!pool) {
    const config: DbConfig = {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_SIZE || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // Azure requires SSL
    if (process.env.NODE_ENV === 'production') {
      config.ssl = { rejectUnauthorized: true };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err });
    });

    pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 100) {
    logger.warn('Slow query detected', {
      duration,
      query: text.slice(0, 100),
      rows: result.rowCount,
    });
  }

  return result;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await queryOne<{ now: Date }>('SELECT NOW() as now');
    return result !== null;
  } catch {
    return false;
  }
}

export async function shutdown(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
```

### Barrel Exports

```typescript
// src/db/index.ts
export * from './client.js';
export * from './schema.js';
```

### Configuration Integration

```typescript
// Add to src/config/index.ts or create new file
export interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  ssl: boolean;
}

export function loadDatabaseConfig(): DatabaseConfig {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    connectionString,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    ssl: process.env.NODE_ENV === 'production',
  };
}
```

### Usage Examples

```typescript
// Simple query
const user = await queryOne<{ id: string; name: string }>(
  'SELECT id, name FROM users WHERE id = $1',
  [userId]
);

// Insert with returning
const job = await queryOne<Job>(
  `INSERT INTO jobs (user_id, tenant_id, story, iterations)
   VALUES ($1, $2, $3, $4)
   RETURNING *`,
  [userId, tenantId, story, iterations]
);

// Transaction example
const result = await withTransaction(async (client) => {
  const job = await client.query(
    'INSERT INTO jobs (...) VALUES (...) RETURNING *',
    [...]
  );

  await client.query(
    'INSERT INTO job_files (...) VALUES (...)',
    [job.rows[0].id, ...]
  );

  return job.rows[0];
});
```

## Verification

```bash
# Ensure PostgreSQL is running
docker ps | grep usa-postgres

# Set environment
export DATABASE_URL="postgresql://postgres:dev@localhost:5432/user_story_agent"

# Run typecheck
npm run typecheck

# Run unit tests (mock pool)
npm test -- --grep "db/client"

# Integration test
npm run test:api -- --grep "database"
```

## Notes

- Pool is lazily initialized on first use
- Production requires SSL for Azure PostgreSQL
- Slow query threshold (100ms) is configurable
- Transaction automatically releases client on completion
- Health check used by /ready endpoint
