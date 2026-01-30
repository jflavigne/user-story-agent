# USA-48: Create Story Interconnection Prompt

**Status**: READY TO START
**Depends on**: None
**Size**: Large (~300 lines)
**Track**: Track 5 (Pass 2 - Story Interconnection)

## Description

Create Pass 2 prompt for adding cross-references and dependencies. This is prompt writing only - integration is blocked on USA-31.

## Tasks

1. Write prompt to extract UI mapping from stories
2. Write prompt to identify contract dependencies (state models, events, data flows)
3. Write prompt to identify ownership (owns/consumes state, emits/listens events)
4. Write prompt to find related stories (prerequisite, parallel, dependent)
5. Define "no orphan stories" rule
6. Define output format as `StoryInterconnections` JSON

## Acceptance Criteria

- Prompt extracts UI mapping correctly
- Prompt identifies contract dependencies
- Prompt determines ownership relationships
- Output format matches `StoryInterconnections` type

## Files Created

- `src/prompts/iterations/story-interconnection.ts`

## Files Modified

None

## Dependencies

None (prompt writing can start immediately)

## Notes

- Pass 2 runs after Pass 1 (all stories generated)
- UI mapping links product terms to component IDs
- Contract dependencies reference stable IDs from System Context
- "No orphan stories" ensures every story links to at least one other
