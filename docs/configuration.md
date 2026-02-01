# Configuration Reference

Complete reference for configuring User Story Agent.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | API key for Anthropic Claude API |
| `LOG_LEVEL` | No | `info` | Logging level |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-20250514` | Default model |

### ANTHROPIC_API_KEY

Your Anthropic API key. Get one from [console.anthropic.com](https://console.anthropic.com/).

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### LOG_LEVEL

Controls logging verbosity:

| Level | Description |
|-------|-------------|
| `silent` | No output |
| `error` | Errors only |
| `warn` | Errors and warnings |
| `info` | Normal operation (default) |
| `debug` | Verbose debugging |

```bash
export LOG_LEVEL=debug
```

## CLI Configuration

### Mode Configuration

#### Individual Mode

```bash
npm run agent -- --mode individual --iterations <ids>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--iterations` | Yes | Comma-separated iteration IDs |

#### Workflow Mode

```bash
npm run agent -- --mode workflow --product-type <type>
```

| Option | Required | Description |
|--------|----------|-------------|
| `--product-type` | Yes | Product type for filtering |

#### Interactive Mode

```bash
npm run agent -- --mode interactive
```

No additional required options. User selects iterations at runtime.

### I/O Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `--input <file>` | stdin | Read input from file |
| `--output <file>` | stdout | Write output to file |

### API Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `--api-key <key>` | `ANTHROPIC_API_KEY` | API key (prefer env var) |
| `--model <model>` | `claude-sonnet-4-20250514` | Claude model |
| `--max-retries <n>` | `3` | Max retry attempts |

### Feature Flags

| Option | Default | Description |
|--------|---------|-------------|
| `--stream` | `false` | Enable streaming output |
| `--verify` | `false` | Enable output verification |

### Logging Flags

| Option | Description |
|--------|-------------|
| `--verbose` | Set log level to `info` |
| `--debug` | Set log level to `debug` |
| `--quiet` | Set log level to `error` |

## Iteration Prompts (Markdown)

Workflow iteration prompts (user-roles, validation, accessibility, etc.) are loaded from **markdown files with YAML frontmatter** in `src/prompts/iterations/`. This is separate from the skill loader (which loads Anthropic Agent Skills from SKILL.md).

### Initialization

The CLI and any programmatic use must call **`initializeIterationPrompts(promptsDir)`** at startup before creating the agent. The CLI does this automatically with default path `src/prompts/iterations`. If the directory is missing or contains no valid `.md` files, startup fails with a clear error.

```typescript
import { initializeIterationPrompts, createAgent } from 'user-story-agent';
import path from 'path';

await initializeIterationPrompts(path.join(process.cwd(), 'src', 'prompts', 'iterations'));
const agent = createAgent(config);
```

### Frontmatter Schema

Each iteration `.md` file must have frontmatter with these fields:

| Field            | Type    | Required | Notes |
|------------------|---------|----------|--------|
| `id`             | string  | yes      | Unique iteration id (e.g. `user-roles`, `validation`) |
| `name`           | string  | yes      | Human-readable name |
| `description`    | string  | yes      | What the iteration does |
| `category`       | string  | yes      | One of: `roles`, `elements`, `validation`, `quality`, `responsive`, `i18n`, `analytics`, `post-processing` |
| `order`          | number  | yes      | Processing order (lower first) |
| `applicableWhen` | string  | no       | When this iteration applies |
| `applicableTo`   | string  | no       | `all` or comma-separated: `web`, `mobile-native`, `mobile-web`, `desktop`, `api` |
| `allowedPaths`   | string  | no       | Comma-separated patch paths (e.g. `story.asA, outcomeAcceptanceCriteria`). If omitted, registry fallback is used |
| `outputFormat`   | string  | no       | `patches` (default) |
| `supportsVision` | boolean | no       | Whether iteration supports image input |

Body = prompt text (markdown), trimmed.

### Coexistence

- **story-interconnection** and **system-discovery** remain in TypeScript (builder logic / system-prompt usage).
- **loadIterationsFromSkills(skillsDir)** remains for backward compatibility and populates the same cache.

## Programmatic Configuration

### UserStoryAgentConfig

```typescript
interface UserStoryAgentConfig {
  mode: 'individual' | 'workflow' | 'interactive';
  iterations?: IterationId[];
  productContext?: ProductContext;
  apiKey?: string;
  model?: string;
  onIterationSelection?: IterationSelectionCallback;
  maxRetries?: number;
  streaming?: boolean;
  verify?: boolean;
}
```

### Configuration Examples

#### Minimal (Individual Mode)

```typescript
const config: UserStoryAgentConfig = {
  mode: 'individual',
  iterations: ['validation', 'accessibility'],
};
```

#### Workflow Mode with Context

```typescript
const config: UserStoryAgentConfig = {
  mode: 'workflow',
  productContext: {
    productName: 'MyApp',
    productType: 'web',
    clientInfo: 'Acme Corp',
    targetAudience: 'Business users',
    keyFeatures: ['Dashboard', 'Reports'],
    businessContext: 'SaaS analytics platform',
  },
};
```

#### Full Configuration

```typescript
const config: UserStoryAgentConfig = {
  mode: 'workflow',
  productContext: {
    productName: 'HealthApp',
    productType: 'mobile-native',
    clientInfo: 'HealthCo',
    targetAudience: 'Adults 25-55',
    keyFeatures: ['Tracking', 'Reports', 'Goals'],
    businessContext: 'Subscription health app',
    specificRequirements: 'HIPAA compliance required',
    i18nRequirements: 'English, Spanish, French',
  },
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-sonnet-4-20250514',
  maxRetries: 5,
  streaming: true,
  verify: true,
};
```

#### Interactive Mode

```typescript
const config: UserStoryAgentConfig = {
  mode: 'interactive',
  onIterationSelection: async (options) => {
    // Show UI, return selected IDs
    return ['validation', 'accessibility', 'security'];
  },
};
```

### Using Configuration Helpers

```typescript
import {
  loadConfigFromEnv,
  mergeConfigWithDefaults,
} from 'user-story-agent';

