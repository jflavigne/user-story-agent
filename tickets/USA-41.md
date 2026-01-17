# USA-41: API Routes - Iterations & Workflow

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** Medium
**Status:** Ready
**Dependencies:** USA-34, USA-35

## Description

Implement API routes for listing available iterations and running workflow mode. These routes provide synchronous options for simpler use cases and allow clients to discover available iterations.

## Problem Statement

- Clients need to know what iterations are available
- Some use cases prefer synchronous processing (shorter stories)
- Need to expose iteration metadata for UI building
- Workflow mode should auto-select iterations based on product type

## Acceptance Criteria

- [ ] Implement `GET /api/v1/iterations` - List all available iterations
- [ ] Implement `GET /api/v1/iterations/:id` - Get iteration details
- [ ] Implement `POST /api/v1/iterations/run` - Run specific iterations synchronously
- [ ] Implement `POST /api/v1/workflow/run` - Run workflow mode synchronously
- [ ] Filter iterations by product type
- [ ] Support streaming response for run endpoints
- [ ] Apply timeout for synchronous operations
- [ ] Include iteration metadata (category, order, applicability)

## Files

### New Files
- `src/api/routes/iterations.ts` - Iterations router
- `src/api/routes/workflow.ts` - Workflow router

### Modified Files
- `src/api/app.ts` - Mount new routers

## Technical Notes

### Iterations Router

```typescript
// src/api/routes/iterations.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  getAllIterations,
  getIterationById,
  getApplicableIterations,
} from '../../shared/iteration-registry.js';
import { authMiddleware } from '../../auth/middleware.js';
import { rateLimitMiddleware } from '../../quota/middleware.js';
import { ApiError } from '../middleware/error-handler.js';
import { UserStoryAgent, createAgent } from '../../agent/index.js';
import { getTierLimits } from '../../quota/tiers.js';
import { incrementDailyUsage } from '../../quota/tracker.js';
import { logger } from '../../utils/logger.js';

export const iterationsRouter = Router();

iterationsRouter.use(authMiddleware);
iterationsRouter.use(rateLimitMiddleware);

const ProductTypeSchema = z.enum(['web', 'mobile-native', 'mobile-web', 'desktop', 'api']);

// List all iterations
iterationsRouter.get('/', async (req: Request, res: Response) => {
  const { productType, category } = req.query;

  let iterations = await getAllIterations();

  // Filter by product type
  if (productType) {
    const parsed = ProductTypeSchema.safeParse(productType);
    if (parsed.success) {
      iterations = await getApplicableIterations(parsed.data);
    }
  }

  // Filter by category
  if (category && typeof category === 'string') {
    iterations = iterations.filter(i => i.category === category);
  }

  res.json({
    iterations: iterations.map(iter => ({
      id: iter.id,
      name: iter.name,
      description: iter.description,
      category: iter.category,
      order: iter.order,
      applicableProductTypes: iter.applicableProductTypes,
    })),
    total: iterations.length,
    categories: [...new Set(iterations.map(i => i.category))],
  });
});

// Get iteration details
iterationsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const iteration = await getIterationById(id);

  if (!iteration) {
    throw new ApiError(404, `Iteration '${id}' not found`, 'NOT_FOUND');
  }

  res.json({
    id: iteration.id,
    name: iteration.name,
    description: iteration.description,
    category: iteration.category,
    order: iteration.order,
    applicableProductTypes: iteration.applicableProductTypes,
    // Don't expose full prompt for security
  });
});

// Run iterations synchronously (for short stories)
const RunIterationsSchema = z.object({
  story: z.string().min(1).max(50_000), // Smaller limit for sync
  iterations: z.array(z.string()).min(1).max(6),
  options: z.object({
    verify: z.boolean().optional().default(true),
    productContext: z.object({
      productName: z.string().optional(),
      productType: ProductTypeSchema.optional(),
    }).optional(),
  }).optional().default({}),
});

iterationsRouter.post(
  '/run',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = RunIterationsSchema.safeParse(req.body);
      if (!result.success) {
        throw new ApiError(400, result.error.message, 'VALIDATION_ERROR');
      }

      const { story, iterations, options } = result.data;
      const user = req.user!;
      const limits = getTierLimits(user.quotaTier);

      // Validate limits
      if (iterations.length > limits.maxIterations) {
        throw new ApiError(
          400,
          `Max iterations exceeded (${limits.maxIterations} for ${user.quotaTier} tier)`,
          'LIMIT_EXCEEDED'
        );
      }

      // Validate iteration IDs exist
      for (const id of iterations) {
        const iter = await getIterationById(id);
        if (!iter) {
          throw new ApiError(400, `Unknown iteration: ${id}`, 'INVALID_ITERATION');
        }
      }

      // Set timeout for synchronous processing
      req.setTimeout(120000); // 2 minutes

      logger.info('Running iterations synchronously', {
        userId: user.userId,
        iterations,
      });

      const agent = createAgent({
        mode: 'individual',
        iterations,
        streaming: false,
        verify: options.verify,
        productContext: options.productContext,
      });

      const startTime = Date.now();
      const agentResult = await agent.processUserStory(story);

      // Track usage
      const inputTokens = agentResult.tokenUsage?.input || 0;
      const outputTokens = agentResult.tokenUsage?.output || 0;
      const costUsd = calculateCost(inputTokens, outputTokens);

      await incrementDailyUsage({
        userId: user.userId,
        inputTokens,
        outputTokens,
        costUsd,
      });

      res.json({
        enhancedStory: agentResult.enhancedStory,
        iterationsApplied: agentResult.iterationsApplied,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
        },
        costUsd,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      next(error);
    }
  }
);

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 3.0;
  const outputCostPer1M = 15.0;
  return (inputTokens / 1_000_000) * inputCostPer1M +
         (outputTokens / 1_000_000) * outputCostPer1M;
}
```

