# USA-34: Complete StoryJudge Implementation

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-31
**Size**: Medium (~300 lines)
**Track**: Track 1 (Foundation & Schemas)

## Description

Implement LLM judge with unified rubric and global consistency checking. The judge evaluates story quality across multiple dimensions and discovers new relationships.

## Tasks

1. Fix `judgeStory()` to return correct `JudgeRubric` structure
2. Fix `judgeGlobalConsistency()` to return correct `GlobalConsistencyReport` structure
3. Implement `parseJudgeRubric()` with proper score type casting
4. Update `formatSystemContext()` for new SystemDiscoveryContext fields
5. Add unit tests with mocked LLM responses
6. Add explicit test cases for LLM output variability:
   - JSON wrapped in extra text (e.g., "Here's the result: {...}")
   - Score as float (4.5) when schema expects literal (0-5)
   - Violations as string array instead of structured objects
   - Missing required fields
   - Invalid enum values

## Acceptance Criteria

- `judgeStory()` returns properly typed `JudgeRubric`
- `judgeGlobalConsistency()` returns properly typed report
- Scores are typed as literals (0-5), not generic numbers
- System context formatted correctly
- Unit tests pass
- Edge case tests verify parsing failures are handled gracefully

## Files Modified

- `src/agent/story-judge.ts`
- `tests/agent/story-judge.test.ts`

## Files Created

None

## Dependencies

**Blocked by USA-31** - Needs JudgeRubricSchema and GlobalConsistencyReportSchema fixes

## Notes

- Judge uses `safeParse()` at story-judge.ts:61 and story-judge.ts:104
- LLM output variability is a major concern - robust parsing required
- Score transformation (float → literal) happens in schema with `.transform()`
