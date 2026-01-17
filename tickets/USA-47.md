# USA-47: Docker & Infrastructure Files

**Epic:** USA - User Story Agent
**Type:** Infrastructure
**Priority:** High
**Status:** Ready
**Dependencies:** USA-34

## Description

Create Docker configuration for local development and Azure Container Apps deployment. Include docker-compose for local services (PostgreSQL, Redis) and Bicep templates for Azure infrastructure.

## Problem Statement

- No containerized deployment option
- Local development requires manual service setup
- No infrastructure as code for Azure resources
- Need consistent environments across dev/staging/prod

## Acceptance Criteria

- [ ] Create optimized multi-stage Dockerfile
- [ ] Create docker-compose.yml for local development
- [ ] Include PostgreSQL, Redis, and API service
- [ ] Create Bicep template for Azure infrastructure
- [ ] Configure Container App with Managed Identity
- [ ] Set up Key Vault, PostgreSQL, Storage, App Insights
- [ ] Create deployment scripts
- [ ] Document environment variables

## Files

### New Files
- `Dockerfile` - Multi-stage build
- `docker-compose.yml` - Local development services
- `.dockerignore` - Build optimization
- `infra/main.bicep` - Azure infrastructure
- `infra/modules/` - Bicep modules
- `scripts/deploy.sh` - Deployment script

## Technical Notes

### Dockerfile

```dockerfile
# Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (cache layer)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy skills directory (needed at runtime)
COPY .claude/skills ./skills

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/api/server.js"]
```

### .dockerignore

```
# .dockerignore
node_modules
dist
.git
.github
*.md
!README.md
.env*
.vscode
.idea
coverage
tests
*.test.ts
*.spec.ts
docs
tickets
.claude/session
*.log
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build:
      context: .
      target: production
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/user_story_agent
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: user_story_agent
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # Optional: pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@localhost.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres
    profiles:
      - tools

volumes:
  postgres_data:
  redis_data:
```

### Azure Infrastructure (Bicep)

```bicep
// infra/main.bicep
@description('Environment name (dev, staging, prod)')
param environment string = 'dev'

@description('Location for resources')
param location string = resourceGroup().location

@description('Anthropic API key (stored in Key Vault)')
@secure()
param anthropicApiKey string

var prefix = 'usa-${environment}'
var tags = {
  environment: environment
  project: 'user-story-agent'
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enabledForDeployment: false
    enabledForTemplateDeployment: false
  }
}

// Store Anthropic API key
resource anthropicSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'anthropic-api-key'
  properties: {
    value: anthropicApiKey
  }
}

// PostgreSQL Flexible Server
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${prefix}-postgres'
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '15'
    administratorLogin: 'pgadmin'
    administratorLoginPassword: 'P@ssw0rd${uniqueString(resourceGroup().id)}!'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
  }
}

// PostgreSQL Database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: 'user_story_agent'
}

// Storage Account for mockups
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${replace(prefix, '-', '')}storage'
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// Blob container for mockups
resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storage.name}/default/mockups'
  properties: {
    publicAccess: 'None'
  }
}

// Container Apps Environment
resource containerEnv 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: '${prefix}-env'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: '${prefix}-api'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'http'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      secrets: [
        {
          name: 'database-url'
          value: 'postgresql://pgadmin:P@ssw0rd${uniqueString(resourceGroup().id)}!@${postgres.properties.fullyQualifiedDomainName}:5432/user_story_agent?sslmode=require'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: 'ghcr.io/your-org/user-story-agent:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'AZURE_KEYVAULT_URL'
              value: keyVault.properties.vaultUri
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'AZURE_STORAGE_ACCOUNT_NAME'
              value: storage.name
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-scale'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

// Grant Container App access to Key Vault
resource kvAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, containerApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Grant Container App access to Storage
resource storageAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, containerApp.id, 'Storage Blob Data Contributor')
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Outputs
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsKey string = appInsights.properties.InstrumentationKey
```

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-dev}
RESOURCE_GROUP="rg-usa-${ENVIRONMENT}"
LOCATION="eastus"

echo "Deploying to ${ENVIRONMENT}..."

# Create resource group if not exists
az group create --name $RESOURCE_GROUP --location $LOCATION

# Get Anthropic API key from environment or prompt
if [ -z "$ANTHROPIC_API_KEY" ]; then
  read -sp "Enter Anthropic API Key: " ANTHROPIC_API_KEY
  echo
fi

# Deploy infrastructure
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file infra/main.bicep \
  --parameters environment=$ENVIRONMENT \
  --parameters anthropicApiKey=$ANTHROPIC_API_KEY

# Get outputs
CONTAINER_APP_URL=$(az deployment group show \
  --resource-group $RESOURCE_GROUP \
  --name main \
  --query properties.outputs.containerAppUrl.value -o tsv)

echo ""
echo "Deployment complete!"
echo "API URL: $CONTAINER_APP_URL"
echo "Health check: curl $CONTAINER_APP_URL/health"
```

## Verification

```bash
# Local development
docker-compose up -d
curl http://localhost:3000/health

# Run migrations
docker-compose exec api npm run db:migrate

# View logs
docker-compose logs -f api

# Azure deployment
./scripts/deploy.sh dev

# Check deployment
curl https://<container-app-url>/health
```

## Notes

- Multi-stage build reduces image size (~150MB)
- Non-root user for security
- Health checks for orchestration
- Burstable PostgreSQL tier for cost optimization (~$15/month)
- Container Apps auto-scales 1-3 replicas
- Managed Identity for all Azure service authentication
- 30-day log retention in Log Analytics
