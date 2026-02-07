# USA-37: Update One Iteration to Return Patches (interactive-elements)

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-36
**Size**: Medium (~200 lines)
**Track**: Track 2 (Patch-Based Infrastructure)

## Description

Convert interactive-elements iteration to patch-based output as proof-of-concept with automated test harness. This serves as the template for USA-38.

## Tasks

1. Update prompt with PATH SCOPE header
2. Update prompt with OUTPUT FORMAT instructions
3. Update prompt to return `AdvisorOutput` (patches array)
4. Create minimal automated test that:
   - Feeds a mocked advisor response (patches)
   - Verifies only allowed paths mutate
   - Verifies renderer output changed in the right section
   - Confirms out-of-scope patches are rejected

## Acceptance Criteria

- Iteration returns patches in correct format
- Patches only target allowed paths (`userVisibleBehavior`, `outcomeAcceptanceCriteria`)
- PatchOrchestrator applies patches successfully
- Automated test passes (no manual verification needed)
- Test harness can be reused for USA-38

## Files Modified

- `src/prompts/iterations/interactive-elements.ts`

## Files Created

- `tests/prompts/iterations/patch-based-iteration.test.ts` (reusable harness)

## Dependencies

**Blocked by USA-36** - Needs `allowedPaths` in IterationDefinition

## Notes

- First iteration to convert (serves as template)
- Test harness is critical - will be reused for 11 other iterations in USA-38
- PATH SCOPE header explicitly lists allowed sections
- OUTPUT FORMAT instructs LLM to return `{ patches: [...] }` JSON
