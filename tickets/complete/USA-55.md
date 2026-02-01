# USA-55: Performance Benchmarking

**Status**: BLOCKED (needs USA-54)
**Depends on**: USA-54
**Size**: Medium (~200 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Benchmark new system vs legacy.

## Tasks

1. Create benchmark scripts
2. Measure token usage (new vs legacy)
3. Measure latency (new vs legacy)
4. Measure quality scores (judge scores)
5. Measure patch rejection rates
6. Generate report

## Acceptance Criteria

- Token usage < 40% increase vs legacy
- Latency < 30% increase vs legacy
- Patch rejection rate < 5%
- Report generated

## Files Created

- `scripts/benchmark.ts`

## Files Modified

None

## Dependencies

**Blocked by USA-54** - Needs working system with tests

## Notes

- Compare system-workflow mode vs legacy workflow mode
- Token budget: legacy baseline + 40% acceptable overhead
- Latency: parallelizable operations should reduce wall-clock time
- Patch rejection: high rate indicates scope mismatch
