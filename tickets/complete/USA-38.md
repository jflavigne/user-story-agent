# USA-38: Update Remaining 11 Iterations to Return Patches

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-37
**Size**: Large (11 files, ~1000 lines)
**Track**: Track 2 (Patch-Based Infrastructure)

## Description

Convert all remaining iterations to patch-based output using test harness from USA-37. This completes the migration to the patch-based advisor model.

## Tasks

1. For each iteration (user-roles, validation, accessibility, performance, security, responsive-web, responsive-native, language-support, locale-formatting, cultural-appropriateness, analytics):
   - Add PATH SCOPE header with allowed paths
   - Add OUTPUT FORMAT instructions
   - Update to return `AdvisorOutput` (patches array)
   - Add automated test using harness from USA-37

## Acceptance Criteria

- All 12 iterations return patches (including interactive-elements from USA-37)
- All patches respect path scope
- TypeScript compiles without errors
- Automated tests pass for all iterations

## Files Modified

- `src/prompts/iterations/user-roles.ts`
- `src/prompts/iterations/validation.ts`
- `src/prompts/iterations/accessibility.ts`
- `src/prompts/iterations/performance.ts`
- `src/prompts/iterations/security.ts`
- `src/prompts/iterations/responsive-web.ts`
- `src/prompts/iterations/responsive-native.ts`
- `src/prompts/iterations/language-support.ts`
- `src/prompts/iterations/locale-formatting.ts`
- `src/prompts/iterations/cultural-appropriateness.ts`
- `src/prompts/iterations/analytics.ts`
- `tests/prompts/iterations/patch-based-iteration.test.ts` (add test cases)

## Files Created

None (test harness already exists from USA-37)

## Dependencies

**Blocked by USA-37** - Needs test harness and template

## Notes

- This is the largest ticket by file count (11 prompts)
- Each iteration should take ~1 hour using USA-37 as template
- Test automation prevents regression
