# USA-45: Observability (OpenTelemetry + App Insights)

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** Medium
**Status:** Ready
**Dependencies:** USA-34

## Description

Implement comprehensive observability using OpenTelemetry with Azure Application Insights as the backend. Track requests, LLM operations, custom metrics, and structured logging.

## Problem Statement

- No visibility into API performance
- Can't track LLM token usage patterns
- No distributed tracing for debugging
- Need metrics for capacity planning
- Audit requirements for enterprise

## Acceptance Criteria

- [ ] Set up OpenTelemetry SDK with Azure Monitor exporter
- [ ] Auto-instrument Express HTTP requests
- [ ] Create custom spans for agent operations
- [ ] Track LLM-specific metrics (tokens, latency, cost)
- [ ] Implement structured audit logging
- [ ] Add custom metrics (jobs processed, queue depth)
- [ ] Support local console export for development
- [ ] Configure sampling for high-volume production

## Files

### New Directory Structure
```
src/observability/
├── telemetry.ts
├── metrics.ts
├── audit-logger.ts
├── tracing.ts
└── index.ts
```

### New Files
- `src/observability/telemetry.ts` - OpenTelemetry setup
- `src/observability/metrics.ts` - Custom metrics
- `src/observability/audit-logger.ts` - Audit event logging
- `src/observability/tracing.ts` - Custom span helpers
- `src/observability/index.ts` - Barrel exports

## Technical Notes

### OpenTelemetry Setup

```typescript
// src/observability/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import { logger } from '../utils/logger.js';

let sdk: NodeSDK | null = null;

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  azureConnectionString?: string;
  enableConsoleExporter?: boolean;
  samplingRatio?: number;
}

export async function initializeTelemetry(
  config: TelemetryConfig
): Promise<void> {
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment,
  });

  // Azure Monitor configuration
  if (config.azureConnectionString) {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString: config.azureConnectionString,
      },
      resource,
      samplingRatio: config.samplingRatio ?? 1.0,
    });

    logger.info('Azure Monitor telemetry initialized', {
      serviceName: config.serviceName,
      environment: config.environment,
    });
  } else {
    // Local development: use console exporter
    const { ConsoleSpanExporter } = await import('@opentelemetry/sdk-trace-node');
    const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-base');

    sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });

    if (config.enableConsoleExporter) {
      // Add console exporter for debugging
      const exporter = new ConsoleSpanExporter();
      // Note: In real implementation, configure properly
    }

    await sdk.start();
    logger.info('Local telemetry initialized');
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    logger.info('Telemetry shutdown complete');
  }
}
```

### Custom Metrics

```typescript
// src/observability/metrics.ts
import { metrics, Counter, Histogram, Gauge } from '@opentelemetry/api';

const meter = metrics.getMeter('user-story-agent', '1.0.0');

// Request metrics
export const httpRequestDuration = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

export const httpRequestCount = meter.createCounter('http.request.count', {
  description: 'Total HTTP requests',
});

// Job metrics
export const jobsCreated = meter.createCounter('jobs.created', {
  description: 'Total jobs created',
});

export const jobsCompleted = meter.createCounter('jobs.completed', {
  description: 'Total jobs completed',
});

export const jobsFailed = meter.createCounter('jobs.failed', {
  description: 'Total jobs failed',
});

export const jobDuration = meter.createHistogram('jobs.duration', {
  description: 'Job processing duration in milliseconds',
  unit: 'ms',
});

export const jobQueueDepth = meter.createObservableGauge('jobs.queue.depth', {
  description: 'Current number of queued jobs',
});

// LLM metrics
export const llmTokensInput = meter.createCounter('llm.tokens.input', {
  description: 'Total input tokens consumed',
});

export const llmTokensOutput = meter.createCounter('llm.tokens.output', {
  description: 'Total output tokens generated',
});

export const llmCostUsd = meter.createCounter('llm.cost.usd', {
  description: 'Total LLM cost in USD',
});

export const llmLatency = meter.createHistogram('llm.latency', {
  description: 'LLM API call latency in milliseconds',
  unit: 'ms',
});

// User metrics
export const activeUsers = meter.createObservableGauge('users.active', {
  description: 'Number of active users in last 24h',
});

// Helper functions
export function recordJobMetrics(
  status: 'completed' | 'failed',
  durationMs: number,
  userId: string,
  tier: string
): void {
  const attributes = { user_tier: tier };

  if (status === 'completed') {
    jobsCompleted.add(1, attributes);
  } else {
    jobsFailed.add(1, attributes);
  }

  jobDuration.record(durationMs, attributes);
}

export function recordLlmMetrics(
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  latencyMs: number,
  model: string
): void {
  const attributes = { model };

  llmTokensInput.add(inputTokens, attributes);
  llmTokensOutput.add(outputTokens, attributes);
  llmCostUsd.add(costUsd, attributes);
  llmLatency.record(latencyMs, attributes);
}
```

### Audit Logger

