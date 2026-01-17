# USA-34: Express Server Foundation

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-31

## Description

Create the Express.js HTTP server with essential middleware stack, health endpoints, error handling, and graceful shutdown. This is the foundation for all API endpoints.

## Problem Statement

- No HTTP interface for the agent - only CLI
- Need production-ready server with security middleware
- Require health/ready endpoints for container orchestration
- Need structured error handling and request logging

## Acceptance Criteria

- [ ] Create Express app with middleware stack (helmet, cors, JSON parsing)
- [ ] Implement `/health` liveness probe endpoint
- [ ] Implement `/ready` readiness probe (checks database connection)
- [ ] Add request ID middleware for tracing
- [ ] Implement structured request/response logging
- [ ] Add global error handler with proper status codes
- [ ] Support graceful shutdown (SIGTERM/SIGINT)
- [ ] Configure CORS for OpenWebUI origins
- [ ] Add request body size limits
- [ ] Create app factory for testing

## Files

### New Directory Structure
```
src/api/
├── server.ts
├── app.ts
├── middleware/
│   ├── request-id.ts
│   ├── logging.ts
│   └── error-handler.ts
└── routes/
    └── health.ts
```

### New Files
- `src/api/server.ts` - Server entry point with graceful shutdown
- `src/api/app.ts` - Express app factory
- `src/api/middleware/request-id.ts` - Request ID generation
- `src/api/middleware/logging.ts` - Request/response logging
- `src/api/middleware/error-handler.ts` - Global error handler
- `src/api/routes/health.ts` - Health check endpoints

## Technical Notes

### Express App Factory

```typescript
// src/api/app.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestIdMiddleware } from './middleware/request-id.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

export interface AppConfig {
  corsOrigins?: string[];
  bodyLimit?: string;
  trustProxy?: boolean;
}

export function createApp(config: AppConfig = {}): Express {
  const app = express();

  // Trust proxy for Azure Container Apps
  if (config.trustProxy !== false) {
    app.set('trust proxy', 1);
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // API doesn't serve HTML
  }));

  // CORS configuration
  app.use(cors({
    origin: config.corsOrigins || process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  // Request parsing
  app.use(express.json({ limit: config.bodyLimit || '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit || '1mb' }));

  // Request tracking
  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);

  // Routes
  app.use('/', healthRouter);
  // Additional routers added here: app.use('/api/v1', apiRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

### Server Entry Point

```typescript
// src/api/server.ts
import { createApp } from './app.js';
import { shutdown as shutdownDb, healthCheck as dbHealthCheck } from '../db/client.js';
import { logger } from '../utils/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  // Wait for database to be ready
  let dbReady = false;
  for (let i = 0; i < 30; i++) {
    dbReady = await dbHealthCheck();
    if (dbReady) break;
    logger.info('Waiting for database...', { attempt: i + 1 });
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!dbReady) {
    logger.error('Database not available after 30 attempts');
    process.exit(1);
  }

  const app = createApp();

  const server = app.listen(PORT, HOST, () => {
    logger.info(`Server started`, { host: HOST, port: PORT });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);

    server.close(async () => {
      logger.info('HTTP server closed');
      await shutdownDb();
      process.exit(0);
    });

    // Force close after 30s
    setTimeout(() => {
      logger.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});
```

### Request ID Middleware

```typescript
// src/api/middleware/request-id.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}
```

### Logging Middleware

```typescript
// src/api/middleware/logging.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}
```

### Error Handler

```typescript
// src/api/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
  });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code || 'API_ERROR',
        message: err.message,
      },
    });
    return;
  }

  // Don't leak internal errors in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
    },
  });
}
```

### Health Routes

```typescript
// src/api/routes/health.ts
import { Router } from 'express';
import { healthCheck as dbHealthCheck } from '../../db/client.js';

export const healthRouter = Router();

// Liveness probe - always returns 200 if server is running
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe - checks database connectivity
healthRouter.get('/ready', async (req, res) => {
  const dbReady = await dbHealthCheck();

  if (dbReady) {
    res.json({
      status: 'ready',
      checks: { database: 'ok' },
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      checks: { database: 'failed' },
      timestamp: new Date().toISOString(),
    });
  }
});
```

## Verification

```bash
# Start server in development
npm run dev:api

# Test health endpoint
curl http://localhost:3000/health

# Test readiness endpoint
curl http://localhost:3000/ready

# Test 404 handling
curl http://localhost:3000/nonexistent

# Test CORS
curl -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:3000/health -v

# Test graceful shutdown
kill -SIGTERM <pid>
```

## Notes

- Trust proxy enabled for Azure Container Apps (X-Forwarded-* headers)
- Helmet configured to allow API usage (no CSP for non-HTML)
- Request ID can be provided by client or generated automatically
- Body size limited to 1MB by default (adjustable)
- 30-second timeout for graceful shutdown
