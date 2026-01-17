# Testing Guide

This guide covers the testing strategy and how to run tests for User Story Agent.

## Test Stack

| Tool | Purpose |
|------|---------|
| [Vitest](https://vitest.dev/) | Test runner |
| Node.js built-ins | Assertions, mocking |

## Running Tests

### All Tests

```bash
npm test
```

Runs unit tests in watch mode.

### Single Run

```bash
npm test -- --run
```

### Specific File

```bash
npm test -- src/shared/schemas.test.ts
```

### With Coverage

```bash
npm test -- --coverage
```

### E2E Tests

```bash
npm run test:e2e
```

Runs end-to-end tests with longer timeouts.

## Test Structure

```
tests/
├── agent/
│   ├── config.test.ts           # Configuration tests
│   ├── evaluator.test.ts        # Evaluator tests
│   ├── streaming.test.ts        # Streaming handler tests
│   ├── user-story-agent.test.ts # Main agent tests
│   └── state/
│       └── context-manager.test.ts
├── shared/
│   ├── iteration-registry.test.ts
│   ├── schemas.test.ts
│   └── skill-loader.test.ts
├── utils/
│   ├── logger.test.ts
│   └── retry.test.ts
└── e2e/
    └── cli.e2e.ts               # CLI integration tests
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { getIterationById, getAllIterations } from '../../src/shared/iteration-registry';

describe('iteration-registry', () => {
  describe('getIterationById', () => {
    it('returns iteration for valid ID', () => {
      const result = getIterationById('validation');

      expect(result).toBeDefined();
      expect(result?.id).toBe('validation');
      expect(result?.name).toBe('Validation');
    });

    it('returns undefined for invalid ID', () => {
      const result = getIterationById('not-real');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllIterations', () => {
    it('returns all iterations in workflow order', () => {
      const iterations = getAllIterations();

      expect(iterations.length).toBe(12);
      expect(iterations[0].id).toBe('user-roles');
      expect(iterations[11].id).toBe('analytics');
    });
  });
});
```

### Mocking Example

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeClient } from '../../src/agent/claude-client';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'mocked response' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  })),
}));

describe('ClaudeClient', () => {
  let client: ClaudeClient;

  beforeEach(() => {
    client = new ClaudeClient('test-api-key');
  });

  it('sends message and returns response', async () => {
    const response = await client.sendMessage({
      systemPrompt: 'You are helpful.',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response.content).toBe('mocked response');
    expect(response.usage.inputTokens).toBe(100);
  });
});
```

### Testing Async Code

```typescript
import { describe, it, expect } from 'vitest';
import { retry } from '../../src/utils/retry';

describe('retry', () => {
  it('retries failed operations', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'success';
    };

    const result = await retry(operation, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('throws after max retries', async () => {
    const operation = async () => {
      throw new Error('always fails');
    };

    await expect(retry(operation, { maxRetries: 2 }))
      .rejects.toThrow('always fails');
  });
});
```

### Testing Event Emitters

```typescript
import { describe, it, expect } from 'vitest';
import { StreamingHandler } from '../../src/agent/streaming';

describe('StreamingHandler', () => {
  it('emits start event', () => {
    const handler = new StreamingHandler('test-iteration');
    const events: unknown[] = [];

    handler.on('start', (event) => events.push(event));
    handler.start();

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'start',
      iterationId: 'test-iteration',
    });
  });

  it('accumulates chunks', () => {
    const handler = new StreamingHandler('test');
    const chunks: string[] = [];

    handler.on('chunk', (event) => chunks.push(event.accumulated));

    handler.handleChunk('Hello');
    handler.handleChunk(' World');

    expect(chunks).toEqual(['Hello', 'Hello World']);
  });
});
```

## E2E Testing

E2E tests run the actual CLI with a mock server.

### E2E Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { createMockServer } from './mock-server';

describe('CLI E2E', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeAll(async () => {
    mockServer = createMockServer();
    await mockServer.start(3456);
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('processes story in workflow mode', async () => {
    const result = await runCli([
      '--mode', 'workflow',
      '--product-type', 'web',
    ], 'Login form with email and password');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Acceptance Criteria');
  });
});

async function runCli(args: string[], stdin: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const proc = spawn('npm', ['run', 'agent', '--', ...args], {
      env: { ...process.env, ANTHROPIC_API_KEY: 'test' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);

    proc.stdin.write(stdin);
    proc.stdin.end();

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
```

## Test Configuration

### vitest.config.ts (Unit Tests)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
    globals: true,
  },
});
```

### vitest.config.e2e.ts (E2E Tests)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.e2e.ts'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 60000,
    hookTimeout: 30000,
    reporters: ['verbose'],
    bail: 1,
  },
});
```

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good: Tests the outcome
it('filters iterations by product type', () => {
  const webIterations = getApplicableIterations('web');
  expect(webIterations.some(i => i.id === 'responsive-native')).toBe(false);
});

// Bad: Tests internal details
it('calls filter method with correct predicate', () => {
  // ...testing implementation details
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('returns empty array when no iterations match product type', () => {});

// Bad
it('works', () => {});
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('validates email format', () => {
  // Arrange
  const schema = EmailSchema;
  const invalidEmail = 'not-an-email';

  // Act
  const result = schema.safeParse(invalidEmail);

  // Assert
  expect(result.success).toBe(false);
});
```

### 4. Isolate Tests

```typescript
describe('StoryState', () => {
  let state: StoryState;

  beforeEach(() => {
    // Fresh state for each test
    state = createInitialState('test story');
  });

  it('test 1', () => { /* uses fresh state */ });
  it('test 2', () => { /* uses fresh state */ });
});
```

### 5. Test Edge Cases

```typescript
describe('processUserStory', () => {
  it('handles empty input', async () => {
    const result = await agent.processUserStory('');
    expect(result.success).toBe(false);
  });

  it('handles whitespace-only input', async () => {
    const result = await agent.processUserStory('   \n\t  ');
    expect(result.success).toBe(false);
  });

  it('handles very long input', async () => {
    const longStory = 'a'.repeat(100000);
    const result = await agent.processUserStory(longStory);
    // Should handle gracefully
  });
});
```

## Debugging Tests

### Run Single Test

```bash
npm test -- --run -t "returns iteration for valid ID"
```

### Verbose Output

```bash
npm test -- --reporter=verbose
```

### Debug Mode

```bash
# With Node inspector
node --inspect-brk node_modules/.bin/vitest --run

# Then attach debugger in VS Code or Chrome DevTools
```

### Print Statements

```typescript
it('debugging example', () => {
  const result = someFunction();
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

## Continuous Integration

Tests run automatically on:
- Push to main branch
- Pull requests

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run test:e2e
```
