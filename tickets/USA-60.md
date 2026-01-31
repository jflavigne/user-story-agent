# USA-60: Make Benchmark Scratchpad Path Configurable

**Status**: Done
**Priority**: P2
**Created**: 2026-01-31
**Completed**: 2026-01-31
**Found During**: Code review of real-benchmark.ts

## Problem

The `real-benchmark.ts` script has a hardcoded scratchpad path:
```typescript
const SCRATCHPAD = '/private/tmp/claude/-Users-jflavigne-user-story-agent/824d0327-987b-41ae-9761-490cfc4f3b58/scratchpad';
```

This path is session-specific and user-specific, breaking portability and reproducibility when:
- Run by other users
- Run in different Claude Code sessions
- Run in CI/CD environments

## Location

`scripts/real-benchmark.ts:18`

## Proposed Solution

Make the scratchpad path configurable via environment variable or CLI argument:

```typescript
const SCRATCHPAD = process.env.BENCHMARK_SCRATCHPAD || './benchmark-fixtures';
```

Or use project-relative paths for fixture data.

## Acceptance Criteria

- [x] Scratchpad path can be configured via environment variable
- [x] Script provides clear error message if fixtures not found
- [ ] README documents how to set up benchmark fixtures (deferred)
- [x] Script works for any user without path modification

## Implementation

Changed `scripts/real-benchmark.ts:18`:
- Replaced hardcoded path with `process.env.BENCHMARK_SCRATCHPAD || './benchmark-fixtures'`
- Added validation with `existsSync()` and helpful error message
- Defaults to `./benchmark-fixtures` for local development

## Impact

**Severity**: P2 (Medium)
**Risk**: Low - isolated to benchmark script