### Workflow Router

```typescript
// src/api/routes/workflow.ts
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getApplicableIterations } from '../../shared/iteration-registry.js';
import { authMiddleware } from '../../auth/middleware.js';
import { rateLimitMiddleware } from '../../quota/middleware.js';
import { ApiError } from '../middleware/error-handler.js';
import { createAgent } from '../../agent/index.js';
import { getTierLimits } from '../../quota/tiers.js';
import { incrementDailyUsage } from '../../quota/tracker.js';
import { logger } from '../../utils/logger.js';

export const workflowRouter = Router();

workflowRouter.use(authMiddleware);
workflowRouter.use(rateLimitMiddleware);

const ProductTypeSchema = z.enum(['web', 'mobile-native', 'mobile-web', 'desktop', 'api']);

const RunWorkflowSchema = z.object({
  story: z.string().min(1).max(50_000),
  productType: ProductTypeSchema,
  options: z.object({
    verify: z.boolean().optional().default(true),
    productContext: z.object({
      productName: z.string().optional(),
      productDescription: z.string().optional(),
    }).optional(),
    excludeIterations: z.array(z.string()).optional(),
  }).optional().default({}),
});

// Run workflow mode synchronously
workflowRouter.post(
  '/run',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = RunWorkflowSchema.safeParse(req.body);
      if (!result.success) {
        throw new ApiError(400, result.error.message, 'VALIDATION_ERROR');
      }

      const { story, productType, options } = result.data;
      const user = req.user!;
      const limits = getTierLimits(user.quotaTier);

      // Get applicable iterations for product type
      let iterations = await getApplicableIterations(productType);

      // Exclude specified iterations
      if (options.excludeIterations?.length) {
        iterations = iterations.filter(
          i => !options.excludeIterations!.includes(i.id)
        );
      }

      // Apply tier limit
      if (iterations.length > limits.maxIterations) {
        iterations = iterations.slice(0, limits.maxIterations);
      }

      // Set timeout
      req.setTimeout(180000); // 3 minutes for workflow

      logger.info('Running workflow', {
        userId: user.userId,
        productType,
        iterations: iterations.map(i => i.id),
      });

      const agent = createAgent({
        mode: 'workflow',
        productContext: {
          productType,
          ...options.productContext,
        },
        streaming: false,
        verify: options.verify,
      });

      const startTime = Date.now();
      const agentResult = await agent.processUserStory(story);

      // Track usage
      const inputTokens = agentResult.tokenUsage?.input || 0;
      const outputTokens = agentResult.tokenUsage?.output || 0;
      const costUsd = calculateCost(inputTokens, outputTokens);

      await incrementDailyUsage({
        userId: user.userId,
        inputTokens,
        outputTokens,
        costUsd,
      });

      res.json({
        enhancedStory: agentResult.enhancedStory,
        iterationsApplied: agentResult.iterationsApplied,
        productType,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
        },
        costUsd,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Preview workflow - show what iterations would run
workflowRouter.get('/preview', async (req: Request, res: Response) => {
  const { productType } = req.query;

  if (!productType) {
    throw new ApiError(400, 'productType query parameter required', 'VALIDATION_ERROR');
  }

  const parsed = ProductTypeSchema.safeParse(productType);
  if (!parsed.success) {
    throw new ApiError(400, `Invalid productType: ${productType}`, 'VALIDATION_ERROR');
  }

  const iterations = await getApplicableIterations(parsed.data);

  res.json({
    productType: parsed.data,
    iterations: iterations.map(i => ({
      id: i.id,
      name: i.name,
      category: i.category,
      order: i.order,
    })),
    total: iterations.length,
    estimatedTokens: estimateTokens(iterations.length),
    estimatedCostUsd: estimateCost(iterations.length),
  });
});

function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCostPer1M = 3.0;
  const outputCostPer1M = 15.0;
  return (inputTokens / 1_000_000) * inputCostPer1M +
         (outputTokens / 1_000_000) * outputCostPer1M;
}

function estimateTokens(iterationCount: number): { input: number; output: number } {
  // Rough estimate: ~2000 input + ~1000 output per iteration
  return {
    input: iterationCount * 2000,
    output: iterationCount * 1000,
  };
}

function estimateCost(iterationCount: number): number {
  const est = estimateTokens(iterationCount);
  return calculateCost(est.input, est.output);
}
```

