# USA-56: Tune Judge Thresholds

**Status**: BLOCKED (needs USA-55)
**Depends on**: USA-55
**Size**: Small (~50 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Tune judge thresholds based on benchmark data.

## Tasks

1. Analyze judge score distribution
2. Analyze rewrite effectiveness
3. Adjust threshold if needed (default 3.5)
4. Adjust confidence threshold if needed (default 0.75)
5. Document tuning decisions

## Acceptance Criteria

- Thresholds optimized for quality vs cost
- >80% of stories score ≥ 4.0 on first pass
- <5% require manual review
- Tuning documented

## Files Modified

- `src/agent/user-story-agent.ts` (constants)

## Files Created

None

## Dependencies

**Blocked by USA-55** - Needs benchmark data

## Notes

- Default judge threshold: 3.5 (triggers rewrite)
- Default confidence threshold: 0.75 (merges relationships)
- Tuning balances quality vs token cost
- Document reasoning for threshold choices
