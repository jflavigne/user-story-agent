# USA-36: Add allowedPaths to IterationDefinition

**Status**: DONE (implementation verified 2026-02-06)
**Depends on**: USA-31
**Size**: Small (~50 lines)
**Track**: Track 2 (Patch-Based Infrastructure)

## Description

Extend IterationDefinition type with patch-based fields. Each iteration declares which sections of the story it's allowed to modify (mechanical scope enforcement).

## Tasks

1. Add `allowedPaths: PatchPath[]` field to `IterationDefinition`
2. Add `outputFormat: 'patches'` field
3. Update iteration registry with path mappings per the plan

## Iteration-to-Path Mapping

- `user-roles` → `['story.asA', 'story.iWant', 'story.soThat', 'outcomeAcceptanceCriteria']`
- `interactive-elements` → `['userVisibleBehavior', 'outcomeAcceptanceCriteria']`
- `validation` → `['outcomeAcceptanceCriteria', 'systemAcceptanceCriteria']`
- `accessibility` → `['outcomeAcceptanceCriteria', 'systemAcceptanceCriteria']`
- `performance` → `['systemAcceptanceCriteria', 'implementationNotes.performanceNotes', 'implementationNotes.loadingStates']`
- `security` → `['systemAcceptanceCriteria', 'implementationNotes.securityNotes']`
- `responsive-web` → `['userVisibleBehavior', 'systemAcceptanceCriteria']`
- `responsive-native` → `['userVisibleBehavior', 'systemAcceptanceCriteria']`
- `i18n-*` → `['outcomeAcceptanceCriteria']`
- `analytics` → `['systemAcceptanceCriteria', 'implementationNotes.telemetryNotes']`

## Acceptance Criteria

- All iterations have `allowedPaths` defined
- TypeScript compiles without errors
- Iteration registry updated with mappings

## Files Modified

- `src/shared/types.ts` (IterationDefinition interface)
- `src/shared/iteration-registry.ts`

## Files Created

None

## Dependencies

**Blocked by USA-31** - Needs PatchPath type to be validated

## Notes

- This is the foundation for mechanical section scope enforcement
- `outputFormat: 'patches'` distinguishes new advisors from legacy markdown-based ones
