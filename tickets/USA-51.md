# USA-51: Implement judgeGlobalConsistency()

**Status**: BLOCKED (needs USA-34, USA-50)
**Depends on**: USA-34, USA-50
**Size**: Medium (~150 lines)
**Track**: Track 5 (Pass 2 - Story Interconnection)

## Description

Implement global consistency judge in StoryJudge.

## Tasks

1. Ensure `judgeGlobalConsistency()` uses global-consistency prompt
2. Parse response into `GlobalConsistencyReport`
3. Separate issues from fixes
4. Add confidence scores

## Acceptance Criteria

- Method returns `GlobalConsistencyReport`
- Issues and fixes properly separated
- Confidence scores included

## Files Modified

- `src/agent/story-judge.ts`

## Files Created

None

## Dependencies

**Blocked by USA-34** - Needs StoryJudge foundation
**Blocked by USA-50** - Needs global-consistency prompt

## Notes

- Already has skeleton implementation (needs fixing per USA-34)
- Called at story-judge.ts:104 with `safeParse()`
- Issues are for human review, fixes are auto-applied (USA-52)
