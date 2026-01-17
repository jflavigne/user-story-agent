# USA-46: OpenAPI Specification

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** Medium
**Status:** Ready
**Dependencies:** USA-40, USA-41, USA-42

## Description

Generate a comprehensive OpenAPI 3.0 specification for the API. This enables OpenWebUI integration, client SDK generation, and interactive API documentation.

## Problem Statement

- OpenWebUI requires OpenAPI spec for tool integration
- No API documentation for developers
- Can't auto-generate client SDKs
- No schema validation at API boundary

## Acceptance Criteria

- [ ] Create OpenAPI 3.0 spec covering all endpoints
- [ ] Document request/response schemas
- [ ] Include authentication schemes (Bearer, API Key)
- [ ] Add rate limit documentation
- [ ] Serve spec at `/openapi.json`
- [ ] Generate interactive docs (optional Swagger UI)
- [ ] Include SSE event documentation
- [ ] Add examples for all endpoints

## Files

### New Files
- `src/api/openapi/spec.ts` - OpenAPI specification
- `src/api/openapi/index.ts` - Barrel exports
- `src/api/routes/docs.ts` - Documentation routes

## Technical Notes

### OpenAPI Specification

```typescript
// src/api/openapi/spec.ts
import { OpenAPIV3 } from 'openapi-types';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'User Story Agent API',
    description: `
API for enhancing user stories with AI-powered iterations.

## Authentication

The API supports two authentication methods:
- **Bearer Token**: JWT from OIDC provider (OneLogin/Azure AD)
- **API Key**: For service accounts, sent via X-API-Key header

## Rate Limits

Rate limits vary by tier:
| Tier | Requests/Day | Tokens/Day | RPM |
|------|-------------|------------|-----|
| Free | 50 | 100K | 5 |
| Pro | 500 | 1M | 20 |
| Enterprise | 5000 | 10M | 60 |

Rate limit headers are included in all responses:
- X-RateLimit-Limit
- X-RateLimit-Remaining
- X-RateLimit-Reset

## Streaming

