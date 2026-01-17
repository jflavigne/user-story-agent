# USA-35: Authentication Middleware (OIDC + API Keys)

**Epic:** USA - User Story Agent
**Type:** Feature
**Priority:** High
**Status:** Ready
**Dependencies:** USA-33, USA-34

## Description

Implement authentication middleware supporting both OneLogin OIDC (JWT) and API keys for service accounts. Extract user context (userId, tenantId, quotaTier) for downstream use.

## Problem Statement

- No authentication on API endpoints
- Need to support human users (OIDC/JWT) and service accounts (API keys)
- Must extract user identity for quota enforcement and audit logging
- Need to validate tokens against OIDC provider (OneLogin/Azure AD)

## Acceptance Criteria

- [ ] Implement JWT validation using JWKS (rotating keys)
- [ ] Support generic OIDC discovery for OneLogin and Azure AD
- [ ] Implement API key validation against database
- [ ] Create user context type with userId, tenantId, email, quotaTier
- [ ] Add auth middleware that extracts and validates credentials
- [ ] Support both Bearer token and X-API-Key headers
- [ ] Cache JWKS for performance (with TTL refresh)
- [ ] Update API key last_used_at on successful auth
- [ ] Return 401 for invalid/missing credentials
- [ ] Return 403 for expired/revoked API keys

## Files

### New Directory Structure
```
src/auth/
├── jwt.ts
├── api-key.ts
├── context.ts
├── middleware.ts
└── index.ts
```

### New Files
- `src/auth/jwt.ts` - JWT/OIDC validation
- `src/auth/api-key.ts` - API key validation
- `src/auth/context.ts` - User context types
- `src/auth/middleware.ts` - Auth middleware
- `src/auth/index.ts` - Barrel exports

## Technical Notes

### User Context

```typescript
// src/auth/context.ts
export type QuotaTier = 'free' | 'pro' | 'enterprise';

export interface UserContext {
  userId: string;
  tenantId: string;
  email?: string;
  name?: string;
  quotaTier: QuotaTier;
  scopes: string[];
  authMethod: 'jwt' | 'api-key';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}
```

### JWT Validation

```typescript
// src/auth/jwt.ts
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { UserContext, QuotaTier } from './context.js';
import { logger } from '../utils/logger.js';

interface OidcConfig {
  issuer: string;
  jwksUri: string;
  audience: string;
}

// Discover OIDC configuration
async function discoverOidc(issuerUrl: string): Promise<OidcConfig> {
  const wellKnown = `${issuerUrl}/.well-known/openid-configuration`;
  const response = await fetch(wellKnown);
  const config = await response.json();

  return {
    issuer: config.issuer,
    jwksUri: config.jwks_uri,
    audience: process.env.OIDC_AUDIENCE || config.issuer,
  };
}

let cachedConfig: OidcConfig | null = null;
let jwks: jwksClient.JwksClient | null = null;

async function getSigningKey(kid: string): Promise<string> {
  if (!cachedConfig) {
    const issuer = process.env.OIDC_ISSUER_URL;
    if (!issuer) throw new Error('OIDC_ISSUER_URL not configured');
    cachedConfig = await discoverOidc(issuer);
    jwks = jwksClient({
      jwksUri: cachedConfig.jwksUri,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
    });
  }

  const key = await jwks!.getSigningKey(kid);
  return key.getPublicKey();
}

export async function validateJwt(token: string): Promise<UserContext | null> {
  try {
    // Decode header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      return null;
    }

    const publicKey = await getSigningKey(decoded.header.kid);

    const payload = jwt.verify(token, publicKey, {
      issuer: cachedConfig?.issuer,
      audience: cachedConfig?.audience,
    }) as jwt.JwtPayload;

    // Map OIDC claims to UserContext
    return {
      userId: payload.sub!,
      tenantId: payload.tenant_id || payload.oid || payload.sub!,
      email: payload.email,
      name: payload.name,
      quotaTier: mapGroupsToTier(payload.groups || []),
      scopes: (payload.scope || '').split(' '),
      authMethod: 'jwt',
    };
  } catch (error) {
    logger.debug('JWT validation failed', { error });
    return null;
  }
}

function mapGroupsToTier(groups: string[]): QuotaTier {
  if (groups.includes('enterprise')) return 'enterprise';
  if (groups.includes('pro')) return 'pro';
  return 'free';
}
```

### API Key Validation

```typescript
// src/auth/api-key.ts
import crypto from 'crypto';
import { queryOne, query } from '../db/client.js';
import { UserContext } from './context.js';
import { ApiKey } from '../db/schema.js';

export async function validateApiKey(key: string): Promise<UserContext | null> {
  // API keys are formatted as: usa_<prefix>_<secret>
  const parts = key.split('_');
  if (parts.length !== 3 || parts[0] !== 'usa') {
    return null;
  }

  const prefix = parts[1];
  const keyHash = hashApiKey(key);

  const apiKey = await queryOne<ApiKey>(
    `SELECT * FROM api_keys
     WHERE key_prefix = $1 AND key_hash = $2
     AND revoked_at IS NULL
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [prefix, keyHash]
  );

  if (!apiKey) {
    return null;
  }

  // Update last_used_at (fire and forget)
  query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [apiKey.id]
  ).catch(() => {}); // Ignore errors

  return {
    userId: apiKey.user_id,
    tenantId: apiKey.tenant_id,
    quotaTier: apiKey.quota_tier as any,
    scopes: apiKey.scopes,
    authMethod: 'api-key',
  };
}

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const prefix = crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('base64url');
  const key = `usa_${prefix}_${secret}`;
  const hash = hashApiKey(key);

  return { key, hash, prefix };
}
```

### Auth Middleware

```typescript
// src/auth/middleware.ts
import { Request, Response, NextFunction } from 'express';
import { validateJwt } from './jwt.js';
import { validateApiKey } from './api-key.js';
import { logger } from '../utils/logger.js';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try Bearer token first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const user = await validateJwt(token);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Try API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = await validateApiKey(apiKey);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // No valid credentials
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid authentication required',
      },
    });
  } catch (error) {
    logger.error('Auth middleware error', { error });
    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

// Middleware to require specific scopes
export function requireScopes(...scopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const hasScopes = scopes.every(s => req.user!.scopes.includes(s));
    if (!hasScopes) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Required scopes: ${scopes.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
```

### Barrel Exports

```typescript
// src/auth/index.ts
export * from './context.js';
export * from './jwt.js';
export * from './api-key.js';
export * from './middleware.js';
```

## Environment Variables

```bash
# OIDC Configuration (OneLogin example)
OIDC_ISSUER_URL=https://yourcompany.onelogin.com/oidc/2
OIDC_AUDIENCE=https://user-story-agent.yourcompany.com

# Or Azure AD
OIDC_ISSUER_URL=https://login.microsoftonline.com/{tenant}/v2.0
OIDC_AUDIENCE=api://user-story-agent
```

## Verification

```bash
# Test with valid JWT (obtain from OIDC provider)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/jobs

# Test with API key
curl -H "X-API-Key: usa_abc123_..." http://localhost:3000/api/v1/jobs

# Test invalid credentials
curl http://localhost:3000/api/v1/jobs
# → 401 Unauthorized

# Test expired API key
# → 403 Forbidden
```

## Notes

- JWKS keys are cached for 10 minutes with automatic refresh
- API key format: `usa_<8-char-prefix>_<32-char-secret>`
- Prefix allows quick database lookup before full hash comparison
- Last used timestamp updated asynchronously (non-blocking)
- Groups claim used for quota tier mapping (OneLogin groups)
