# USA-58: Refactor applyIteration to Return State Slice Instead of Mutating

**Status**: READY TO START
**Priority**: P3 (Technical Debt)
**Depends on**: None
**Size**: Small (~100 lines)

## Problem

`applyIteration()` in `src/agent/user-story-agent.ts` mutates the shared `state` parameter directly:

```typescript
state.storyStructure = newStructure;
state.lastIterationUsedPatchWorkflow = true;
state.currentStory = renderer.toMarkdown(state.storyStructure);
```

Then later, `updateContext()` spreads `state` to create the next state. This works today but is fragile:
- Relies on mutation + spread order
- If any caller clones state before calling `updateContext`, mutations are lost
- Implicit contract makes refactoring risky

## Solution

Refactor `applyIteration()` to return the updated state slice instead of mutating.

## Acceptance Criteria

- `applyIteration()` returns `{ result, stateUpdates }` instead of mutating state
- Both patch-based and markdown branches return appropriate stateUpdates
- All callers updated to merge stateUpdates before calling updateContext
- All existing tests still pass
- No behavior changes - pure refactor

## Benefits

- Explicit contract: clear what fields are updated
- Safer for refactoring: no hidden mutations
- Easier to test: can verify stateUpdates without side effects
- Better aligns with functional state management patterns

## Notes

- Identified during USA-39 code review (Issue #2, P3 Contracts)
- Not urgent - can be done as part of future state management cleanup
