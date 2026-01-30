# USA-54: End-to-End Integration Tests

**Status**: BLOCKED (needs USA-53)
**Depends on**: USA-53
**Size**: Large (~500 lines)
**Track**: Track 6 (Integration & Testing)

## Description

Create comprehensive integration tests for full pipeline.

## Tasks

1. Create test fixtures (mockups, stories, reference docs)
2. Test Pass 0 → system context generation
3. Test Pass 1 → story generation with patches
4. Test Pass 1c → judging
5. Test Pass 1b → rewriting
6. Test refinement loop
7. Test Pass 2 → interconnection
8. Test Pass 2b → global consistency
9. Test auto-apply fixes

## Acceptance Criteria

- All integration tests pass
- Coverage of full pipeline
- Tests use realistic data

## Files Created

- `tests/integration/system-workflow.test.ts`
- `tests/fixtures/*.json`

## Files Modified

None

## Dependencies

**Blocked by USA-53** - Needs system-workflow mode

## Notes

- Use mocked LLM responses for determinism
- Test fixtures should be realistic (not trivial)
- Test convergence (refinement loop should stabilize)
