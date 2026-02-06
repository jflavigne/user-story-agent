# User Story Agent: Enterprise Deployment Plan

> **Status: Planned** – The current codebase is CLI/library only. This document describes a future API service deployment (Express, PostgreSQL, Azure). The existing app has no Express or PostgreSQL dependencies.

## Overview

Deploy the user-story-agent as an enterprise-ready HTTP API service with:
- OpenWebUI integration via OpenAPI
- Azure Container Apps deployment
- Multi-tenant security for digital agency use
- Comprehensive observability and cost tracking

## Research Summary

### Sources Consulted
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) - Error handling, retries
- [Claude API Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) - Tier system, token buckets
- [OpenWebUI OpenAPI Servers](https://docs.openwebui.com/features/plugin/tools/openapi-servers/) - Integration requirements
- [Azure Container Apps Security](https://learn.microsoft.com/en-us/azure/container-apps/secure-deployment) - Zero Trust, VNet
- [AI Agent Security 2026](https://www.mintmcp.com/blog/ai-agent-security) - Best practices
- [OpenLLMetry](https://github.com/traceloop/openllmetry) - LLM observability with OpenTelemetry

### Key Findings

1. **OpenWebUI** expects OpenAPI 3.0 spec, supports SSE streaming, works with JWT/API keys
2. **Azure** recommends Managed Identity for Key Vault, VNet isolation, API Management gateway
3. **Anthropic** uses token bucket rate limiting, provides rate limit headers
4. **Security** requires Just-in-Time permissions, per-user quotas, audit trails

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         OpenWebUI                                 │
│                    (Frontend / Chat UI)                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │ OpenAPI Calls (HTTPS)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Azure API Management                           │
│  • JWT validation (Azure Entra ID)                               │
│  • Rate limiting policies                                        │
│  • Request logging                                               │
└────────────────────────────┬─────────────────────────────────────┘
                             │ VNet Internal
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Azure Container Apps                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  user-story-agent HTTP API                                  │  │
│  │  • Express server with SSE streaming                        │  │
│  │  • Per-user rate limiting (Redis)                           │  │
│  │  • Usage/cost tracking                                      │  │
│  │  • Audit logging                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                             │                                     │
│                   Managed Identity                                │
└─────────────────────────────┼────────────────────────────────────┘
                              ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Azure Key Vault │    │  App Insights   │    │  Redis Cache    │
│  (Anthropic Key) │    │  (Telemetry)    │    │  (Rate Limits)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## New Components

### 1. HTTP API Layer (`src/api/`)

| File | Purpose |
|------|---------|
| `server.ts` | Express app setup with middleware |
| `routes/iterations.ts` | `POST /api/v1/iterations/run` |
| `routes/workflow.ts` | `POST /api/v1/workflow/run` |
| `routes/usage.ts` | `GET /api/v1/usage` |
| `middleware/auth.ts` | JWT/API key validation |
| `middleware/rate-limit.ts` | Per-user rate limiting |
| `middleware/audit.ts` | Request/response logging |
| `sse/stream-adapter.ts` | EventEmitter → SSE bridge |
| `openapi/spec.ts` | OpenAPI 3.0 specification |

### 2. Authentication (`src/auth/`)

| File | Purpose |
|------|---------|
| `jwt.ts` | Azure Entra ID JWT verification |
| `api-key.ts` | Service account API key validation |
| `context.ts` | User context (userId, tenantId, quotaTier) |

### 3. Quota & Cost Tracking (`src/quota/`)

| File | Purpose |
|------|---------|
| `tracker.ts` | Token usage per user/tenant |
| `limits.ts` | Tier definitions (free/pro/enterprise) |
| `cost-calculator.ts` | USD cost from token counts |

### 4. Observability (`src/observability/`)

| File | Purpose |
|------|---------|
| `telemetry.ts` | OpenTelemetry + Azure Monitor |
| `metrics.ts` | Custom LLM metrics |
| `audit-logger.ts` | Structured audit events |

### 5. Azure Integration (`src/config/`)

| File | Purpose |
|------|---------|
| `azure-keyvault.ts` | Anthropic API key from Key Vault |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness (checks Key Vault) |
| GET | `/openapi.json` | OpenAPI spec for OpenWebUI |
| GET | `/api/v1/iterations` | List available iterations |
| POST | `/api/v1/iterations/run` | Run specific iterations |
| POST | `/api/v1/workflow/run` | Run full workflow |
| GET | `/api/v1/usage` | Get user's usage stats |

### Request Example

```json
POST /api/v1/iterations/run
Authorization: Bearer <jwt>

{
  "story": "As a user, I want to log in...",
  "iterations": ["validation", "accessibility"],
  "options": {
    "streaming": true,
    "verify": true
  }
}
```

### Response (SSE stream)

```
event: start
data: {"type":"start","iterationId":"validation","timestamp":"..."}

event: chunk
data: {"type":"chunk","iterationId":"validation","content":"..."}

event: complete
data: {"type":"complete","iterationId":"validation","tokenUsage":{"input":2095,"output":1280}}
```

---

## Security Measures

### Authentication
- **Azure Entra ID** for user authentication (JWT)
- **API Keys** for service accounts (hashed, stored in DB)
- Tokens validated on every request

### Authorization
- **Quota Tiers**: free (50 req/day), pro (500), enterprise (5000)
- **Per-user rate limiting**: Configurable RPM per tier
- **Tenant isolation**: Users only see their own usage

### API Key Management
- Anthropic key in **Azure Key Vault**
- Accessed via **Managed Identity** (no secrets in code)
- Automatic rotation support

### Abuse Prevention
- Input sanitization (max length, pattern detection)
- Daily/monthly token quotas per user
- Anomaly alerts (unusual usage patterns)
- Full audit trail for compliance

### Network Security
- VNet integration (no public endpoint for Container App)
- API Management as gateway
- HTTPS only, TLS 1.3

---

## Quota Tiers

| Tier | Requests/Day | Tokens/Day | Max Story | Max Iterations |
|------|--------------|------------|-----------|----------------|
| Free | 50 | 100K | 10KB | 3 |
| Pro | 500 | 1M | 30KB | 6 |
| Enterprise | 5000 | 10M | 50KB | 12 |

---

## Cost Tracking

```typescript
const MODEL_PRICING = {
  'claude-sonnet-4-20250514': {
    inputPer1M: 3.00,   // $3/1M input tokens
    outputPer1M: 15.00, // $15/1M output tokens
  },
};

// Usage record stored per request
interface UsageRecord {
  requestId: string;
  userId: string;
  tenantId: string;
  timestamp: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  iterationsRun: string[];
  durationMs: number;
}
```

---

## New Dependencies

```json
{
  "dependencies": {
    "@azure/identity": "^4.0.0",
    "@azure/keyvault-secrets": "^4.8.0",
    "@azure/monitor-opentelemetry": "^1.3.0",
    "@opentelemetry/sdk-node": "^0.48.0",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "rate-limiter-flexible": "^5.0.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "jwks-rsa": "^3.1.0"
  }
}
```

---

## Implementation Phases

### Phase 1: HTTP API Foundation (1-2 weeks)
- Express server with middleware stack
- Health endpoints
- OpenAPI spec generation
- SSE streaming adapter
- Basic request validation

### Phase 2: Authentication (1 week)
- Azure Entra ID JWT verification
- API key validation
- Auth middleware
- User context extraction

### Phase 3: Rate Limiting & Quotas (1 week)
- Redis-based rate limiter
- Quota tier definitions
- Usage tracking
- Cost calculator

### Phase 4: Observability (1 week)
- OpenTelemetry setup
- Custom LLM metrics
- Audit logging
- Usage dashboards

### Phase 5: Azure Infrastructure (1 week)
- Bicep/Terraform templates
- Key Vault integration
- Container Apps deployment
- API Management configuration

### Phase 6: Security Hardening (1 week)
- Input sanitization
- Penetration testing
- Anomaly detection
- Documentation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/agent/claude-client.ts` | Accept API key via dependency injection |
| `src/index.ts` | Export new API server and modules |
| `package.json` | Add new dependencies |

---

## New Files Summary

- **API Layer**: 12 files in `src/api/`
- **Auth**: 3 files in `src/auth/`
- **Quota**: 3 files in `src/quota/`
- **Observability**: 3 files in `src/observability/`
- **Config**: 1 file in `src/config/`
- **Infrastructure**: `Dockerfile`, `docker-compose.yml`, `infra/main.bicep`
- **Tests**: 6 new test files

---

## Verification

1. **Local Testing**
   ```bash
   docker-compose up  # Redis + API
   curl http://localhost:3000/health
   curl http://localhost:3000/openapi.json
   ```

2. **Integration Test**
   ```bash
   npm run test:api
   ```

3. **OpenWebUI Integration**
   - Add tool server URL in OpenWebUI settings
   - Test with sample user story

4. **Azure Deployment**
   ```bash
   az deployment group create -g rg-usa-prod -f infra/main.bicep
   ```

---

## User Requirements (Confirmed)

| Requirement | Choice | Notes |
|-------------|--------|-------|
| **Auth Provider** | OneLogin (OIDC) + Azure Entra ID | Generic OIDC support for flexibility |
| **Data Storage** | PostgreSQL (Azure Flexible) | Usage records, quotas, API keys |
| **Monitoring** | Application Insights | Azure-native, simple setup |
| **Scale** | Small (< 50 users) | Single container, minimal infrastructure |

### OneLogin Integration Notes

OneLogin supports standard OIDC, so we'll implement:
1. **Generic OIDC JWT validation** using `jwks-rsa` to fetch public keys
2. Configure OIDC discovery URL: `https://<tenant>.onelogin.com/oidc/2/.well-known/openid-configuration`
3. Validate `iss`, `aud`, `exp` claims
4. Extract user info from `sub`, `email`, `groups` claims
5. **Fallback to Azure Entra ID** if needed (same OIDC flow, different issuer)

### PostgreSQL Schema

```sql
-- Usage tracking
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  request_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model VARCHAR(100) NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  iterations_run TEXT[] NOT NULL,
  duration_ms INTEGER NOT NULL,
  CONSTRAINT idx_usage_user_time UNIQUE (user_id, timestamp)
);

-- API keys for service accounts
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) NOT NULL UNIQUE,
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
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Indexes
CREATE INDEX idx_usage_tenant ON usage_records(tenant_id);
CREATE INDEX idx_usage_date ON usage_records(timestamp);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
```

### Simplified Architecture (Small Scale)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  OpenWebUI   │────▶│  Container   │────▶│  Azure PostgreSQL    │
│  (Frontend)  │     │  App (1-3)   │     │  (Flexible, Burstable)│
└──────────────┘     └──────┬───────┘     └──────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
      ┌──────────────┐ ┌──────────┐ ┌──────────────┐
      │  Key Vault   │ │ App      │ │ OneLogin     │
      │ (API Key)    │ │ Insights │ │ (OIDC)       │
      └──────────────┘ └──────────┘ └──────────────┘
```

**Simplified for < 50 users:**
- No Redis needed (in-memory rate limiting with sliding window)
- No API Management (direct Container App ingress with auth middleware)
- Single container replica (scale to 3 max if needed)
- Burstable PostgreSQL tier (~$15/month)

---

## Additional Considerations

### 1. Mockup File Storage

Users will submit mockups (images, PDFs, Figma exports) along with stories.

**Architecture:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  OpenWebUI   │────▶│  Container   │────▶│  Azure Blob Storage  │
│  (Upload)    │     │  App         │     │  (mockups container) │
└──────────────┘     └──────────────┘     └──────────────────────┘
```

**Implementation:**
- **Azure Blob Storage** with SAS tokens for secure uploads
- **Container**: `mockups/{tenant_id}/{job_id}/`
- **Retention**: 30 days (configurable per tenant)
- **Max file size**: 10MB per file, 50MB per request
- **Supported formats**: PNG, JPG, PDF, SVG

**New Files:**
| File | Purpose |
|------|---------|
| `src/storage/blob-client.ts` | Azure Blob Storage wrapper |
| `src/storage/upload-handler.ts` | Multipart upload processing |
| `src/api/routes/uploads.ts` | `POST /api/v1/uploads` endpoint |

**API Flow:**
1. Client requests upload URL: `POST /api/v1/uploads/presigned`
2. Server returns SAS URL for direct-to-blob upload
3. Client uploads directly to Blob Storage
4. Client submits job with blob references: `POST /api/v1/workflow/run`
5. Agent downloads mockups, processes with vision API

**PostgreSQL Addition:**
```sql
CREATE TABLE job_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  file_name VARCHAR(255) NOT NULL,
  blob_path VARCHAR(500) NOT NULL,
  content_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 2. OpenWebUI Streaming UI Requirements

OpenWebUI expects **Server-Sent Events (SSE)** for real-time feedback.

**SSE Event Structure:**
```typescript
// Events that OpenWebUI can render progressively
interface StreamEvents {
  // Job started
  { event: 'start', data: { jobId, totalIterations, estimatedTime } }

  // Iteration progress
  { event: 'iteration:start', data: { iteration, name, index, total } }
  { event: 'iteration:progress', data: { iteration, chunk, accumulated } }
  { event: 'iteration:complete', data: { iteration, tokenUsage, duration } }

  // Mockup analysis (if files attached)
  { event: 'mockup:analyzing', data: { fileName, progress } }
  { event: 'mockup:complete', data: { fileName, insights } }

  // Final result
  { event: 'complete', data: { jobId, enhancedStory, summary, cost } }

  // Error
  { event: 'error', data: { code, message, retryable } }
}
```

**OpenWebUI Tool Response Format:**
```json
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": [
    {
      "type": "text",
      "text": "Enhanced user story with 5 iterations applied..."
    }
  ],
  "is_error": false
}
```

**UI Considerations:**
- **Progressive rendering**: Send partial content as it's generated
- **Status indicators**: Show which iteration is running (1/5, 2/5, etc.)
- **Cost display**: Show token usage and estimated cost in real-time
- **Cancel support**: Allow user to cancel long-running jobs

**New SSE Endpoint:**
```
GET /api/v1/jobs/{jobId}/stream
Accept: text/event-stream

→ Returns SSE stream until job completes or errors
```

---

### 3. Concurrent Story Submissions

Users may submit multiple stories simultaneously.

**Job Queue Architecture:**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Request │────▶│  Job Queue   │────▶│  Worker Pool │
│  (async)     │     │  (PostgreSQL)│     │  (in-process)│
└──────────────┘     └──────────────┘     └──────────────┘
         │                                        │
         ▼                                        ▼
    Job ID returned                     Process iterations
    immediately                          Update job status
```

**Job States:**
```typescript
type JobStatus =
  | 'queued'      // Waiting to start
  | 'processing'  // Running iterations
  | 'completed'   // Successfully finished
  | 'failed'      // Error occurred
  | 'cancelled';  // User cancelled

interface Job {
  id: string;
  userId: string;
  tenantId: string;
  status: JobStatus;
  story: string;
  mockupFiles: string[];
  iterations: string[];
  options: JobOptions;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: AgentResult;
  error?: { code: string; message: string };
}
```

**PostgreSQL Jobs Table:**
```sql
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

  -- Concurrency control
  worker_id VARCHAR(255),
  locked_until TIMESTAMPTZ
);

CREATE INDEX idx_jobs_user ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_pending ON jobs(status, created_at) WHERE status = 'queued';
```

**Concurrency Limits:**
| Tier | Max Concurrent Jobs | Queue Depth |
|------|---------------------|-------------|
| Free | 1 | 3 |
| Pro | 3 | 10 |
| Enterprise | 10 | 50 |

**New API Endpoints:**
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/jobs` | Create job (returns immediately) |
| GET | `/api/v1/jobs/{id}` | Get job status |
| GET | `/api/v1/jobs/{id}/stream` | SSE stream for job |
| DELETE | `/api/v1/jobs/{id}` | Cancel job |
| GET | `/api/v1/jobs` | List user's jobs |

**Worker Implementation:**
```typescript
// src/worker/job-processor.ts
class JobProcessor {
  private concurrency: number = 3; // Max parallel jobs per instance
  private running: Map<string, AbortController> = new Map();

  async start() {
    while (true) {
      // Poll for queued jobs (with row-level locking)
      const job = await this.claimNextJob();
      if (job) {
        this.processJob(job); // Non-blocking
      } else {
        await sleep(1000); // No jobs, wait
      }
    }
  }

  private async claimNextJob(): Promise<Job | null> {
    // Use SELECT FOR UPDATE SKIP LOCKED for safe concurrency
    return db.query(`
      UPDATE jobs
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
      RETURNING *
    `, [this.workerId]);
  }
}
```

**Cancellation Support:**
- User sends `DELETE /api/v1/jobs/{id}`
- Worker checks cancellation flag between iterations
- Aborts Claude API call if in progress
- Updates job status to 'cancelled'

---

## Updated File List

### Additional New Files

| Path | Purpose |
|------|---------|
| `src/storage/blob-client.ts` | Azure Blob Storage client |
| `src/storage/upload-handler.ts` | Multipart file processing |
| `src/api/routes/uploads.ts` | Upload endpoints |
| `src/api/routes/jobs.ts` | Job CRUD endpoints |
| `src/worker/job-processor.ts` | Background job processing |
| `src/worker/job-queue.ts` | PostgreSQL-based queue |
| `src/db/migrations/001_initial.sql` | Database schema |
| `src/db/client.ts` | PostgreSQL connection pool |

### Updated Dependencies

```json
{
  "dependencies": {
    "@azure/storage-blob": "^12.17.0",
    "pg": "^8.11.3",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9",
    "@types/multer": "^1.4.11"
  }
}
```

---

## Revised Implementation Phases

### Phase 1: HTTP API Foundation (1-2 weeks)
- Express server with middleware
- Health endpoints
- OpenAPI spec
- **Job creation and status endpoints**
- **SSE streaming for jobs**

### Phase 2: Database & Storage (1 week)
- **PostgreSQL schema and migrations**
- **Azure Blob Storage for mockups**
- **Presigned URL generation**

### Phase 3: Authentication (1 week)
- OneLogin OIDC + Azure Entra ID
- API key validation
- User context extraction

### Phase 4: Job Processing (1-2 weeks)
- **Job queue with PostgreSQL**
- **Worker pool for concurrent processing**
- **Cancellation support**
- Per-user concurrency limits

### Phase 5: Observability & Quotas (1 week)
- OpenTelemetry + App Insights
- Usage tracking
- Cost calculator
- Quota enforcement

### Phase 6: Azure Deployment (1 week)
- Container Apps with Managed Identity
- Key Vault, Blob Storage, PostgreSQL
- Infrastructure as Code (Bicep)
