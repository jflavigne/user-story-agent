# AUDIT-002: Evaluator Silent Error Handling

**Epic:** CODE-QUALITY - Code Quality Improvements
**Type:** Bug
**Priority:** High
**Status:** Complete
**Dependencies:** None
**Audit Date:** 2026-01-28
**Audit Level:** 2 (Standard)
**Commit:** 70cfba0f201f4ca7563955769e39edb04d13ad26
**Category:** Reliability (Silent Failures)

## Description

When the evaluator crashes during verification, it catches the exception and returns a "failed verification" result without indicating that the evaluation itself failed. User sees `passed: false` but doesn't know evaluation crashed vs. validation genuinely failed.

## Problem Statement

Silent failures are how systems lie politely. The current behavior:
1. Evaluator crashes (network error, API failure, schema validation, etc.)
2. Exception caught at line 85
3. Logs at WARN level: `Evaluation failed for iteration`
4. Returns `{passed: false, score: 0.0, reasoning: "Evaluation error: ..."}`
5. Workflow continues as if evaluation ran successfully

User cannot distinguish "content failed validation" from "evaluator crashed".

## Current Behavior

```typescript
// src/agent/evaluator.ts:85-105
catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  logger.warn(`Evaluation failed for iteration ${iterationId}: ${errorMessage}`);

  return {
    passed: false,
    score: 0.0,
    reasoning: `Evaluation error: ${errorMessage}`,
    issues: [{
      severity: 'error',
      category: 'evaluation',
      description: `Failed to evaluate iteration: ${errorMessage}`,
      suggestion: 'Review the iteration output manually',
    }],
  };
}
```

## Expected Behavior

Evaluation failures should be distinguishable from validation failures:

**Option A: CLI Exit Code (Recommended)**
```typescript
catch (error) {
  logger.error(`Evaluation crashed for ${iterationId}: ${error.message}`);

  if (config.strictEvaluation) {
    throw new EvaluationError(`Evaluation failed: ${error.message}`, { cause: error });
  }

  // Non-strict mode: return failed result but mark it as "evaluation error"
  return {
    passed: false,
    score: 0.0,
    reasoning: `EVAL_ERROR: ${error.message}`,
    evaluationFailed: true, // NEW FLAG
    issues: [...]
  };
}
```

**Option B: Separate Error Channel**
- Add `evaluationError?: Error` field to VerificationResult
- CLI checks this field and exits non-zero
- Verbose mode (`--debug`) prints full stack trace

## Acceptance Criteria

- [ ] When evaluator crashes, CLI exits with non-zero code
- [ ] Error message clearly states "Evaluation failed" vs "Validation failed"
- [ ] Default mode: single-line error summary to stderr
- [ ] Verbose mode (`--debug`): full stack trace
- [ ] Test added: mock API failure, verify CLI exits non-zero
- [ ] Test added: verify error message distinguishes eval crash from validation failure
- [ ] Re-running audit shows no "silent failures" warnings

## Files

### Modified Files
- `src/agent/evaluator.ts:85-105` - Add evaluationFailed flag or throw
- `src/shared/schemas.ts` - Add optional evaluationFailed field to VerificationResultSchema
- `src/agent/types.ts` - Update VerificationResult type
- `src/cli.ts` - Check evaluationFailed field, exit non-zero if set
- `tests/agent/evaluator.test.ts` - Add tests for evaluation crash scenarios

## Technical Notes

**Design Tradeoff:**
- Throwing exceptions = simpler (crash is visible immediately)
- Returning error flag = allows workflow to continue with degraded state

**Recommendation:** Add config option `strictEvaluation: boolean`
- `true` (default): throw on eval crash (fail fast)
- `false`: return error flag (continue with degraded state)

## Verification

```bash
# Test evaluation crash handling
npm test -- evaluator.test.ts

# Verify CLI exits non-zero on eval crash
# (manual test with mocked API failure)

# Re-run audit to confirm fix
grep -r "silent.*failure" .claude/session/audit/*/code-analysis.log
```

## References

- Audit Report: AUDIT-2026-01-28-SUMMARY.md
- Evidence: `.claude/session/audit/2026-01-28/code-analysis.log`
- Quote: "Silent failures are how systems lie politely"
- Related: Error handling best practices (McConnell, Code Complete)
