# AUDIT-003: Streaming Error Propagation Clarity

**Epic:** CODE-QUALITY
**Type:** Enhancement
**Priority:** Medium
**Status:** Done
**Audit Date:** 2026-01-28
**Commit:** 70cfba0f201f4ca7563955769e39edb04d13ad26
**Category:** Reliability (Error Handling Clarity)

## Description

Empty streaming responses trigger both `handler.error()` AND `throw`, creating dual error paths. Behavior is unclear to consumers.

## Current Behavior
```typescript
// src/agent/claude-client.ts:336-342
if (!handler.accumulated.trim()) {
  const errorMsg = 'Streaming response contained no text content';
  logger.warn(errorMsg);
  handler.error(new Error(errorMsg)); // Emits error event
  throw new Error(errorMsg);           // Also throws exception
}
```

## Expected Behavior

Document whether this is intentional (error propagates to both event listeners AND caller). Add test verifying behavior.

## Acceptance Criteria
- [x] Test added: verify empty stream emits error event AND throws
- [x] JSDoc comment explains dual error path is intentional
- [x] Or: remove dual path if redundant (N/A: dual path retained as intentional)

## Files
- `src/agent/claude-client.ts:336-342` - Add clarifying comment or remove redundancy
- `tests/agent/claude-client.test.ts` - Test empty stream error handling

## Verification
```bash
npm test -- claude-client.test.ts -t "empty.*stream"
```

## References
- Evidence: `.claude/session/audit/2026-01-28/code-analysis.log`