Job processing supports Server-Sent Events (SSE) for real-time updates.
Connect to \`/api/v1/jobs/{id}/stream\` with Accept: text/event-stream.
    `,
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'https://api.userstoryagent.example.com',
      description: 'Production',
    },
    {
      url: 'http://localhost:3000',
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Jobs', description: 'Async job management' },
    { name: 'Iterations', description: 'Available iterations' },
    { name: 'Workflow', description: 'Workflow mode operations' },
    { name: 'Usage', description: 'Usage and quota information' },
    { name: 'Uploads', description: 'File uploads for mockups' },
    { name: 'Health', description: 'Health and status endpoints' },
  ],
  security: [
    { bearerAuth: [] },
    { apiKey: [] },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from OIDC provider',
      },
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service accounts (format: usa_prefix_secret)',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid request body' },
            },
          },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
          },
          story: { type: 'string' },
          iterations: {
            type: 'array',
            items: { type: 'string' },
          },
          options: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time', nullable: true },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          result: { $ref: '#/components/schemas/JobResult' },
          error: { $ref: '#/components/schemas/JobError' },
        },
      },
      JobResult: {
        type: 'object',
        properties: {
          enhancedStory: { type: 'string' },
          iterationsApplied: {
            type: 'array',
            items: { type: 'string' },
          },
          tokenUsage: {
            type: 'object',
            properties: {
              input: { type: 'integer' },
              output: { type: 'integer' },
            },
          },
          costUsd: { type: 'number' },
          durationMs: { type: 'integer' },
        },
      },
      JobError: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
        },
      },
      CreateJobRequest: {
        type: 'object',
        required: ['story', 'iterations'],
        properties: {
          story: {
            type: 'string',
            minLength: 1,
            maxLength: 100000,
            description: 'The user story to enhance',
            example: 'As a user, I want to log in so that I can access my account',
          },
          iterations: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 12,
            description: 'Iteration IDs to apply',
            example: ['validation', 'accessibility'],
          },
          options: {
            type: 'object',
            properties: {
              streaming: { type: 'boolean', default: true },
              verify: { type: 'boolean', default: true },
              productType: {
                type: 'string',
                enum: ['web', 'mobile-native', 'mobile-web', 'desktop', 'api'],
              },
            },
          },
        },
      },
      Iteration: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'validation' },
          name: { type: 'string', example: 'Validation Rules' },
          description: { type: 'string' },
          category: { type: 'string' },
          order: { type: 'integer' },
          applicableProductTypes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
      UsageSummary: {
        type: 'object',
        properties: {
          period: { type: 'string', example: 'today' },
          date: { type: 'string', format: 'date' },
          usage: {
            type: 'object',
            properties: {
              requests: { type: 'integer' },
              inputTokens: { type: 'integer' },
              outputTokens: { type: 'integer' },
              totalTokens: { type: 'integer' },
              costUsd: { type: 'number' },
            },
          },
          limits: {
            type: 'object',
            properties: {
              requestsPerDay: { type: 'integer' },
              tokensPerDay: { type: 'integer' },
            },
          },
          remaining: {
            type: 'object',
            properties: {
              requests: { type: 'integer' },
              tokens: { type: 'integer' },
            },
          },
          tier: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: { code: 'UNAUTHORIZED', message: 'Valid authentication required' },
            },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per minute',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Unix timestamp when limit resets',
          },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Rate limit exceeded. Try again after ...',
              },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        security: [],
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List jobs',
        description: 'List jobs for the authenticated user',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'],
            },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', minimum: 0, default: 0 },
          },
        ],
        responses: {
          '200': {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Job' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' },
                        hasMore: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create job',
        description: 'Create a new async job to process a user story',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateJobRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Job created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    job: { $ref: '#/components/schemas/Job' },
                    queuePosition: { type: 'integer' },
                    links: {
                      type: 'object',
                      properties: {
                        self: { type: 'string' },
                        stream: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/api/v1/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Job details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          '404': {
            description: 'Job not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Cancel job',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Job cancelled',
          },
          '404': {
            description: 'Job not found or already completed',
          },
        },
      },
    },
    '/api/v1/jobs/{id}/stream': {
      get: {
        tags: ['Jobs'],
        summary: 'Stream job events',
        description: 'Server-Sent Events stream for real-time job updates',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'SSE event stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Server-Sent Events stream',
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/iterations': {
      get: {
        tags: ['Iterations'],
        summary: 'List iterations',
        parameters: [
          {
            name: 'productType',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['web', 'mobile-native', 'mobile-web', 'desktop', 'api'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'List of iterations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    iterations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Iteration' },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/usage': {
      get: {
        tags: ['Usage'],
        summary: 'Get usage summary',
        responses: {
          '200': {
            description: 'Current usage summary',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsageSummary' },
              },
            },
          },
        },
      },
    },
  },
};

export function getOpenApiSpec(): OpenAPIV3.Document {
  return openApiSpec;
}
```

### Documentation Routes

```typescript
// src/api/routes/docs.ts
import { Router } from 'express';
import { getOpenApiSpec } from '../openapi/spec.js';

export const docsRouter = Router();

// Serve OpenAPI spec
docsRouter.get('/openapi.json', (req, res) => {
  res.json(getOpenApiSpec());
});

// Optional: Swagger UI (requires swagger-ui-express)
// docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(getOpenApiSpec()));
```

## Verification

```bash
# Fetch OpenAPI spec
curl http://localhost:3000/openapi.json | jq '.info'

# Validate spec with spectral
npx @stoplight/spectral-cli lint http://localhost:3000/openapi.json

# Generate TypeScript client
npx openapi-typescript http://localhost:3000/openapi.json -o ./generated/api.d.ts

# Add to OpenWebUI
# 1. Go to OpenWebUI Settings > Tools
# 2. Add Tool Server
# 3. Enter URL: http://localhost:3000/openapi.json
```

## Notes

- OpenAPI 3.0.3 used for broad tool compatibility
- SSE endpoints documented but tools may not fully support
- Security schemes document both JWT and API key
- Examples included for common operations
- Rate limit documentation in API description
- Consider generating from Zod schemas for consistency
