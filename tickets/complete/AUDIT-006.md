# AUDIT-006: Streaming Timeout Missing

**Epic:** CODE-QUALITY - Code Quality Improvements
**Type:** Bug
**Priority:** High
**Status:** Done
**Dependencies:** None
**Audit Date:** 2026-01-28
**Audit Level:** 2 (Standard)
**Commit:** 70cfba0f201f4ca7563955769e39edb04d13ad26
**Category:** Reliability (Hang Prevention)

## Description

Streaming API requests via `client.messages.stream()` do not configure a timeout. If network issues occur, the stream creation may hang indefinitely, wedging the agent.

## Problem Statement

"Timeouts turn rare network weirdness into agent wedged forever."

Current code creates stream without timeout configuration:
```typescript
// src/agent/claude-client.ts:300
const stream = await this.client.messages.stream({
  model: modelToUse,
  max_tokens: maxTokens,
  system: systemPrompt,
  messages: messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  })),
});
```

No timeout parameter visible. Anthropic SDK may have a default, but it's not explicitly configured.

## Current Behavior

- Stream hangs on network issues (server unresponsive, TCP stall, etc.)
- No timeout enforced at application level
- User must manually kill process
- No typed TimeoutError to handle gracefully

## Expected Behavior

Streaming requests should abort after configurable timeout:

```typescript
const STREAM_TIMEOUT_MS = config.streamTimeout ?? 60000; // 60s default

// Option A: AbortController + setTimeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

try {
  const stream = await this.client.messages.stream({
    model: modelToUse,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    signal: controller.signal, // If SDK supports it
  });

  clearTimeout(timeoutId);
  // ... process stream
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    throw new TimeoutError(`Stream creation timed out after ${STREAM_TIMEOUT_MS}ms`);
  }
  throw error;
}
```

## Acceptance Criteria

- [x] Streaming requests have configurable timeout (default: 60s)
- [x] Timeout enforced via AbortController or Promise.race
- [x] Timeout triggers typed TimeoutError (not generic Error)
- [x] CLI config: `--stream-timeout <ms>` or STREAM_TIMEOUT_MS env var
- [x] Test added: mock slow API response, verify timeout aborts
- [x] Test added: verify TimeoutError type and message
- [x] Documentation updated with timeout behavior

## Files

### Modified Files
- `src/agent/claude-client.ts:300` - Add timeout enforcement
- `src/agent/types.ts` - Add TimeoutError class
- `src/agent/config.ts` - Add streamTimeout config option
- `src/cli.ts` - Add --stream-timeout flag
- `tests/agent/claude-client.test.ts` - Add timeout tests

## Technical Notes

**Implementation Options:**

1. **AbortController** (preferred if Anthropic SDK supports it)
   - Standard Web API
   - Clean cancellation
   - Works with fetch-based implementations

2. **Promise.race** (fallback)
   ```typescript
   const timeoutPromise = new Promise((_, reject) =>
     setTimeout(() => reject(new TimeoutError('Stream timeout')), timeout)
   );

   const stream = await Promise.race([
     this.client.messages.stream(...),
     timeoutPromise
   ]);
   ```

**Configuration:**
```typescript
export interface UserStoryAgentConfig {
  // ... existing fields
  streamTimeout?: number; // milliseconds, default 60000
}
```

## Verification

```bash
# Test timeout enforcement
npm test -- claude-client.test.ts -t timeout

# Manual test with slow mock server
# (verify abort after configured timeout)

# Check timeout is configurable
node dist/cli.js --help | grep stream-timeout
```

## References

- Audit Report: AUDIT-2026-01-28-SUMMARY.md
- Evidence: `.claude/session/audit/2026-01-28/code-analysis.log`
- Anthropic SDK docs: Check if `signal` parameter supported
- Related: AUDIT-003 (streaming error propagation)