```typescript
// src/observability/audit-logger.ts
import { logger } from '../utils/logger.js';

export interface AuditEvent {
  eventType: string;
  userId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  outcome: 'success' | 'failure';
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export function logAuditEvent(event: AuditEvent): void {
  logger.info('AUDIT', {
    audit: true,
    ...event,
    timestamp: new Date().toISOString(),
  });
}

// Convenience functions
export function auditJobCreated(
  userId: string,
  tenantId: string,
  jobId: string,
  iterations: string[]
): void {
  logAuditEvent({
    eventType: 'job.created',
    userId,
    tenantId,
    resourceType: 'job',
    resourceId: jobId,
    action: 'create',
    outcome: 'success',
    details: { iterations },
  });
}

export function auditJobCompleted(
  userId: string,
  tenantId: string,
  jobId: string,
  tokenUsage: { input: number; output: number }
): void {
  logAuditEvent({
    eventType: 'job.completed',
    userId,
    tenantId,
    resourceType: 'job',
    resourceId: jobId,
    action: 'complete',
    outcome: 'success',
    details: { tokenUsage },
  });
}

export function auditAuthSuccess(
  userId: string,
  tenantId: string,
  authMethod: 'jwt' | 'api-key',
  ipAddress?: string
): void {
  logAuditEvent({
    eventType: 'auth.success',
    userId,
    tenantId,
    resourceType: 'session',
    resourceId: userId,
    action: 'authenticate',
    outcome: 'success',
    details: { authMethod },
    ipAddress,
  });
}

export function auditAuthFailure(
  reason: string,
  ipAddress?: string
): void {
  logAuditEvent({
    eventType: 'auth.failure',
    userId: 'unknown',
    tenantId: 'unknown',
    resourceType: 'session',
    resourceId: 'unknown',
    action: 'authenticate',
    outcome: 'failure',
    details: { reason },
    ipAddress,
  });
}

export function auditQuotaExceeded(
  userId: string,
  tenantId: string,
  quotaType: string,
  limit: number,
  current: number
): void {
  logAuditEvent({
    eventType: 'quota.exceeded',
    userId,
    tenantId,
    resourceType: 'quota',
    resourceId: userId,
    action: 'check',
    outcome: 'failure',
    details: { quotaType, limit, current },
  });
}
```

### Custom Tracing

```typescript
// src/observability/tracing.ts
import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('user-story-agent', '1.0.0');

export function startSpan(name: string, attributes?: Record<string, string>): Span {
  return tracer.startSpan(name, { attributes });
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string>
): Promise<T> {
  const span = tracer.startSpan(name, { attributes });

  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      () => fn(span)
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// LLM-specific tracing
export async function traceAgentIteration<T>(
  iterationId: string,
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    `agent.iteration.${iterationId}`,
    async (span) => {
      span.setAttribute('iteration.id', iterationId);
      span.setAttribute('user.id', userId);
      return fn();
    }
  );
}

export async function traceLlmCall<T>(
  model: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    'llm.call',
    async (span) => {
      span.setAttribute('llm.model', model);
      span.setAttribute('llm.provider', 'anthropic');
      return fn();
    }
  );
}
```

### Barrel Exports

```typescript
// src/observability/index.ts
export * from './telemetry.js';
export * from './metrics.js';
export * from './audit-logger.js';
export * from './tracing.js';
```

## Environment Variables

```bash
# Azure Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...

# Sampling (1.0 = 100%, 0.1 = 10%)
OTEL_SAMPLING_RATIO=1.0

# Service identification
SERVICE_NAME=user-story-agent
SERVICE_VERSION=0.2.0
ENVIRONMENT=production
```

## Integration Points

### Server Startup

```typescript
// In src/api/server.ts
import { initializeTelemetry } from '../observability/index.js';

async function start() {
  await initializeTelemetry({
    serviceName: process.env.SERVICE_NAME || 'user-story-agent',
    serviceVersion: process.env.SERVICE_VERSION || '0.2.0',
    environment: process.env.NODE_ENV || 'development',
    azureConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
    enableConsoleExporter: process.env.NODE_ENV !== 'production',
    samplingRatio: parseFloat(process.env.OTEL_SAMPLING_RATIO || '1.0'),
  });

  // ... rest of startup
}
```

### Request Middleware

```typescript
// In middleware
import { httpRequestDuration, httpRequestCount } from '../observability/metrics.js';

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const attributes = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: String(res.statusCode),
    };

    httpRequestDuration.record(duration, attributes);
    httpRequestCount.add(1, attributes);
  });

  next();
});
```

## Verification

```bash
# Run with console exporter locally
export ENABLE_CONSOLE_EXPORTER=true
npm run dev:api

# Make requests and observe console output
curl http://localhost:3000/health

# In Azure: check Application Insights
# 1. Open Azure Portal > Application Insights
# 2. Check Transaction Search for requests
# 3. Check Metrics for custom metrics
# 4. Check Logs for audit events

# Query audit events in Log Analytics
# traces | where customDimensions.audit == true
```

## Notes

- Auto-instrumentation covers Express, pg, fetch
- LLM metrics help with cost tracking and optimization
- Audit logs separate from operational logs (queryable)
- Sampling reduces costs for high-traffic production
- Console exporter for local development debugging
- Spans automatically propagate through async context
