# USA-59: Document or Clear Stale StoryStructure After Rewrite

**Status**: READY TO START
**Priority**: P4 (Documentation/Polish)
**Depends on**: None
**Size**: Tiny (~20 lines)

## Problem

After `judgeAndRewrite()` rewrites the story (Pass 1b), `state.currentStory` contains the rewritten markdown but `state.storyStructure` (if set) still reflects the pre-rewrite structured data. This creates a brief inconsistency where the two representations don't match.

**Current behavior**: Works correctly because `enhancedStory` in the result comes from `state.currentStory`, which is the source of truth.

**Risk**: Future code that assumes `storyStructure` and `currentStory` are always in sync could be confused.

**Location**: `src/agent/user-story-agent.ts:977` (where `updatedState.currentStory = rewrittenStory`)

## Solution Options

1. **Document the behavior**: Add comment explaining that after rewrite, `currentStory` is source of truth and `storyStructure` may be stale
2. **Clear storyStructure after rewrite**: Set `updatedState.storyStructure = undefined` when rewrite happens
3. **Re-parse into StoryStructure**: Parse rewritten markdown back into structured format (heavyweight, probably overkill)

**Recommended**: Option 1 (document) or Option 2 (clear). Option 3 is unnecessary complexity.

## Acceptance Criteria

- Either document the behavior OR clear `storyStructure` after rewrite
- No behavior changes - pure documentation/clarity improvement
- Decision documented in commit message
- All existing tests still pass

## Benefits

- Clearer contract: explicit about which representation is authoritative after rewrite
- Prevents future bugs from assuming synchronized state
- Aligns with functional state management patterns

## Notes

- Identified during USA-40 code review (Suggestion #1, P4 Readability)
- Not urgent - current implementation is correct
- Can be bundled with future state management cleanup (USA-58)
- Related to USA-58 (state mutation refactor) - both improve state clarity
