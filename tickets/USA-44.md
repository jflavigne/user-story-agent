# USA-44: Azure Key Vault Integration

**Epic:** USA - User Story Agent
**Type:** Infrastructure
**Priority:** High
**Status:** Ready
**Dependencies:** USA-31

## Description

Implement Azure Key Vault integration for secure storage and retrieval of the Anthropic API key and other secrets. Use Managed Identity for authentication in production.

## Problem Statement

- Anthropic API key shouldn't be in environment variables in production
- Need secure, audited secret storage
- Support for secret rotation without restarts
- Development should work with local environment variables

## Acceptance Criteria

- [ ] Create Key Vault client with Managed Identity support
- [ ] Retrieve Anthropic API key from Key Vault
- [ ] Fall back to environment variable for local development
- [ ] Cache secrets with configurable TTL
- [ ] Support secret refresh without restart
- [ ] Log secret access for audit trail
- [ ] Handle Key Vault unavailability gracefully

## Files

### New Files
- `src/config/azure-keyvault.ts` - Key Vault client
- `src/config/secrets.ts` - Secret management abstraction

### Modified Files
- `src/agent/claude-client.ts` - Accept API key from config
- `src/config/index.ts` - Add secret configuration

## Technical Notes

### Key Vault Client

```typescript
// src/config/azure-keyvault.ts
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from '../utils/logger.js';

interface CachedSecret {
  value: string;
  expiresAt: Date;
}

const cache = new Map<string, CachedSecret>();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

let secretClient: SecretClient | null = null;

function getSecretClient(): SecretClient | null {
  if (secretClient) return secretClient;

  const vaultUrl = process.env.AZURE_KEYVAULT_URL;
  if (!vaultUrl) {
    logger.debug('AZURE_KEYVAULT_URL not set, using environment variables');
    return null;
  }

  try {
    const credential = new DefaultAzureCredential();
    secretClient = new SecretClient(vaultUrl, credential);
    logger.info('Key Vault client initialized', { vaultUrl });
    return secretClient;
  } catch (error) {
    logger.error('Failed to initialize Key Vault client', { error });
    return null;
  }
}

export async function getSecret(
  secretName: string,
  options: { ttlMs?: number; fallbackEnvVar?: string } = {}
): Promise<string | null> {
  const { ttlMs = DEFAULT_TTL_MS, fallbackEnvVar } = options;

  // Check cache first
  const cached = cache.get(secretName);
  if (cached && cached.expiresAt > new Date()) {
    return cached.value;
  }

  // Try Key Vault
  const client = getSecretClient();
  if (client) {
    try {
      const secret = await client.getSecret(secretName);

      if (secret.value) {
        // Cache the secret
        cache.set(secretName, {
          value: secret.value,
          expiresAt: new Date(Date.now() + ttlMs),
        });

        logger.debug('Secret retrieved from Key Vault', { secretName });
        return secret.value;
      }
    } catch (error) {
      logger.warn('Failed to retrieve secret from Key Vault', {
        secretName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Fall back to environment variable
  if (fallbackEnvVar) {
    const envValue = process.env[fallbackEnvVar];
    if (envValue) {
      logger.debug('Using environment variable fallback', { fallbackEnvVar });
      return envValue;
    }
  }

  return null;
}

export async function refreshSecret(secretName: string): Promise<boolean> {
  cache.delete(secretName);
  const value = await getSecret(secretName);
  return value !== null;
}

export function clearSecretCache(): void {
  cache.clear();
  logger.debug('Secret cache cleared');
}
```

### Secrets Abstraction

