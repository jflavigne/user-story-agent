# USA-52: Implement Auto-Apply Fixes

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-51
**Size**: Medium (~150 lines)
**Track**: Track 5 (Pass 2 - Story Interconnection)

## Description

Implement auto-apply for high-confidence consistency fixes. Operates on StoryStructure (not markdown).

## Tasks

1. Filter fixes by confidence threshold (> 0.8)
2. Filter fixes by allowed types (add-bidirectional-link, normalize-contract-id, normalize-term-to-vocabulary)
3. Implement `applyConsistencyFix()` as structured patches
4. Apply fixes to `StoryStructure` objects (not markdown strings)
5. Keep both `storyStructure` and `currentStory` (markdown) in state during system-workflow mode
6. Re-render markdown from updated StoryStructure after fixes
7. Log all auto-applied fixes

## Acceptance Criteria

- High-confidence fixes applied automatically
- Only safe fix types auto-applied
- Fixes operate on StoryStructure (structured data), not markdown strings
- State maintains both StoryStructure and markdown until end of workflow
- Fixes logged for audit trail
- Stories re-rendered after fixes

## Files Modified

- `src/agent/user-story-agent.ts`
- `src/agent/state/story-state.ts` (add `storyStructure` field alongside `currentStory`)

## Files Created

None

## Dependencies

**Blocked by USA-51** - Needs judgeGlobalConsistency() to generate fixes

## Notes

- Auto-apply only for high confidence (> 0.8) and safe operations
- Safe operations: add-bidirectional-link, normalize-contract-id, normalize-term-to-vocabulary
- Unsafe operations flagged for manual review
- StoryStructure is source of truth, markdown is rendered from it
