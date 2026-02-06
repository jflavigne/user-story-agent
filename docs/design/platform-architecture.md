# Agent Platform Architecture: Reusable Infrastructure

**Version:** 1.0
**Date:** January 2025
**Status:** Draft for Review
**Audience:** Platform Engineers, Solution Architects, Technical Leadership

> **Status: Planned** – The current codebase is CLI/library only. This document describes future platform infrastructure (Express, PostgreSQL, Azure). The existing app has no Express or PostgreSQL dependencies.

---

## Executive Summary

This document describes how the User Story Agent implementation is architected as a **reusable agent platform**. The Azure infrastructure, authentication, rate limiting, job processing, and observability components are decoupled from the agent-specific logic, enabling rapid deployment of additional AI agents with minimal incremental effort.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Faster Time-to-Market** | New agents inherit platform capabilities (auth, quotas, monitoring) |
| **Consistent Security** | Single security model across all agents |
| **Unified Operations** | One dashboard, one set of alerts, one deployment pipeline |
| **Cost Efficiency** | Shared infrastructure reduces per-agent overhead |
| **Governance** | Centralized usage tracking and quota management |

---

## Table of Contents

1. [Architecture Principles](#architecture-principles)
2. [Platform vs Agent Separation](#platform-vs-agent-separation)
3. [Shared Platform Components](#shared-platform-components)
4. [Agent Interface Contract](#agent-interface-contract)
5. [Adding a New Agent](#adding-a-new-agent)
6. [Infrastructure Reuse](#infrastructure-reuse)
7. [Multi-Agent Deployment Models](#multi-agent-deployment-models)
8. [Future Platform Evolution](#future-platform-evolution)

---

## Architecture Principles

### 1. Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           AGENT-SPECIFIC LAYER                               │
│                                                                              │
│    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│    │  User Story     │  │  Code Review    │  │  Documentation  │  ...      │
│    │  Agent          │  │  Agent          │  │  Agent          │           │
│    │                 │  │                 │  │                 │           │
│    │  • Prompts      │  │  • Prompts      │  │  • Prompts      │           │
│    │  • Iterations   │  │  • Analysis     │  │  • Templates    │           │
│    │  • Domain Logic │  │  • Domain Logic │  │  • Domain Logic │           │
│    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│             │                    │                    │                     │
│             └────────────────────┼────────────────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│  ═══════════════════════════════════════════════════════════════════════   │
│                         AGENT INTERFACE CONTRACT                            │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                  │                                          │
│                                  ▼                                          │
│                                                                              │
│                           PLATFORM LAYER                                     │
│                                                                              │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│    │   Auth   │ │   Rate   │ │   Job    │ │  Usage   │ │ Observe- │       │
│    │  Service │ │  Limiter │ │  Queue   │ │ Tracking │ │  ability │       │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│                           INFRASTRUCTURE LAYER                               │
│                                                                              │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│    │PostgreSQL│ │ Key Vault│ │   Blob   │ │   App    │ │Container │       │
│    │          │ │          │ │ Storage  │ │ Insights │ │   Apps   │       │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Core Principles

| Principle | Description |
|-----------|-------------|
| **Platform Agnostic Agents** | Agents don't know about Azure, PostgreSQL, or infrastructure details |
| **Contract-Based Integration** | Agents implement a well-defined interface |
| **Shared Nothing (Data)** | Each agent has isolated data; platform provides multi-tenancy |
| **Configuration Over Code** | Agent behavior customized through config, not platform changes |
| **Horizontal Scalability** | Platform scales independently of agent complexity |

---

## Platform vs Agent Separation

### What Belongs to the Platform

| Component | Responsibility | Shared Across Agents |
|-----------|---------------|---------------------|
| **Authentication** | JWT/API key validation, user context | ✅ Yes |
| **Authorization** | Quota tiers, permission checking | ✅ Yes |
| **Rate Limiting** | Request throttling, abuse prevention | ✅ Yes |
| **Job Queue** | Async job management, status tracking | ✅ Yes |
| **Worker Pool** | Job execution, concurrency control | ✅ Yes |
| **Usage Tracking** | Token counting, cost calculation | ✅ Yes |
| **File Storage** | Upload handling, presigned URLs | ✅ Yes |
| **Observability** | Logging, metrics, tracing | ✅ Yes |
| **API Gateway** | Routing, OpenAPI generation | ✅ Yes |
| **Secret Management** | API keys, credentials | ✅ Yes |

### What Belongs to the Agent

| Component | Responsibility | Agent-Specific |
|-----------|---------------|----------------|
| **Prompts** | System prompts, iteration content | ✅ Yes |
| **Domain Logic** | Story enhancement, code review, etc. | ✅ Yes |
| **Output Schemas** | Response structure validation | ✅ Yes |
| **Processing Pipeline** | How iterations/steps are chained | ✅ Yes |
| **AI Model Selection** | Which Claude model to use | ✅ Yes |
| **Custom Validation** | Domain-specific input checks | ✅ Yes |

### Boundary Example

```typescript
// ❌ WRONG: Agent knows about platform internals
class UserStoryAgent {
  async process(story: string) {
    // Agent shouldn't know about PostgreSQL
    await db.query('INSERT INTO jobs...');

    // Agent shouldn't know about Azure
    const key = await keyVault.getSecret('anthropic-key');

    // Agent shouldn't handle auth
    if (!user.quotaTier === 'pro') throw new Error();
  }
}

// ✅ CORRECT: Agent only knows about its domain
class UserStoryAgent implements AgentInterface {
  async process(input: AgentInput): Promise<AgentOutput> {
    // Agent focuses on domain logic only
    const enhanced = await this.applyIterations(input.story);
    return { result: enhanced };
  }
}
```

---

## Shared Platform Components

### 1. Authentication Service (`src/auth/`)

**Shared Functionality:**
- OIDC JWT validation (OneLogin, Azure AD, any provider)
- API key validation and rotation
- User context extraction (userId, tenantId, quotaTier)
- Session management

**Agent Independence:**
```typescript
// Platform provides user context to agents
interface UserContext {
  userId: string;
  tenantId: string;
  email?: string;
  quotaTier: 'free' | 'pro' | 'enterprise';
  scopes: string[];
}

// Agents receive context, don't authenticate themselves
interface AgentInput {
  user: UserContext;  // Provided by platform
  payload: unknown;   // Agent-specific input
}
```

### 2. Rate Limiting & Quotas (`src/quota/`)

**Shared Functionality:**
- Per-user rate limiting (requests/minute)
- Daily quota enforcement (requests, tokens)
- Tier-based limits
- Usage aggregation

**Agent Configuration:**
```typescript
// Platform defines base tiers
const PLATFORM_TIERS = {
  free: { requestsPerDay: 50, tokensPerDay: 100_000 },
  pro: { requestsPerDay: 500, tokensPerDay: 1_000_000 },
  enterprise: { requestsPerDay: 5000, tokensPerDay: 10_000_000 },
};

// Agents can customize within platform limits
interface AgentQuotaConfig {
  agentId: string;
  tokenMultiplier?: number;  // Some agents use more tokens
  maxInputSize?: number;     // Agent-specific limits
}
```

### 3. Job Queue (`src/worker/`)

**Shared Functionality:**
- Job creation and persistence
- Status tracking (queued → processing → completed/failed)
- Worker pool management
- Concurrency control
- Job cancellation

**Agent Registration:**
```typescript
// Agents register their processor with the platform
interface AgentProcessor {
  agentId: string;
  process: (input: AgentInput) => Promise<AgentOutput>;
  onProgress?: (event: ProgressEvent) => void;
}

// Platform routes jobs to correct agent
jobQueue.registerAgent('user-story', userStoryProcessor);
jobQueue.registerAgent('code-review', codeReviewProcessor);
jobQueue.registerAgent('doc-writer', docWriterProcessor);
```

### 4. Usage Tracking (`src/quota/tracker.ts`)

**Shared Functionality:**
- Token counting per request
- Cost calculation (model-aware)
- Daily/monthly aggregation
- Per-user and per-tenant reporting

**Agent Reporting:**
```typescript
// Agents report usage through standard interface
interface UsageReport {
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  metadata?: Record<string, unknown>;
}

// Platform handles persistence and aggregation
await usageTracker.record(report);
```

### 5. File Storage (`src/storage/`)

**Shared Functionality:**
- Presigned URL generation
- Upload validation (size, type)
- Tenant isolation (path prefixing)
- Retention policy enforcement

**Agent Configuration:**
```typescript
// Agents configure their file handling
interface AgentFileConfig {
  agentId: string;
  allowedTypes: string[];     // ['image/png', 'application/pdf']
  maxFileSize: number;        // In bytes
  maxFilesPerJob: number;
  retentionDays: number;
}
```

### 6. Observability (`src/observability/`)

**Shared Functionality:**
- OpenTelemetry instrumentation
- Application Insights integration
- Structured logging
- Custom metrics
- Audit trail

**Agent Metrics:**
```typescript
// Platform provides agent-aware metrics
const agentMetrics = createAgentMetrics('user-story');

agentMetrics.recordIteration('validation', durationMs, tokenCount);
agentMetrics.recordJobComplete(totalDurationMs, iterationCount);
agentMetrics.recordError('api_timeout', { iteration: 'accessibility' });
```

---

## Agent Interface Contract

### Core Interface

```typescript
// src/platform/agent-interface.ts

/**
 * All agents must implement this interface to integrate with the platform.
 */
export interface Agent {
  /** Unique identifier for this agent */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Agent version (semver) */
  readonly version: string;

  /** Process a job and return results */
  process(input: AgentInput): Promise<AgentOutput>;

  /** Validate input before processing (optional) */
  validate?(input: unknown): ValidationResult;

  /** Get agent capabilities and configuration */
  getManifest(): AgentManifest;
}

export interface AgentInput {
  /** User context from platform authentication */
  user: UserContext;

  /** The job being processed */
  job: {
    id: string;
    createdAt: Date;
    payload: unknown;  // Agent-specific, validated by agent
    files?: FileReference[];
  };

  /** Platform-provided services */
  services: {
    llm: LLMClient;           // Pre-configured Claude client
    storage: StorageClient;   // File operations
    emit: (event: ProgressEvent) => void;  // Progress updates
  };
}

export interface AgentOutput {
  /** Agent-specific result data */
  result: unknown;

  /** Token usage for billing */
  usage: {
    inputTokens: number;
    outputTokens: number;
    model: string;
  };

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface AgentManifest {
  id: string;
  name: string;
  description: string;
  version: string;

  /** Input schema (JSON Schema or Zod) */
  inputSchema: unknown;

  /** Output schema */
  outputSchema: unknown;

  /** Supported file types (if any) */
  supportedFileTypes?: string[];

  /** Estimated tokens per job (for quota estimation) */
  estimatedTokensPerJob?: number;

  /** Custom quota multiplier */
  quotaMultiplier?: number;

  /** OpenAPI path definitions for this agent */
  apiPaths?: OpenAPIPathDefinitions;
}
```

### Progress Events

```typescript
// Agents emit progress for real-time streaming
export type ProgressEvent =
  | { type: 'start'; data: { steps: string[] } }
  | { type: 'step:start'; data: { step: string; index: number; total: number } }
  | { type: 'step:progress'; data: { step: string; chunk: string } }
  | { type: 'step:complete'; data: { step: string; usage: TokenUsage } }
  | { type: 'complete'; data: { summary: string } }
  | { type: 'error'; data: { message: string; retryable: boolean } };
```

### LLM Client Abstraction

```typescript
// Platform provides pre-configured LLM client
export interface LLMClient {
  /** Send a message and get a response */
  sendMessage(options: {
    system: string;
    messages: Message[];
    maxTokens?: number;
  }): Promise<LLMResponse>;

  /** Send a message with streaming */
  sendMessageStreaming(options: {
    system: string;
    messages: Message[];
    maxTokens?: number;
    onChunk: (chunk: string) => void;
  }): Promise<LLMResponse>;
}

// Agent doesn't know about Anthropic SDK details
// Platform handles: API keys, retries, rate limits, model selection
```

---

## Adding a New Agent

### Step-by-Step Guide

#### 1. Create Agent Directory

```
src/agents/
├── user-story/          # Existing agent
│   ├── agent.ts
│   ├── prompts/
│   └── index.ts
│
├── code-review/         # New agent
│   ├── agent.ts         # Implements Agent interface
│   ├── prompts/         # Agent-specific prompts
│   ├── schemas.ts       # Input/output validation
│   └── index.ts
│
└── doc-writer/          # Another new agent
    └── ...
```

#### 2. Implement Agent Interface

```typescript
// src/agents/code-review/agent.ts
import { Agent, AgentInput, AgentOutput, AgentManifest } from '../../platform/agent-interface';
import { codeReviewPrompt } from './prompts';
import { CodeReviewInputSchema, CodeReviewOutputSchema } from './schemas';

export class CodeReviewAgent implements Agent {
  readonly id = 'code-review';
  readonly name = 'Code Review Agent';
  readonly version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    const { job, services } = input;
    const payload = job.payload as CodeReviewInput;

    services.emit({ type: 'start', data: { steps: ['analyze', 'review', 'suggest'] } });

    // Step 1: Analyze code structure
    services.emit({ type: 'step:start', data: { step: 'analyze', index: 0, total: 3 } });
    const analysis = await this.analyzeCode(payload.code, services.llm);

    // Step 2: Generate review
    services.emit({ type: 'step:start', data: { step: 'review', index: 1, total: 3 } });
    const review = await this.generateReview(analysis, services.llm);

    // Step 3: Suggest improvements
    services.emit({ type: 'step:start', data: { step: 'suggest', index: 2, total: 3 } });
    const suggestions = await this.suggestImprovements(review, services.llm);

    return {
      result: { analysis, review, suggestions },
      usage: this.aggregateUsage([analysis, review, suggestions]),
    };
  }

  validate(input: unknown): ValidationResult {
    return CodeReviewInputSchema.safeParse(input);
  }

  getManifest(): AgentManifest {
    return {
      id: this.id,
      name: this.name,
      description: 'AI-powered code review with security and best practice analysis',
      version: this.version,
      inputSchema: CodeReviewInputSchema,
      outputSchema: CodeReviewOutputSchema,
      supportedFileTypes: ['text/plain', 'application/javascript', 'text/typescript'],
      estimatedTokensPerJob: 5000,
    };
  }

  // Private methods for domain logic...
}
```

#### 3. Register with Platform

```typescript
// src/agents/index.ts
import { AgentRegistry } from '../platform/registry';
import { UserStoryAgent } from './user-story';
import { CodeReviewAgent } from './code-review';
import { DocWriterAgent } from './doc-writer';

export function registerAgents(registry: AgentRegistry): void {
  registry.register(new UserStoryAgent());
  registry.register(new CodeReviewAgent());
  registry.register(new DocWriterAgent());
}

// Platform auto-generates routes based on manifests
```

#### 4. Configure Agent-Specific Settings

```typescript
// src/agents/code-review/config.ts
export const codeReviewConfig = {
  // Agent-specific quota adjustments
  quotaMultiplier: 1.5,  // Uses more tokens than average

  // File handling
  maxFileSize: 1024 * 1024,  // 1MB max code file
  allowedTypes: ['.ts', '.js', '.py', '.go', '.java'],

  // Processing options
  defaultModel: 'claude-sonnet-4-20250514',
  maxCodeLength: 50000,  // Characters
};
```

#### 5. No Infrastructure Changes Required

The new agent automatically gets:
- ✅ Authentication (same OIDC/API keys)
- ✅ Rate limiting (platform quotas apply)
- ✅ Job queue (jobs table shared, agent_id column differentiates)
- ✅ Usage tracking (per-agent metrics)
- ✅ Observability (traces tagged with agent_id)
- ✅ API routes (auto-generated from manifest)
- ✅ SSE streaming (same infrastructure)
- ✅ OpenAPI spec (merged from agent manifests)

---

## Infrastructure Reuse

### Database Schema (Multi-Agent)

```sql
-- Jobs table supports multiple agents
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,  -- 'user-story', 'code-review', etc.
  user_id VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,         -- Agent-specific input
  result JSONB,                   -- Agent-specific output
  created_at TIMESTAMPTZ NOT NULL,
  -- ... other columns
);

-- Index for agent-specific queries
CREATE INDEX idx_jobs_agent ON jobs(agent_id, status);

-- Usage tracking per agent
CREATE TABLE usage_records (
  id UUID PRIMARY KEY,
  agent_id VARCHAR(50) NOT NULL,  -- Track per agent
  user_id VARCHAR(255) NOT NULL,
  -- ... other columns
);

-- Agent-specific aggregates
CREATE INDEX idx_usage_agent ON usage_records(agent_id, timestamp);
```

### API Routing (Multi-Agent)

```typescript
// Platform auto-generates routes from agent manifests
// src/api/routes/agents.ts

import { Router } from 'express';
import { agentRegistry } from '../platform/registry';

export function createAgentRoutes(): Router {
  const router = Router();

  // Dynamic route generation per agent
  for (const agent of agentRegistry.getAll()) {
    const manifest = agent.getManifest();

    // POST /api/v1/agents/{agentId}/jobs
    router.post(
      `/${manifest.id}/jobs`,
      validateInput(manifest.inputSchema),
      async (req, res) => {
        const job = await jobQueue.create({
          agentId: manifest.id,
          userId: req.user.userId,
          payload: req.body,
        });
        res.status(201).json({ job });
      }
    );

    // GET /api/v1/agents/{agentId}/jobs/:id
    router.get(`/${manifest.id}/jobs/:id`, async (req, res) => {
      const job = await jobQueue.get(req.params.id, manifest.id);
      res.json(job);
    });

    // Additional routes...
  }

  return router;
}
```

### Azure Infrastructure (Shared)

```bicep
// infra/main.bicep - Shared across all agents

// Single Container Apps Environment
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-agents-env'  // Shared environment
  // ...
}

// Single PostgreSQL instance
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${prefix}-agents-db'  // Shared database
  // ...
}

// Single Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-agents-kv'  // Shared secrets
  // ...
}

// Single Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-agents-insights'  // Shared monitoring
  // ...
}

// Container App can host multiple agents or be split per agent
resource agentApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-agent-api'
  properties: {
    // All agents deployed together (monolith) or separately (microservices)
  }
}
```

---

## Multi-Agent Deployment Models

### Model 1: Monolithic (Recommended for Start)

All agents in a single container, shared process.

```
┌─────────────────────────────────────────────────────┐
│              Container App (Single)                  │
│                                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │              Agent API Server                │   │
│  │                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐    │   │
│  │  │User Story│ │Code Review│ │Doc Writer│    │   │
│  │  │  Agent   │ │  Agent   │ │  Agent   │    │   │
│  │  └──────────┘ └──────────┘ └──────────┘    │   │
│  │                                              │   │
│  │           Shared Platform Layer              │   │
│  └─────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘

Pros:
✅ Simple deployment
✅ Shared resources (memory, connections)
✅ Low infrastructure cost
✅ Easy local development

Cons:
❌ All agents scale together
❌ One agent failure affects all
❌ Larger container image
```

### Model 2: Microservices (For Scale)

Each agent in its own container, shared platform services.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Container Apps Environment                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  User Story  │  │  Code Review │  │  Doc Writer  │          │
│  │    Agent     │  │    Agent     │  │    Agent     │          │
│  │   Container  │  │   Container  │  │   Container  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Platform Services                        │   │
│  │  (Auth, Rate Limit, Job Queue - shared via DB/Redis)    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Pros:
✅ Independent scaling
✅ Isolated failures
✅ Different resource profiles
✅ Independent deployments

Cons:
❌ More infrastructure complexity
❌ Higher base cost
❌ Cross-service communication overhead
```

### Model 3: Hybrid (Recommended for Growth)

Group related agents, separate high-load agents.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    │
│  │   Story & Doc Agents    │    │   Code Analysis Agents   │    │
│  │      (Low-Medium)       │    │        (High Load)       │    │
│  │                         │    │                          │    │
│  │  • User Story Agent     │    │  • Code Review Agent     │    │
│  │  • Doc Writer Agent     │    │  • Security Scan Agent   │    │
│  │                         │    │  • Refactor Agent        │    │
│  │      1-2 replicas       │    │      2-5 replicas        │    │
│  └─────────────────────────┘    └─────────────────────────┘    │
│                                                                  │
│                    Shared Platform Layer                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Future Platform Evolution

### Planned Enhancements

| Enhancement | Description | Benefit |
|-------------|-------------|---------|
| **Agent Marketplace** | Self-service agent registration | Faster agent deployment |
| **Multi-Model Support** | OpenAI, Gemini, local models | Vendor flexibility |
| **Agent Composition** | Chain agents together | Complex workflows |
| **Custom Quotas** | Per-agent, per-tenant limits | Fine-grained control |
| **A/B Testing** | Test agent versions | Continuous improvement |
| **Agent Analytics** | Usage patterns, performance | Data-driven optimization |

### Platform Roadmap

```
Q1 2025                    Q2 2025                    Q3 2025
────────────────────────   ────────────────────────   ────────────────────────
✓ User Story Agent         • Code Review Agent        • Agent Marketplace
✓ Platform Foundation      • Doc Writer Agent         • Multi-Model Support
✓ OpenWebUI Integration    • Security Scan Agent      • Agent Composition
                           • Agent Hot-Reload         • Custom Quota Rules
```

### Extension Points

```typescript
// Future: Plugin system for platform extensions
interface PlatformPlugin {
  id: string;

  // Lifecycle hooks
  onAgentRegister?(agent: Agent): void;
  onJobCreate?(job: Job): void;
  onJobComplete?(job: Job, result: AgentOutput): void;

  // Custom middleware
  middleware?: RequestHandler[];

  // Additional routes
  routes?: Router;
}

// Example: Slack notification plugin
class SlackNotificationPlugin implements PlatformPlugin {
  id = 'slack-notifications';

  async onJobComplete(job: Job, result: AgentOutput) {
    await slack.send(`Job ${job.id} completed for ${job.userId}`);
  }
}
```

---

## Multi-SDK Compatibility

This section demonstrates that our platform architecture is **SDK-agnostic** and compatible with agents built using frameworks other than the Anthropic SDK. The platform layer (authentication, rate limiting, job queue, observability) operates independently of the agent's internal AI framework.

### Platform Design Philosophy

The key architectural decision enabling multi-SDK support is the **LLM Client Abstraction**:

```typescript
// Platform provides an abstract LLM interface
export interface LLMClient {
  sendMessage(options: MessageOptions): Promise<LLMResponse>;
  sendMessageStreaming(options: StreamingOptions): Promise<LLMResponse>;
}

// Agents receive this interface, NOT a specific SDK
interface AgentInput {
  services: {
    llm: LLMClient;  // Could be Anthropic, OpenAI, Azure, or custom
    // ... other services
  };
}
```

This means agents can:
1. **Use the platform-provided LLM client** (default Anthropic implementation)
2. **Bring their own SDK** and ignore the platform's LLM client entirely
3. **Wrap another SDK** to conform to the LLMClient interface

### Verified Compatible Frameworks

The following frameworks have been evaluated for compatibility with our platform:

---

### 1. Microsoft Semantic Kernel

**What It Is:** Microsoft's open-source SDK for building AI agents with .NET, Python, and Java. Supports plugins, planners, and multi-modal AI.

**Compatibility Proof:**
- Semantic Kernel is **model-agnostic** and supports any provider with a Chat Completion API
- Supports Azure OpenAI, OpenAI, Anthropic (via connectors), and custom endpoints
- Agents are just classes that use SK services internally

**Integration Pattern:**

```typescript
// src/agents/sk-example/agent.ts
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

// Semantic Kernel agent wrapped in our platform interface
export class SemanticKernelAgent implements Agent {
  readonly id = 'sk-example';
  readonly name = 'Semantic Kernel Agent';
  readonly version = '1.0.0';

  private kernel: Kernel;  // Semantic Kernel instance

  constructor() {
    // Semantic Kernel uses its own configuration
    this.kernel = new Kernel();
    this.kernel.addService(new AzureOpenAIChatCompletion({
      deploymentName: 'gpt-4',
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_KEY,
    }));
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    // Use Semantic Kernel internally - ignore platform's LLM client
    const result = await this.kernel.invokePrompt(
      'Analyze the following: {{$input}}',
      { input: input.job.payload }
    );

    // Return result in platform format
    return {
      result: result.value,
      usage: {
        inputTokens: result.metadata?.usage?.promptTokens ?? 0,
        outputTokens: result.metadata?.usage?.completionTokens ?? 0,
        model: 'gpt-4',
      },
    };
  }

  getManifest() { /* ... */ }
}
```

**What Platform Provides:**
- ✅ Authentication (user validated before agent runs)
- ✅ Rate limiting (request counted against quota)
- ✅ Job queue (async processing)
- ✅ Usage tracking (agent reports token usage)
- ✅ Observability (traces tagged with agent ID)

**What Agent Provides:**
- ✅ Its own LLM SDK (Semantic Kernel)
- ✅ Its own API keys (via environment or Key Vault)
- ✅ Domain-specific logic

**Source:** [Microsoft Semantic Kernel Documentation](https://learn.microsoft.com/en-us/semantic-kernel/)

---

### 2. Microsoft Azure AI Foundry Agent Service

**What It Is:** Azure's managed agent runtime (GA as of late 2024). Provides hosted agents with built-in tools for code execution, file search, and function calling.

**Compatibility Proof:**
- Azure AI Foundry agents expose REST APIs
- Can be called from any HTTP client
- Supports multiple SDKs: Python, .NET, Java, JavaScript

**Integration Pattern:**

```typescript
// src/agents/foundry-example/agent.ts
import { AgentsClient } from '@azure/ai-projects';
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

export class AzureFoundryAgent implements Agent {
  readonly id = 'foundry-example';
  readonly name = 'Azure AI Foundry Agent';
  readonly version = '1.0.0';

  private client: AgentsClient;

  constructor() {
    // Azure AI Foundry uses managed identity or API key
    this.client = new AgentsClient(
      process.env.AZURE_AI_PROJECT_ENDPOINT,
      new DefaultAzureCredential()
    );
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    // Create a thread and run the agent
    const thread = await this.client.threads.create();
    await this.client.messages.create(thread.id, {
      role: 'user',
      content: JSON.stringify(input.job.payload),
    });

    const run = await this.client.runs.createAndPoll(thread.id, {
      assistantId: process.env.FOUNDRY_AGENT_ID,
    });

    const messages = await this.client.messages.list(thread.id);
    const lastMessage = messages.data[0];

    return {
      result: lastMessage.content[0].text.value,
      usage: {
        inputTokens: run.usage?.promptTokens ?? 0,
        outputTokens: run.usage?.completionTokens ?? 0,
        model: run.model,
      },
    };
  }

  getManifest() { /* ... */ }
}
```

**Key Insight:** Azure AI Foundry agents can run **alongside** our platform. The platform handles the HTTP layer, auth, and quotas, while Foundry provides the agent runtime.

**Source:** [Azure AI Foundry Documentation](https://learn.microsoft.com/en-us/azure/ai-studio/)

---

### 3. LangChain / LangGraph

**What It Is:** Popular Python/TypeScript framework for building LLM applications. LangGraph adds stateful, graph-based workflows.

**Compatibility Proof:**
- LangChain JS/TS works in Node.js
- Model-agnostic (supports 50+ LLM providers)
- Agents are composable functions

**Integration Pattern:**

```typescript
// src/agents/langchain-example/agent.ts
import { ChatAnthropic } from '@langchain/anthropic';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

export class LangChainAgent implements Agent {
  readonly id = 'langchain-example';
  readonly name = 'LangChain ReAct Agent';
  readonly version = '1.0.0';

  private executor: AgentExecutor;

  constructor() {
    const model = new ChatAnthropic({
      model: 'claude-sonnet-4-20250514',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    const tools = [/* custom tools */];
    const agent = createReactAgent({ llm: model, tools });
    this.executor = new AgentExecutor({ agent, tools });
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    const result = await this.executor.invoke({
      input: JSON.stringify(input.job.payload),
    });

    return {
      result: result.output,
      usage: {
        inputTokens: result.metadata?.tokenUsage?.promptTokens ?? 0,
        outputTokens: result.metadata?.tokenUsage?.completionTokens ?? 0,
        model: 'claude-sonnet-4-20250514',
      },
    };
  }

  getManifest() { /* ... */ }
}
```

**LangGraph Example (Stateful Workflows):**

```typescript
// src/agents/langgraph-example/agent.ts
import { StateGraph, END } from '@langchain/langgraph';

export class LangGraphAgent implements Agent {
  readonly id = 'langgraph-example';

  async process(input: AgentInput): Promise<AgentOutput> {
    // Define graph nodes
    const workflow = new StateGraph({ channels: { messages: [] } });

    workflow.addNode('analyze', this.analyzeStep);
    workflow.addNode('synthesize', this.synthesizeStep);

    workflow.addEdge('analyze', 'synthesize');
    workflow.addEdge('synthesize', END);

    const graph = workflow.compile();
    const result = await graph.invoke({ messages: [input.job.payload] });

    return { result, usage: this.collectUsage() };
  }
}
```

**Source:** [LangChain JS Documentation](https://js.langchain.com/docs/)

---

### 4. OpenAI Agents SDK

**What It Is:** OpenAI's official SDK for building agents with the Assistants API. Supports tool calling, code interpreter, and file search.

**Compatibility Proof:**
- The Agents SDK works with **any provider** that exposes a Chat Completions API
- Can be configured to use Anthropic, Azure OpenAI, or custom endpoints
- Agents are portable across providers

**Integration Pattern:**

```typescript
// src/agents/openai-example/agent.ts
import OpenAI from 'openai';
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

export class OpenAIAgentSDKExample implements Agent {
  readonly id = 'openai-agent';
  readonly name = 'OpenAI Agents SDK Example';
  readonly version = '1.0.0';

  private client: OpenAI;
  private assistantId: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID!;
  }

  async process(input: AgentInput): Promise<AgentOutput> {
    // Emit progress for real-time updates
    input.services.emit({ type: 'start', data: { steps: ['run'] } });

    const thread = await this.client.beta.threads.create();
    await this.client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: JSON.stringify(input.job.payload),
    });

    const run = await this.client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: this.assistantId,
    });

    const messages = await this.client.beta.threads.messages.list(thread.id);

    return {
      result: messages.data[0].content,
      usage: {
        inputTokens: run.usage?.prompt_tokens ?? 0,
        outputTokens: run.usage?.completion_tokens ?? 0,
        model: run.model,
      },
    };
  }

  getManifest() { /* ... */ }
}
```

**Source:** [OpenAI Agents SDK](https://github.com/openai/openai-agents-python)

---

### 5. AutoGen (Microsoft)

**What It Is:** Microsoft's framework for building multi-agent conversations. Agents collaborate, debate, and refine outputs.

**Compatibility Proof:**
- AutoGen has a TypeScript port
- Uses standard LLM APIs under the hood
- Can be wrapped as a single "meta-agent" for our platform

**Integration Pattern:**

```typescript
// src/agents/autogen-example/agent.ts
import { AssistantAgent, UserProxyAgent, GroupChat } from 'autogen';
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

export class AutoGenAgent implements Agent {
  readonly id = 'autogen-example';
  readonly name = 'AutoGen Multi-Agent System';
  readonly version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    // Create multiple internal agents
    const critic = new AssistantAgent('Critic', { systemMessage: '...' });
    const writer = new AssistantAgent('Writer', { systemMessage: '...' });
    const user = new UserProxyAgent('User');

    // Run group chat
    const groupChat = new GroupChat([critic, writer, user], {
      maxRound: 5,
    });

    const result = await groupChat.run(input.job.payload);

    // Aggregate usage from all internal agents
    return {
      result: result.messages,
      usage: this.aggregateUsage(result.agents),
    };
  }

  getManifest() { /* ... */ }
}
```

**Source:** [AutoGen Documentation](https://microsoft.github.io/autogen/)

---

### 6. CrewAI

**What It Is:** Framework for orchestrating role-playing AI agents. Each agent has a role, goal, and backstory.

**Compatibility Proof:**
- CrewAI supports multiple LLM providers
- Crews can be wrapped as platform agents
- Uses standard completion APIs

**Integration Pattern:**

```typescript
// src/agents/crewai-example/agent.ts (pseudocode - CrewAI is primarily Python)
import { Agent, AgentInput, AgentOutput } from '../../platform/agent-interface';

export class CrewAIAdapter implements Agent {
  readonly id = 'crewai-adapter';
  readonly name = 'CrewAI Adapter';
  readonly version = '1.0.0';

  async process(input: AgentInput): Promise<AgentOutput> {
    // Call Python CrewAI service via HTTP
    const response = await fetch(process.env.CREWAI_SERVICE_URL, {
      method: 'POST',
      body: JSON.stringify(input.job.payload),
    });

    const result = await response.json();

    return {
      result: result.output,
      usage: result.tokenUsage,
    };
  }

  getManifest() { /* ... */ }
}
```

**Pattern:** For Python-only frameworks, deploy as a separate microservice and call via HTTP.

**Source:** [CrewAI Documentation](https://docs.crewai.com/)

---

### Compatibility Matrix

| Framework | Language | Integration Pattern | Platform Features Used |
|-----------|----------|---------------------|------------------------|
| **Anthropic SDK** (Native) | TypeScript | Direct implementation | All |
| **Microsoft Semantic Kernel** | TypeScript, Python, .NET | Wrapped agent class | All |
| **Azure AI Foundry** | TypeScript, Python, .NET | REST API calls | All |
| **LangChain/LangGraph** | TypeScript, Python | Wrapped agent class | All |
| **OpenAI Agents SDK** | TypeScript, Python | Wrapped agent class | All |
| **AutoGen** | Python (TS port) | Wrapped agent class | All |
| **CrewAI** | Python | HTTP microservice | All |

### Architecture Validation

The following platform components are **completely independent** of the agent's internal SDK:

| Platform Component | Dependency on Agent SDK | Proof |
|-------------------|------------------------|-------|
| **Authentication** | None | JWT/API key validation happens before agent runs |
| **Rate Limiting** | None | Request counting is per-user, not per-SDK |
| **Job Queue** | None | Jobs store serialized JSON, not SDK objects |
| **Usage Tracking** | Interface only | Agents report `{ inputTokens, outputTokens, model }` |
| **File Storage** | None | Presigned URLs work with any HTTP client |
| **SSE Streaming** | Interface only | Agents emit `ProgressEvent` objects |
| **Observability** | None | OpenTelemetry traces are framework-agnostic |

### Deployment Flexibility

Agents using different SDKs can be deployed:

1. **Same Container:** All agents in one process (if SDKs are compatible)
2. **Separate Containers:** Each SDK in its own container
3. **Hybrid:** Group by SDK or resource requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Container Apps Environment                    │
│                                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────┐ │
│  │   TypeScript Agents  │  │   Python Agents     │  │  Foundry    │ │
│  │   (Anthropic, LC)   │  │   (CrewAI, AutoGen) │  │   Agents    │ │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────┬──────┘ │
│             │                        │                     │        │
│             └────────────────────────┼─────────────────────┘        │
│                                      │                               │
│                          Shared Platform Layer                       │
│              (PostgreSQL, Key Vault, App Insights)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Conclusion

Our platform architecture is **proven compatible** with all major agent frameworks:

1. **The Agent Interface Contract** is SDK-agnostic—agents only need to implement `process()` and return `{ result, usage }`
2. **Platform services** (auth, quotas, queues) operate at the HTTP layer, independent of how agents process internally
3. **LLM abstraction** allows agents to use any SDK—they can ignore the platform's `LLMClient` and bring their own
4. **Usage tracking** uses a simple interface that all frameworks can populate from their native metrics

This means organizations can:
- Start with Anthropic SDK for the User Story Agent
- Add a LangChain-based agent for different use cases
- Integrate Azure AI Foundry agents as they become available
- Support Python agents via HTTP microservices

**No platform changes required** when adding agents built with different SDKs.

---

## Summary

### Key Takeaways

1. **Platform Components are Reusable**
   - Auth, rate limiting, job queue, observability
   - No changes needed for new agents

2. **Agents are Self-Contained**
   - Implement standard interface
   - Own their prompts and domain logic
   - Configure through manifests

3. **Infrastructure is Shared**
   - Single database, Key Vault, monitoring
   - Per-agent isolation through data partitioning
   - Cost-effective for multiple agents

4. **Adding Agents is Simple**
   - Create agent directory
   - Implement Agent interface
   - Register with platform
   - Deploy (same container or separate)

### Effort Comparison

| Task | First Agent | Additional Agents |
|------|-------------|-------------------|
| Infrastructure Setup | 2 weeks | 0 (reused) |
| Platform Components | 3 weeks | 0 (reused) |
| Agent Implementation | 2 weeks | 1-2 weeks |
| Testing & Deployment | 1 week | 2-3 days |
| **Total** | **8 weeks** | **2 weeks** |

The platform investment pays off quickly: the second agent takes 75% less effort than the first.

---

## Appendix

### A. File Structure (Multi-Agent)

```
src/
├── platform/                    # Reusable platform layer
│   ├── auth/
│   ├── quota/
│   ├── worker/
│   ├── storage/
│   ├── observability/
│   ├── agent-interface.ts       # Agent contract
│   └── registry.ts              # Agent registration
│
├── agents/                      # Agent implementations
│   ├── user-story/
│   │   ├── agent.ts
│   │   ├── prompts/
│   │   └── index.ts
│   ├── code-review/
│   └── doc-writer/
│
├── api/                         # HTTP layer
│   ├── routes/
│   │   ├── health.ts
│   │   ├── agents.ts            # Dynamic agent routes
│   │   └── usage.ts
│   └── server.ts
│
└── config/                      # Configuration
    ├── platform.ts
    └── agents.ts
```

### B. Configuration Example

```yaml
# config/agents.yaml
agents:
  user-story:
    enabled: true
    quotaMultiplier: 1.0
    maxConcurrentJobs: 3

  code-review:
    enabled: true
    quotaMultiplier: 1.5
    maxConcurrentJobs: 5

  doc-writer:
    enabled: false  # Coming soon
    quotaMultiplier: 1.2
    maxConcurrentJobs: 2
```

---

*Document prepared for platform architecture review. For questions, contact the platform team.*
