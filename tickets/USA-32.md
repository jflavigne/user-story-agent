# USA-32: Create PatchValidator Module

**Status**: BLOCKED (needs USA-31)
**Depends on**: USA-31
**Size**: Small (~150 lines)
**Track**: Track 1 (Foundation & Schemas)

## Description

Create separate PatchValidator module for ID validation, duplicate checking, and bounds enforcement. This module enforces mechanical validation rules for all patches before they're applied to StoryStructure.

## Tasks

1. Create `src/agent/patch-validator.ts` (separate file, not inside orchestrator)
2. Implement `getExpectedIdPrefix()` for all patch paths
3. Implement `isDuplicateId()` checker
4. Add text length bounds (max 500 chars)
5. Add validation for required fields
6. Update PatchOrchestrator to call validator
7. Add unit tests for validator

## Acceptance Criteria

- PatchValidator in separate module
- Validator rejects invalid ID formats
- Validator catches duplicate IDs
- Validator enforces text length bounds
- Orchestrator integrates validator
- Unit tests cover all validation rules

## Files Created

- `src/agent/patch-validator.ts`
- `tests/agent/patch-validator.test.ts`

## Files Modified

- `src/agent/patch-orchestrator.ts` (call validator)

## Dependencies

**Blocked by USA-31** - Needs schema fixes to ensure type safety

## Notes

- ID prefix rules: AC-OUT-*, AC-SYS-*, UVB-*, IMPL-STATE-*, IMPL-FLOW-*, etc.
- Validation happens before patch application (fail-fast)
- Separate module improves testability and reusability
