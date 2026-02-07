# USA-46: Implement Refinement Loop

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-40, USA-44
**Size**: Large (~300 lines)
**Track**: Track 4 (Pass 0 - System Discovery)

## Description

Implement refinement loop with relationship discovery, context updates, and convergence telemetry.

## Tasks

1. Add refinement loop around story generation (max 3 rounds)
2. Check `judge.needsSystemContextUpdate` after each story
3. Filter new relationships by confidence threshold (≥ 0.75)
4. Implement `mergeNewRelationships()` with add-only policy
5. Re-run Pass 1 for all stories when context updated
6. Track refinement round count
7. Add convergence telemetry logging:
   - Log: `refinement_round` (1, 2, or 3)
   - Log: `relationships_added_count` (number merged in this round)
   - Log: `restarted_batch` (true/false - whether we restarted Pass 1)
   - Log: convergence reason (e.g., "no new relationships", "max rounds reached")

## Acceptance Criteria

- Refinement loop triggers when new relationships discovered
- High-confidence relationships merged into system context
- All stories regenerated when context updated
- Loop terminates after 3 rounds max
- Convergence telemetry logged for each round (visible in logs, prevents silent cost multiplier)

## Files Modified

- `src/agent/user-story-agent.ts`

## Files Created

None

## Dependencies

**Blocked by USA-40** - Needs judge integration (discovers relationships)
**Blocked by USA-44** - Needs Pass 0 implementation (creates initial context)

## Notes

- Refinement loop is the "feedback mechanism" for system discovery
- Confidence threshold prevents noise from accumulating
- Telemetry is critical for cost monitoring (prevents silent 3x token usage)
