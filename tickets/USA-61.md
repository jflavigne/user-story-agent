# USA-61: Clean Up Redundant Error Handling in Benchmark Scripts

**Status**: Done
**Priority**: P2
**Created**: 2026-01-31
**Completed**: 2026-01-31
**Found During**: Code review of real-benchmark.ts

## Problem

The `real-benchmark.ts` script has redundant error handling with unclear exit behavior:

```typescript
// Inside main() function
try {
  // ... benchmark logic
} catch (error) {
  console.error('\n[BENCHMARK ERROR]', error);
  process.exitCode = 1;  // Non-immediate exit
}

// At module level
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;  // Redundant
});
```

Issues:
1. Double error handling catches the same errors
2. Uses `process.exitCode = 1` instead of `process.exit(1)`, which allows process to continue
3. In CI/CD environments, non-immediate exit can cause confusion

## Location

`scripts/real-benchmark.ts:190-199`

## Proposed Solution

Choose one approach:

**Option A**: Remove inner try-catch, keep outer catch
```typescript
async function main() {
  // No try-catch here
  // ... benchmark logic
}

main().catch((err) => {
  console.error('[BENCHMARK ERROR]', err);
  process.exit(1);  // Immediate exit
});
```

**Option B**: Keep inner try-catch, remove outer catch
```typescript
async function main() {
  try {
    // ... benchmark logic
  } catch (error) {
    console.error('\n[BENCHMARK ERROR]', error);
    process.exit(1);  // Immediate exit
  }
}

main();
```

Recommend Option A for consistency with Node.js conventions.

## Acceptance Criteria

- [x] Error handling is not duplicated
- [x] Script exits immediately on error (exit code 1)
- [x] Error messages are clear and actionable
- [ ] Same pattern applied to other benchmark scripts if applicable (deferred)

## Implementation

Changed `scripts/real-benchmark.ts`:
- Removed inner try-catch block (lines 191-194)
- Kept single `main().catch()` handler with `process.exit(1)` for immediate exit
- Added comment documenting the error handling pattern
- Fixed indentation issues caused by removing try-catch block

Now errors are caught once and exit immediately with proper error code for CI/CD pipelines.

## Impact

**Severity**: P2 (Medium)
**Risk**: Low - improves clarity and CI/CD behavior