### Mount Routers

```typescript
// In src/api/app.ts
import { iterationsRouter } from './routes/iterations.js';
import { workflowRouter } from './routes/workflow.js';

app.use('/api/v1/iterations', iterationsRouter);
app.use('/api/v1/workflow', workflowRouter);
```

## API Examples

### List Iterations

```bash
curl "http://localhost:3000/api/v1/iterations?productType=web" \
  -H "Authorization: Bearer <token>"

# Response:
{
  "iterations": [
    {
      "id": "user-roles",
      "name": "User Roles",
      "description": "Identify user roles and permissions",
      "category": "roles",
      "order": 1
    },
    ...
  ],
  "total": 10,
  "categories": ["roles", "elements", "validation", "quality"]
}
```

### Run Iterations

```bash
curl -X POST http://localhost:3000/api/v1/iterations/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "story": "As a user, I want to log in...",
    "iterations": ["validation", "accessibility"]
  }'

# Response:
{
  "enhancedStory": "...",
  "iterationsApplied": ["validation", "accessibility"],
  "tokenUsage": { "input": 4000, "output": 2000 },
  "costUsd": 0.042,
  "durationMs": 15000
}
```

### Preview Workflow

```bash
curl "http://localhost:3000/api/v1/workflow/preview?productType=mobile-native" \
  -H "Authorization: Bearer <token>"

# Response:
{
  "productType": "mobile-native",
  "iterations": [
    { "id": "user-roles", "name": "User Roles", "category": "roles", "order": 1 },
    ...
  ],
  "total": 8,
  "estimatedTokens": { "input": 16000, "output": 8000 },
  "estimatedCostUsd": 0.168
}
```

### Run Workflow

```bash
curl -X POST http://localhost:3000/api/v1/workflow/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "story": "As a user, I want to view my profile...",
    "productType": "mobile-native",
    "options": {
      "excludeIterations": ["i18n-cultural"]
    }
  }'
```

## Verification

```bash
# List iterations
curl -s http://localhost:3000/api/v1/iterations \
  -H "Authorization: Bearer <token>" | jq '.total'

# Get specific iteration
curl -s http://localhost:3000/api/v1/iterations/validation \
  -H "Authorization: Bearer <token>" | jq '.name'

# Preview workflow
curl -s "http://localhost:3000/api/v1/workflow/preview?productType=web" \
  -H "Authorization: Bearer <token>" | jq '.estimatedCostUsd'

# Run iterations (may take 30+ seconds)
time curl -X POST http://localhost:3000/api/v1/iterations/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"story": "Test", "iterations": ["validation"]}'
```

## Notes

- Synchronous endpoints have shorter timeout (2-3 minutes)
- Story size limited to 50KB for sync operations (vs 100KB for async)
- Workflow preview helps users estimate costs before running
- excludeIterations allows customizing workflow
- Token estimates are rough (~2000 input + 1000 output per iteration)
