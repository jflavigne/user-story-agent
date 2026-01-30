# USA-44: Implement runPass0Discovery()

**Status**: BLOCKED (needs USA-43)
**Depends on**: USA-43
**Size**: Medium (~200 lines)
**Track**: Track 4 (Pass 0 - System Discovery)

## Description

Implement Pass 0 discovery - outputs mentions and canonical names, calls USA-45 for ID minting.

## Tasks

1. Create `runPass0Discovery(stories, referenceDocuments?)` method
2. Call LLM with system-discovery prompt
3. Parse response into intermediate `SystemDiscoveryMentions` structure
4. Pass mentions to ID Registry (USA-45) to mint stable IDs
5. Construct final `SystemDiscoveryContext` with stable IDs
6. Store in `state.systemContext`

## Acceptance Criteria

- Pass 0 returns mentions and canonical names (no IDs yet)
- Mentions passed to ID Registry for deterministic minting
- Final context has stable IDs following naming conventions (COMP-*, etc.)
- Context stored in state

## Files Modified

- `src/agent/user-story-agent.ts`

## Files Created

None

## Dependencies

**Blocked by USA-43** - Needs system-discovery prompt

## Notes

- Pass 0 runs before Pass 1 (story generation)
- Calls ID Registry (USA-45) for deterministic ID minting
- SystemDiscoveryContext is immutable after creation (add-only updates in refinement)
