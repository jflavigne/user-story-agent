# USA-45: Implement ID Registry (Deterministic ID Minting)

**Status**: READY TO START
**Depends on**: None
**Size**: Medium (~200 lines)
**Track**: Track 4 (Pass 0 - System Discovery)

## Description

Create ID registry that mints stable IDs from canonical names. This is a pure function with NO LLM involvement.

## Tasks

1. Create `IDRegistry` class with append-only storage
2. Implement `mintStableId(canonicalName, entityType, registry)` function
3. Implement normalization algorithm (canonicalName → SNAKE_CASE)
4. Add entity-type prefixes (COMP-*, C-STATE-*, E-*, DF-*)
5. Implement collision handling with deterministic suffixes (_2, _3, etc.)
6. Add unit tests for ID generation

## Acceptance Criteria

- Same canonical name + entity type → same ID every time (deterministic)
- Collision handling produces deterministic suffixes
- IDs are stable across runs
- Unit tests verify: normalization, prefixing, collision handling
- No LLM involvement (pure function)

## Files Created

- `src/agent/id-registry.ts`
- `tests/agent/id-registry.test.ts`

## Files Modified

None

## Dependencies

None (pure function, can start immediately)

## Notes

- Examples: "Login Button" + "component" → "COMP-LOGIN-BUTTON"
- "User Profile" + "stateModel" → "C-STATE-USER-PROFILE"
- Collision: "Login Button" already exists → "COMP-LOGIN-BUTTON_2"
- Deterministic: same inputs always produce same outputs
