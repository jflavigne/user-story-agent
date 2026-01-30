# AUDIT-001: Token Estimation Accuracy

**Epic:** CODE-QUALITY
**Type:** Enhancement
**Priority:** Medium
**Status:** Ready
**Audit Date:** 2026-01-28
**Commit:** 70cfba0f201f4ca7563955769e39edb04d13ad26
**Category:** Correctness (Cost/Capacity Planning)

## Description

Token estimation uses crude `length / 4` formula. Claude models have variable tokenization, so estimates may be off by 20-30%, affecting budgeting and truncation decisions.

## Current Behavior
```typescript
// src/shared/iteration-registry.ts:217
tokenEstimate: Math.ceil(skill.prompt.length / 4), // Rough estimate: ~4 chars per token
```

## Expected Behavior

Use documented Claude tokenization rates or a proper token counter library.

## Acceptance Criteria
- [ ] Token estimates match actual usage within 10% margin
- [ ] Implementation uses documented rates or tokenization library
- [ ] Tests verify estimation accuracy with sample prompts

## Files
- `src/shared/iteration-registry.ts:217` - Replace `/4` formula
- `tests/shared/iteration-registry.test.ts` - Add estimation accuracy tests

## Verification
```bash
npm test -- iteration-registry.test.ts -t "token estimation"
```

## References
- Evidence: `.claude/session/audit/2026-01-28/code-analysis.log`
