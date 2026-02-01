# USA-74: Document Error Codes in Central Registry

**Status:** Todo
**Priority:** P4 (Documentation)
**Effort:** 20 minutes
**Created:** 2026-01-31
**Sprint:** Documentation

## Context

Code review identified that `TitleGenerator` introduces new error codes (`TITLE_GENERATION_API_ERROR`, `TITLE_GENERATION_PARSE_ERROR`) that are not documented in a central error registry.

## Problem

Error codes are scattered across the codebase without a single source of truth:
- `TitleGenerator` uses: `TITLE_GENERATION_API_ERROR`, `TITLE_GENERATION_PARSE_ERROR`
- Other modules likely have their own codes
- No documentation of what each code means
- Hard to ensure uniqueness

## Task

### 1. Create error code registry

If `src/shared/errors.ts` exists, add error code documentation there. Otherwise create it:

```typescript
/**
 * Error Code Registry
 *
 * Centralized documentation of all error codes used across the application.
 */

export const ERROR_CODES = {
  // Title Generation
  TITLE_GENERATION_API_ERROR: 'API call failed during title generation',
  TITLE_GENERATION_PARSE_ERROR: 'Failed to parse LLM response as valid JSON',

  // Add other error codes here...
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
```

### 2. Update TitleGenerator to use registry

Import error codes from registry instead of using string literals.

### 3. Document existing error codes

Audit the codebase for other error code strings and add them to the registry.

## Acceptance Criteria

- [ ] Central error code registry exists
- [ ] All error codes documented with descriptions
- [ ] TitleGenerator uses registry constants
- [ ] README or CLAUDE.md references error registry

## Related

- Parent: USA-65 to USA-70 (Title generation implementation)
- Issue: Code review suggestion #4
