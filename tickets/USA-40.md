# USA-40: Add Judge-First Workflow (Pass 1c)

**Status**: BLOCKED (needs USA-34, USA-39)
**Depends on**: USA-34, USA-39
**Size**: Medium (~150 lines)
**Track**: Track 2 (Patch-Based Infrastructure)

## Description

Integrate StoryJudge into workflow after story generation. This implements Pass 1c (judging) and triggers Pass 1b (rewrite) when needed.

## Tasks

1. Call `judge.judgeStory()` after story rendered
2. Store `JudgeRubric` in `state.judgeResults.pass1c`
3. If `overallScore < 3.5`, trigger Pass 1b (rewrite)
4. Re-judge once after rewrite
5. Flag for manual review if still `< 3.5`

## Acceptance Criteria

- Judge called after every story generation
- Rewrite triggered when score below threshold (3.5)
- Re-judge occurs after rewrite
- Manual review flag set when needed

## Files Modified

- `src/agent/user-story-agent.ts`
- `src/agent/state/story-state.ts` (add `judgeResults` field)

## Files Created

None

## Dependencies

**Blocked by USA-34** - Needs StoryJudge implementation
**Blocked by USA-39** - Needs PatchOrchestrator integration

## Notes

- Default threshold: 3.5 (tunable in USA-56)
- Re-judge happens only once (no infinite loop)
- Manual review flag: `{ needsReview: true, reason: 'low-quality-after-rewrite', score: 2.8 }`
