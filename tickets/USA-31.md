# USA-31: Enterprise API Dependencies & Project Configuration

**Epic:** USA - User Story Agent
**Type:** Infrastructure
**Priority:** High
**Status:** Ready
**Dependencies:** USA-30

## Description

Add all required npm dependencies and update project configuration for the enterprise HTTP API deployment. This is the foundation ticket that enables all subsequent API development.

## Problem Statement

- Current project only has CLI/SDK dependencies
- No HTTP server, database, or Azure SDK packages
- No API-specific npm scripts for development and deployment
- Version needs bump to 0.2.0 to reflect enterprise features

## Acceptance Criteria

- [ ] Add Express.js and middleware dependencies (helmet, cors, multer)
- [ ] Add Azure SDK packages (identity, keyvault-secrets, storage-blob, monitor-opentelemetry)
- [ ] Add OpenTelemetry packages for observability
- [ ] Add PostgreSQL client (pg) and type definitions
- [ ] Add authentication packages (jsonwebtoken, jwks-rsa)
- [ ] Add rate limiting package (rate-limiter-flexible)
- [ ] Add Redis client (ioredis) for distributed rate limiting (optional)
- [ ] Add all required @types/* dev dependencies
- [ ] Add supertest for API testing
- [ ] Add new npm scripts: `dev:api`, `start:api`, `test:api`, `db:migrate`
- [ ] Bump version to 0.2.0
- [ ] Run `npm install` and verify no conflicts

## Files

### Modified Files
- `package.json` - Add dependencies, devDependencies, and scripts

## Technical Notes

### New Dependencies

```json
{
  "dependencies": {
    "@azure/identity": "^4.0.0",
    "@azure/keyvault-secrets": "^4.8.0",
    "@azure/monitor-opentelemetry": "^1.3.0",
    "@azure/storage-blob": "^12.17.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.48.0",
    "@opentelemetry/semantic-conventions": "^1.21.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "jwks-rsa": "^3.1.0",
    "multer": "^1.4.5-lts.1",
    "pg": "^8.11.3",
    "rate-limiter-flexible": "^5.0.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/pg": "^8.10.9",
    "@types/uuid": "^9.0.7",
    "@types/supertest": "^6.0.2",
    "supertest": "^6.3.4"
  }
}
```

### New Scripts

```json
{
  "scripts": {
    "dev:api": "tsx watch src/api/server.ts",
    "start:api": "node dist/api/server.js",
    "test:api": "vitest run --config vitest.config.api.ts",
    "db:migrate": "tsx src/db/migrate.ts",
    "db:migrate:down": "tsx src/db/migrate.ts down"
  }
}
```

## Verification

```bash
# Install dependencies
npm install

# Verify no peer dependency issues
npm ls --depth=0

# Verify TypeScript can resolve types
npm run typecheck

# Verify scripts are defined
npm run dev:api --help 2>&1 | head -1
```

## Notes

- ioredis is included for distributed rate limiting but can be made optional
- Azure packages are required even for local development (fallback to env vars)
- Supertest enables integration testing of Express routes
