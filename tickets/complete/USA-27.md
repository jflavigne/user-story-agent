# USA-27: Error Recovery & Retry Logic

**Epic:** USA - User Story Agent
**Type:** Enhancement
**Priority:** Critical
**Dependencies:** USA-13, USA-16

## Description

Add robust error handling with retry logic and graceful degradation for API failures. Currently, API failures terminate the entire pipeline with no recovery mechanism. This ticket implements exponential backoff retry, typed error classes, and fallback strategies.

## Problem Statement

- API failures (rate limits, timeouts, server errors) terminate the entire pipeline
- No retry mechanism for transient failures
- Error messages are not actionable for users
- No distinction between retryable and non-retryable errors

## Acceptance Criteria

- [ ] Create `src/utils/retry.ts` with generic retry wrapper
- [ ] Create `src/shared/errors.ts` with typed error hierarchy
- [ ] Implement exponential backoff with jitter
- [ ] Add retry logic to `ClaudeClient.sendMessage()`
- [ ] Classify errors as retryable vs non-retryable:
  - Retryable: 429, 500, 502, 503, 504, network errors
  - Non-retryable: 400, 401, 403, validation errors
- [ ] Add graceful degradation in `UserStoryAgent`:
  - If iteration fails after retries, skip and continue
  - Log warning with error details
  - Include failed iterations in final summary
- [ ] Add `--max-retries` CLI flag (default: 3)
- [ ] Create unit tests for retry logic
- [ ] Update E2E tests to verify error handling

## Files

### New Files
- `src/utils/retry.ts` - Generic retry wrapper with exponential backoff (~80 lines)
- `src/shared/errors.ts` - Typed error class hierarchy (~60 lines)
- `tests/utils/retry.test.ts` - Unit tests for retry logic

### Modified Files
- `src/agent/claude-client.ts` - Add retry wrapper to API calls
- `src/agent/user-story-agent.ts` - Add graceful degradation logic
- `src/agent/types.ts` - Add error-related types
- `src/cli.ts` - Add --max-retries flag

## Status: COMPLETE (2026-01-31)

## Technical Notes

### Error Hierarchy

```typescript
// src/shared/errors.ts
export class AgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}

export class APIError extends AgentError {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean,
    cause?: Error
  ) {
    super(message, `API_${statusCode}`, cause);
    this.name = 'APIError';
  }
}

export class ValidationError extends AgentError {
  constructor(
    message: string,
    public field: string,
    cause?: Error
  ) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends AgentError {
  constructor(message: string, cause?: Error) {
    super(message, 'TIMEOUT', cause);
    this.name = 'TimeoutError';
  }
}
```

### Retry Logic

```typescript
// src/utils/retry.ts
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (!options.shouldRetry?.(lastError) ?? true) {
        throw lastError;
      }

      if (attempt < options.maxAttempts) {
        const delay = calculateBackoff(attempt, options);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error });
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

function calculateBackoff(attempt: number, options: RetryOptions): number {
  const exponentialDelay = options.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return Math.min(exponentialDelay + jitter, options.maxDelayMs);
}
```

### Retryable Error Detection

```typescript
function isRetryable(error: Error): boolean {
  if (error instanceof APIError) {
    return error.retryable;
  }
  if (error instanceof TimeoutError) {
    return true;
  }
  // Network errors
  if (error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')) {
    return true;
  }
  return false;
}
```

### Graceful Degradation

```typescript
// In UserStoryAgent.runIteration()
try {
  result = await this.executeIteration(iteration);
} catch (error) {
  if (error instanceof AgentError) {
    logger.warn(`Iteration "${iteration.id}" failed, skipping`, { error });
    this.state.failedIterations.push({
      id: iteration.id,
      error: error.message
    });
    return null; // Skip this iteration
  }
  throw error; // Re-throw unexpected errors
}
```

## Verification

```bash
# Run retry unit tests
npm test -- --grep "retry"

# Test with simulated failures (E2E tests)
npm run test:e2e -- --grep "API errors"

# Manual test with rate limiting
# (Requires Anthropic API that hits rate limits)
```

## References

- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Anthropic Rate Limits](https://docs.anthropic.com/en/api/rate-limits)
