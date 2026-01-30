# USA-35: Complete StoryRewriter Implementation

**Status**: BLOCKED (needs USA-31, USA-34)
**Depends on**: USA-31, USA-34
**Size**: Small (~100 lines)
**Track**: Track 1 (Foundation & Schemas)

## Description

Implement LLM-based rewriter for section separation. The rewriter fixes stories that violate section separation rules (e.g., technical language in outcome AC).

## Tasks

1. Fix `formatSystemContext()` for new SystemDiscoveryContext fields
2. Ensure `rewriteForSectionSeparation()` accepts violations from judge
3. Add unit tests with mocked LLM responses
4. Add explicit test cases for LLM output variability:
   - Empty response
   - Response wrapped in markdown code fence
   - Partial story (missing sections)
   - Malformed markdown

## Acceptance Criteria

- Rewriter accepts `JudgeRubric` violations
- System context formatted correctly
- Unit tests pass
- Edge case tests verify parsing failures throw clear errors

## Files Modified

- `src/agent/story-rewriter.ts`
- `tests/agent/story-rewriter.test.ts`

## Files Created

None

## Dependencies

**Blocked by USA-31** - Needs schema fixes
**Blocked by USA-34** - Rewriter consumes judge output (violations)

## Notes

- Rewriter uses section-separation prompt from `src/prompts/rewriter/section-separation.ts`
- Triggered when judge score < 3.5 in Pass 1c
- Returns full markdown story (not patches)
