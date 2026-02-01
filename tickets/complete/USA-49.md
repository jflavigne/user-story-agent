# USA-49: Implement runPass2Interconnection()

**Status**: BLOCKED (needs USA-48)
**Depends on**: USA-48
**Size**: Medium (~200 lines)
**Track**: Track 5 (Pass 2 - Story Interconnection)

## Description

Implement Pass 2 interconnection in user-story-agent.

## Tasks

1. Create `runPass2Interconnection(stories, systemContext)` method
2. Call LLM for each story with interconnection prompt
3. Parse responses into `StoryInterconnections` array
4. Store interconnections in `state.interconnections`
5. Call `storyRenderer.appendInterconnectionMetadata()` to update markdown

## Acceptance Criteria

- Pass 2 returns `StoryInterconnections` for each story
- Interconnections stored in state
- Markdown updated with metadata sections

## Files Modified

- `src/agent/user-story-agent.ts`

## Files Created

None

## Dependencies

**Blocked by USA-48** - Needs story-interconnection prompt

## Notes

- Pass 2 runs once after all stories finalized
- Appends metadata sections to markdown (UI Mapping, Contract Dependencies, Related Stories)
- Metadata sections are added to bottom of each story
