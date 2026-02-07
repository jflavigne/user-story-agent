# Code Audit Report: user-story-agent (2026-02-06)

**Audit Level:** 2 (Standard)  
**Verdict:** APPROVED WITH IMPROVEMENTS  
**Summary:** 0 critical, 1 high, 2 medium, 4 low (unchanged from 2026-01-28 scope; one high resolved)

---

## Audit Evidence

**Repository State:**
- **Commit:** 3fcc3b5738bfb6df6974db7c92c48b548457bd7b
- **Date:** 2026-02-06

**Commands Executed:**
```bash
npm run lint          # PASS
npm run typecheck     # PASS
npm test              # 862 passed, 10 skipped (60 test files)
npm audit --json      # 1 moderate (esbuild/vite/vitest dev deps)
grep -r "TODO|FIXME|HACK" src/   # 0 matches
```

---

## Executive Summary

Re-audit of the user-story-agent codebase shows **AUDIT-002 (Evaluator Silent Error Handling) is fully implemented**. Quality gates pass; no new critical or high issues were introduced. One high-priority finding from the 2026-01-28 audit is now closed. Remaining open items are unchanged: streaming timeout (AUDIT-006), token/model/cache/docs (AUDIT-001, 003, 004, 005, 007, 008).

**Key Changes Since 2026-01-28:**
- **AUDIT-002 — CLOSED:** Evaluator uses `EvaluationError`, `strictEvaluation`, and `evaluationFailed`; CLI exits non-zero and distinguishes "Evaluation failed" vs "Validation failed"; `--debug` prints full stack; unit and integration tests cover behavior and CLI exit code.

---

## Quality Gates

| Check        | Result |
|-------------|--------|
| Lint        | PASS   |
| TypeScript  | PASS   |
| Tests       | PASS (862 passed, 10 skipped) |
| TODO/FIXME  | 0 in `src/` |
| npm audit   | 1 moderate (dev deps: esbuild GHSA-67mh-4wv8-2f99; fix: vitest 4.x) |

---

## Findings by Category

### Error Handling & Resilience

**AUDIT-002 (Evaluator Silent Failures) — IMPLEMENTED**

- **Evidence:**  
  - `src/agent/evaluator.ts`: `EvaluationError` class; `strictEvaluation` constructor option (default `true`); catch block logs at ERROR, throws in strict mode, returns `evaluationFailed: true` and `EVAL_ERROR:` reasoning in non-strict.  
  - `src/shared/schemas.ts`: `VerificationResultSchema` includes `evaluationFailed: z.boolean().optional()`.  
  - `src/cli.ts`: Detects `verification?.evaluationFailed === true`, logs clear message, `process.exit(1)`; labels "Evaluation failed (evaluator crashed)" vs "Validation failed (content issues)"; `--debug` prints `error.stack` and `EvaluationError.cause.stack`.  
  - `tests/agent/evaluator.test.ts`: Parse/API error non-strict, strict throw, and "distinguish eval crash from validation failure" covered.  
  - `tests/integration/evaluator-exit-code.test.ts`: CLI with mocked evaluator crash exits with code 1.

**AUDIT-006 (Streaming Timeout) — OPEN**

- **File:** `src/agent/claude-client.ts` (e.g. ~306: `client.messages.stream()`).  
- **Issue:** No timeout on streaming call; prolonged network issues can hang the process.  
- **Recommendation:** Add AbortController or Promise.race with configurable timeout (e.g. 60s default).

**AUDIT-003 (Streaming Error Propagation) — OPEN**

- **Status:** Dual error path (stream events + throw) still present; no new documentation or test for empty-stream behavior.

---

### Correctness & Configuration

**AUDIT-001 (Token Estimation) — PARTIALLY ADDRESSED**

- **Current:** `src/shared/token-estimate.ts` uses `CHARS_PER_TOKEN = 3.5` and `estimateClaudeInputTokens()`; iteration registry and prompts use this shared helper.  
- **Gap:** Ticket suggested "tokenization library or accuracy tests"; project uses a fixed factor (3.5) and has `tests/shared/token-estimate.test.ts`. No external tokenizer; acceptable for estimation use case.

**AUDIT-004 (Model Validation) — OPEN**

- **Status:** No `KNOWN_MODELS` or invalid-model validation in config; bad model name still fails at API call with SDK error.

---

### Reliability & Observability

**AUDIT-005 (Skills Cache) — OPEN**

- **Status:** No TTL/LRU or analysis doc; cache behavior unchanged.

**AUDIT-007 (Verification Score Semantics) — OPEN**

- **Status:** `score` in VerificationResultSchema still without JSDoc explaining semantics.

**AUDIT-008 (Logger Timestamp) — OPEN**

- **Status:** Logger timestamp format unchanged (no date component).

---

### Security & Supply Chain

- **Secrets:** No hardcoded credentials; API key via env.  
- **npm audit:** 1 moderate (esbuild via vite/vitest); dev-only. Fix available with vitest 4.0.18 (semver major).  
- **Input validation:** Zod schemas and path/iteration validation in place.

---

## Priority Summary

| Priority | Count | Tickets |
|----------|-------|---------|
| **High**   | 1 open  | AUDIT-006 (streaming timeout) |
| **Medium**| 2       | AUDIT-001 (token — improved), AUDIT-003 (streaming clarity) |
| **Low**   | 4       | AUDIT-004, 005, 007, 008 |

**Resolved since 2026-01-28:** AUDIT-002 (evaluator silent failures).

---

## Recommendations

1. **AUDIT-002:** Consider marking ticket **Done** and moving to archive; implementation and tests are complete.  
2. **AUDIT-006:** Add streaming timeout (AbortController or Promise.race) as next high-priority reliability fix.  
3. **AUDIT-2026-02-06-IMPLEMENTATION.md:** Update to reflect AUDIT-002 as implemented (that doc was written when AUDIT-002 was still missing in code).

---

## References

- Previous audit: `tickets/AUDIT-2026-01-28-SUMMARY.md`
- Implementation snapshot: `tickets/AUDIT-2026-02-06-IMPLEMENTATION.md` (pre-dates AUDIT-002 completion)
- Ticket: `tickets/AUDIT-002.md`
