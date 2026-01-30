# USA-58: Extract Contract ID Patterns to Shared Constants

**Status**: READY TO START
**Depends on**: None
**Size**: Tiny (~30 lines)
**Track**: Technical Debt

## Description

Contract ID prefixes (COMP-*, C-STATE-*, E-*, DF-*) are hardcoded in multiple prompt files. Extract to shared constants to ensure consistency and make changes easier.

## Current State

Contract ID patterns are duplicated in:
- `src/prompts/system.ts`
- `src/prompts/iterations/system-discovery.ts`
- `src/prompts/iterations/story-interconnection.ts`
- `src/prompts/judge-rubrics/global-consistency.ts`

## Tasks

1. Create `src/shared/contract-id-patterns.ts` with:
   ```typescript
   export const CONTRACT_ID_PATTERNS = {
     component: 'COMP-*',
     clientState: 'C-STATE-*',
     event: 'E-*',
     dataFlow: 'DF-*',
   };
   
   export const CONTRACT_ID_EXAMPLES = {
     component: 'COMP-LOGIN-FORM',
     clientState: 'C-STATE-USER-PROFILE',
     event: 'E-USER-AUTHENTICATED',
     dataFlow: 'DF-LOGIN-TO-DASHBOARD',
   };
   ```

2. Update all 4 prompts to reference these constants via template interpolation

## Acceptance Criteria

- Constants file created
- All 4 prompts updated to use constants
- No hardcoded prefix patterns remain
- TypeScript compiles without errors

## Files Created

- `src/shared/contract-id-patterns.ts`

## Files Modified

- `src/prompts/system.ts`
- `src/prompts/iterations/system-discovery.ts`
- `src/prompts/iterations/story-interconnection.ts`
- `src/prompts/judge-rubrics/global-consistency.ts`

## Notes

- Low priority but improves maintainability
- Can be done anytime (not blocking other work)
- Identified during code review of USA-31/41/43/48/50