// Load from environment
const envConfig = loadConfigFromEnv();

// Merge with your overrides
const config = mergeConfigWithDefaults({
  ...envConfig,
  mode: 'workflow',
  productContext: { /* ... */ },
});
```

## Product Types

| Type | Description | Use Case |
|------|-------------|----------|
| `web` | Web applications | Browser-based apps, SPAs |
| `mobile-native` | Native iOS/Android | Swift/Kotlin apps |
| `mobile-web` | Mobile web / PWA | Responsive web, PWAs |
| `desktop` | Desktop applications | Electron, native desktop |
| `api` | API/backend | REST/GraphQL services |

### Product Type Iteration Filtering

| Product Type | Included Iterations |
|--------------|---------------------|
| `web` | All except `responsive-native` |
| `mobile-native` | All except `responsive-web` |
| `mobile-web` | All except `responsive-native` |
| `desktop` | All except `responsive-*` |
| `api` | `user-roles`, `validation`, `security`, `performance` |

## Model Selection

### Available Models

| Model | Best For |
|-------|----------|
| `claude-sonnet-4-20250514` | Default, balanced |
| `claude-opus-4-20250514` | Complex analysis |
| `claude-3-5-haiku-20241022` | Fast, simple tasks |

### Model Configuration

```bash
# CLI
npm run agent -- --mode workflow --product-type web --model claude-opus-4-20250514

# Environment
export CLAUDE_MODEL=claude-opus-4-20250514
```

```typescript
// Programmatic
const agent = createAgent({
  mode: 'workflow',
  model: 'claude-opus-4-20250514',
  // ...
});
```

## Retry Configuration

The agent automatically retries failed API calls with exponential backoff.

| Setting | Default | Description |
|---------|---------|-------------|
| `maxRetries` | `3` | Maximum retry attempts |
| Base delay | `1000ms` | Initial retry delay |
| Max delay | `10000ms` | Maximum retry delay |
| Backoff | Exponential | Delay doubles each retry |

### Retryable Errors

- `429` - Rate limited
- `500` - Server error
- `502` - Bad gateway
- `503` - Service unavailable
- `504` - Gateway timeout
- Network errors

### Non-Retryable Errors

- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found

## Streaming Configuration

Enable streaming for real-time output:

```bash
npm run agent -- --mode workflow --product-type web --stream
```

```typescript
const agent = createAgent({
  mode: 'workflow',
  streaming: true,
  // ...
});

agent.on('stream', (event) => {
  if (event.type === 'chunk') {
    process.stdout.write(event.content);
  }
});
```

## Verification Configuration

Enable output verification to quality-check each iteration:

```bash
npm run agent -- --mode workflow --product-type web --verify
```

```typescript
const agent = createAgent({
  mode: 'workflow',
  verify: true,
  // ...
});

// Results include verification data
const result = await agent.processUserStory(story);
for (const ir of result.iterationResults) {
  if (ir.verification && !ir.verification.passed) {
    console.warn(`${ir.iterationId}: ${ir.verification.reasoning}`);
  }
}
```

## Skills Configuration

The agent can load iterations from either:

1. **TypeScript metadata** (default, synchronous)
2. **SKILL.md files** (async, Anthropic Skills format)

### Using Skills Files

```typescript
import { initializeSkillsCache } from 'user-story-agent';

// Initialize at startup
await initializeSkillsCache('.claude/skills/user-story');

// Now agent uses skills instead of TypeScript metadata
const agent = createAgent({ /* ... */ });
```

### Custom Skills Directory

```typescript
await initializeSkillsCache('/path/to/custom/skills');
```
