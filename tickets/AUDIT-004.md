# AUDIT-004: Model Validation Missing

**Epic:** CODE-QUALITY
**Type:** Enhancement
**Priority:** Low
**Status:** Ready
**Audit Date:** 2026-01-28
**Commit:** 70cfba0f201f4ca7563955769e39edb04d13ad26
**Category:** Correctness (Fail-Fast on Bad Input)

## Description

No validation of model name before API call. Bad model name fails on first API call with opaque error.

## Current Behavior
```typescript
// src/agent/config.ts:52
model: partial.model ?? DEFAULT_MODEL,
```

No validation that model string is valid.

## Expected Behavior

Validate model name format + allowlist from config (not hardcoded list that rots):
```typescript
const KNOWN_MODELS = ['claude-sonnet-4-20250514', 'claude-opus-4-...'];
if (model && !KNOWN_MODELS.includes(model) && !model.startsWith('claude-')) {
  throw new Error(`Invalid model: ${model}. Valid: ${KNOWN_MODELS.join(', ')}`);
}
```

## Acceptance Criteria
- [ ] Invalid model name fails fast with clear error + suggested valid values
- [ ] Test: invalid model name throws before API call

## Files
- `src/agent/config.ts` - Add validation
- `tests/agent/config.test.ts` - Test invalid model

## References
- Evidence: `.claude/session/audit/2026-01-28/findings-verified.log`
