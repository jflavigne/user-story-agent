# USA-50: Create Global Consistency Judge Prompt

**Status**: READY TO START
**Depends on**: None
**Size**: Large (~300 lines)
**Track**: Track 5 (Pass 2 - Story Interconnection)

## Description

Create Pass 2b prompt for global consistency checking. This is prompt writing only - integration is blocked on USA-31.

## Tasks

1. Write prompt to detect contradictions across stories
2. Write prompt to validate contract IDs exist in System Context
3. Write prompt to find inconsistent naming for same concepts
4. Write prompt to check bidirectional links
5. Define output format as `GlobalConsistencyReport` JSON

## Acceptance Criteria

- Prompt detects cross-story contradictions
- Prompt validates contract IDs
- Prompt finds naming inconsistencies
- Output format matches `GlobalConsistencyReport` type

## Files Created

- `src/prompts/judge-rubrics/global-consistency.ts`

## Files Modified

None

## Dependencies

None (prompt writing can start immediately)

## Notes

- Pass 2b runs after Pass 2 (interconnection metadata added)
- Checks for contradictions like "Story A says Login Form owns userProfile state, Story B says Dashboard owns it"
- Validates all contract IDs exist in System Context
- Finds naming inconsistencies like "userProfile" vs "user-profile" vs "User Profile"
