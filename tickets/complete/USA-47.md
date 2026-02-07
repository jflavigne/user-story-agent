# USA-47: Implement mergeNewRelationships()

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-46
**Size**: Medium (~150 lines)
**Track**: Track 4 (Pass 0 - System Discovery)

## Description

Implement relationship merging with conflict resolution.

## Tasks

1. Implement `mergeNewRelationships()` function
2. Handle `add_node` operations (safe)
3. Handle `add_edge` operations (validate entities exist)
4. Handle `edit_node`/`edit_edge` operations (flag for manual review)
5. Add unit tests

## Acceptance Criteria

- Add operations merge correctly
- Edit operations flagged for manual review
- Entity validation works correctly
- Unit tests pass

## Files Created

- `src/agent/relationship-merger.ts`
- `tests/agent/relationship-merger.test.ts`

## Files Modified

None

## Dependencies

**Blocked by USA-46** - Needs refinement loop to call this function

## Notes

- Add operations are safe (append-only)
- Edit operations require human review (prevent LLM from overwriting truth)
- Validation ensures referenced entities exist in component graph