```typescript
// src/config/secrets.ts
import { getSecret, refreshSecret } from './azure-keyvault.js';

export interface Secrets {
  anthropicApiKey: string;
  databaseUrl: string;
  redisUrl?: string;
}

let cachedSecrets: Secrets | null = null;

export async function loadSecrets(): Promise<Secrets> {
  if (cachedSecrets) return cachedSecrets;

  // Anthropic API Key
  const anthropicApiKey = await getSecret('anthropic-api-key', {
    fallbackEnvVar: 'ANTHROPIC_API_KEY',
  });

  if (!anthropicApiKey) {
    throw new Error(
      'Anthropic API key not found. Set ANTHROPIC_API_KEY or configure Key Vault.'
    );
  }

  // Database URL
  const databaseUrl = await getSecret('database-url', {
    fallbackEnvVar: 'DATABASE_URL',
  });

  if (!databaseUrl) {
    throw new Error('Database URL not found');
  }

  // Redis URL (optional)
  const redisUrl = await getSecret('redis-url', {
    fallbackEnvVar: 'REDIS_URL',
  });

  cachedSecrets = {
    anthropicApiKey,
    databaseUrl,
    redisUrl: redisUrl || undefined,
  };

  return cachedSecrets;
}

export async function refreshSecrets(): Promise<void> {
  cachedSecrets = null;
  await Promise.all([
    refreshSecret('anthropic-api-key'),
    refreshSecret('database-url'),
    refreshSecret('redis-url'),
  ]);
}

export function getAnthropicApiKey(): string {
  if (!cachedSecrets) {
    throw new Error('Secrets not loaded. Call loadSecrets() first.');
  }
  return cachedSecrets.anthropicApiKey;
}
```

### Claude Client Integration

```typescript
// Modification to src/agent/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicApiKey } from '../config/secrets.js';

export function createClaudeClient(): Anthropic {
  const apiKey = getAnthropicApiKey();

  return new Anthropic({
    apiKey,
  });
}
```

### Server Startup

```typescript
// Modification to src/api/server.ts
import { loadSecrets } from '../config/secrets.js';

async function start() {
  // Load secrets first
  try {
    await loadSecrets();
    logger.info('Secrets loaded successfully');
  } catch (error) {
    logger.error('Failed to load secrets', { error });
    process.exit(1);
  }

  // Then proceed with database check and server start
  // ...
}
```

## Environment Variables

```bash
# Production: use Key Vault
AZURE_KEYVAULT_URL=https://usa-prod-vault.vault.azure.net/

# Development: use environment variables
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

## Key Vault Secret Names

| Secret Name | Description |
|-------------|-------------|
| `anthropic-api-key` | Anthropic API key for Claude |
| `database-url` | PostgreSQL connection string |
| `redis-url` | Redis connection string (optional) |

## Azure Configuration

### Create Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name usa-prod-vault \
  --resource-group rg-usa-prod \
  --location eastus \
  --enable-rbac-authorization true

# Grant Container App Managed Identity access
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <container-app-identity-id> \
  --scope /subscriptions/.../resourceGroups/rg-usa-prod/providers/Microsoft.KeyVault/vaults/usa-prod-vault

# Add secrets
az keyvault secret set \
  --vault-name usa-prod-vault \
  --name anthropic-api-key \
  --value "sk-ant-..."

az keyvault secret set \
  --vault-name usa-prod-vault \
  --name database-url \
  --value "postgresql://..."
```

## Verification

```bash
# Local development (with env vars)
export ANTHROPIC_API_KEY=sk-ant-...
npm run dev:api
curl http://localhost:3000/health

# Production (with Key Vault)
# Deploy to Azure, then:
curl https://<container-app-url>/health

# Test secret refresh endpoint (if implemented)
curl -X POST http://localhost:3000/admin/refresh-secrets \
  -H "Authorization: Bearer <admin-token>"
```

## Notes

- Managed Identity eliminates secret sprawl (no keys in environment)
- 5-minute cache reduces Key Vault API calls
- Fallback to env vars enables local development
- Secret rotation: update Key Vault, wait for cache expiry (or trigger refresh)
- RBAC-enabled Key Vault recommended over access policies
- Container App system-assigned identity simplest setup
