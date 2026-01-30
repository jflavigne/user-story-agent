# USA-31: Fix Schema Mismatches

**Status**: BLOCKED (needs USA-30)
**Depends on**: USA-30
**Size**: Small (1-2 files, ~200 lines)
**Track**: Track 1 (Foundation & Schemas)

## Description

Fix Zod schemas in `src/shared/schemas.ts` to match updated TypeScript types based on the parity audit from USA-30.

## Tasks

1. Update `RelationshipSchema` to match new `Relationship` type (add `id`, `operation`, `name`, `evidence`, etc.)
2. Update `ItemSchema` to require `id` field (not optional)
3. Update `ImplementationNotesSchema` to require all arrays (not optional)
4. Update `UIMappingItemSchema` to use `productTerm`/`componentName` (not `element`/`behavior`)
5. Update `JudgeRubricSchema` to match structured violations format
6. Update `GlobalConsistencyReportSchema` to use `issues`/`fixes` (not `consistencyScore`/`conflicts`)
7. Add `StoryInterconnectionsSchema` with new structure
8. Add `SystemDiscoveryContextSchema` with stable ID fields

## Acceptance Criteria

- `npx tsc --noEmit` passes with no errors
- All Zod schemas align with TypeScript types
- Existing tests still pass
- Parse sites (story-judge.ts:61, story-judge.ts:104) continue to work

## Files Modified

- `src/shared/schemas.ts`

## Files Created

None

## Dependencies

**Blocked by USA-30** - Requires parity audit results to know exactly which schemas to fix

## Notes

- Priority fixes identified in USA-30 audit: P0 (JudgeRubricSchema, RelationshipSchema), P1 (ItemSchema, ImplementationNotesSchema, UIMappingItemSchema), P2 (SystemDiscoveryContextSchema suite)
- Most schema changes won't break existing code since schemas aren't widely used yet in parse sites
- This ticket unblocks most of the foundation work (USA-32 through USA-35) and system prompt integration (USA-42)
