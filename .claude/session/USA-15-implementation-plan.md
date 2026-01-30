# USA-15: Interactive Mode Implementation Plan

## Overview
Extend UserStoryAgent with interactive selection mode that allows users to choose which iterations to apply, while maintaining the existing stateless, immutable patterns.

## Design Decisions

### 1. Mode Architecture
- **Decision**: Add 'interactive' as a third mode (already in `AgentMode` type)
- **Rationale**: Clear separation of concerns, follows existing pattern
- **Alternative Considered**: Variant of workflow mode - rejected for clarity

### 2. User Interaction Interface
- **Decision**: Callback-based interface `IterationSelectionCallback`
- **Rationale**: 
  - Flexible for different environments (CLI, web UI, programmatic)
  - Keeps agent stateless
  - Follows dependency inversion principle
- **Signature**: `(options: IterationOption[]) => Promise<IterationId[]>`

### 3. Iteration Filtering
- **Decision**: If `productContext.productType` provided, filter by applicability; otherwise show all
- **Rationale**: Matches workflow mode behavior, provides sensible defaults

### 4. Execution Order
- **Decision**: Apply selected iterations in `WORKFLOW_ORDER` sequence
- **Rationale**: Maintains logical dependencies between iterations

### 5. Consolidation
- **Decision**: Always run consolidation after selected iterations
- **Rationale**: Matches workflow mode behavior, ensures clean output

## Step-by-Step Implementation Plan

### Phase 1: Type Definitions

#### Step 1.1: Define Iteration Selection Types
- **File**: `src/agent/types.ts`
- **Action**: Add new types:
  - `IterationOption` interface (id, name, description, category, applicableTo)
  - `IterationSelectionCallback` type (async function receiving options, returning selected IDs)
- **Dependencies**: None
- **Validation**: TypeScript compiles without errors

#### Step 1.2: Update UserStoryAgentConfig
- **File**: `src/agent/types.ts`
- **Action**: 
  - Update `mode` type to include 'interactive'
  - Add optional `onIterationSelection` callback property (only required for interactive mode)
- **Dependencies**: Step 1.1
- **Validation**: TypeScript compiles, existing code still works

### Phase 2: Configuration Validation

#### Step 2.1: Update validateConfig() for Interactive Mode
- **File**: `src/agent/user-story-agent.ts`
- **Action**: 
  - Add 'interactive' to supported modes check
  - Validate `onIterationSelection` callback is provided when mode is 'interactive'
  - Validate callback is a function
- **Dependencies**: Step 1.2
- **Validation**: 
  - Throws error if interactive mode without callback
  - Throws error if callback not a function
  - Other modes still validate correctly

### Phase 3: Core Interactive Mode Implementation

#### Step 3.1: Implement gatherIterationSelections()
- **File**: `src/agent/user-story-agent.ts`
- **Action**: 
  - Private method `gatherIterationSelections(state: StoryState): Promise<IterationId[]>`
  - Get applicable iterations (filter by productType if provided, else all)
  - Map to `IterationOption[]` format
  - Call `this.config.onIterationSelection(options)`
  - Validate returned IDs are valid iteration IDs
  - Return validated selection array
- **Dependencies**: Step 2.1
- **Validation**: 
  - Returns empty array if user selects none
  - Throws error if invalid iteration ID returned
  - Handles callback errors gracefully

#### Step 3.2: Implement runInteractiveMode()
- **File**: `src/agent/user-story-agent.ts`
- **Action**: 
  - Private method `runInteractiveMode(state: StoryState): Promise<StoryState>`
  - Call `gatherIterationSelections(state)` to get user choices
  - Filter selected IDs to only those in WORKFLOW_ORDER (maintain order)
  - Apply each selected iteration sequentially (reuse `applyIteration()`)
  - Update state after each iteration (reuse `contextManager.updateContext()`)
  - Run consolidation (reuse `runConsolidation()`)
  - Return final state
- **Dependencies**: Step 3.1
- **Validation**: 
  - Applies iterations in WORKFLOW_ORDER
  - Skips iterations not in selection
  - Always runs consolidation
  - Maintains state immutability

#### Step 3.3: Integrate Interactive Mode into processUserStory()
- **File**: `src/agent/user-story-agent.ts`
- **Action**: 
  - Add 'interactive' case to mode routing in `processUserStory()`
  - Call `runInteractiveMode(state)` when mode is 'interactive'
- **Dependencies**: Step 3.2
- **Validation**: 
  - Interactive mode executes correctly
  - Other modes unaffected
  - Error handling works

### Phase 4: Helper Utilities (Optional but Recommended)

#### Step 4.1: Create formatIterationOptions() Helper
- **File**: `src/agent/user-story-agent.ts` (or separate utility file)
- **Action**: 
  - Private method to format `IterationRegistryEntry[]` → `IterationOption[]`
  - Groups by category if needed
  - Includes all relevant metadata
- **Dependencies**: Step 1.1
- **Validation**: Formats correctly, includes all required fields

### Phase 5: Testing & Validation

#### Step 5.1: Unit Tests for gatherIterationSelections()
- **File**: `tests/agent/user-story-agent.test.ts`
- **Action**: 
  - Test with productType filtering
  - Test without productType (all iterations)
  - Test callback returning empty array
  - Test callback returning invalid IDs (should throw)
  - Test callback throwing error (should propagate)
- **Dependencies**: Step 3.1
- **Validation**: All tests pass

#### Step 5.2: Unit Tests for runInteractiveMode()
- **File**: `tests/agent/user-story-agent.test.ts`
- **Action**: 
  - Test applying single iteration
  - Test applying multiple iterations (verify WORKFLOW_ORDER)
  - Test consolidation always runs
  - Test state immutability
  - Test with no selections (should still consolidate)
- **Dependencies**: Step 3.2
- **Validation**: All tests pass

#### Step 5.3: Integration Test for Full Interactive Flow
- **File**: `tests/agent/user-story-agent.test.ts`
- **Action**: 
  - Test complete flow: processUserStory() with interactive mode
  - Mock callback to return specific selections
  - Verify final result includes all selected iterations
  - Verify consolidation applied
- **Dependencies**: Step 3.3
- **Validation**: Integration test passes

#### Step 5.4: Validation Test for Config
- **File**: `tests/agent/user-story-agent.test.ts`
- **Action**: 
  - Test interactive mode without callback (should throw)
  - Test interactive mode with non-function callback (should throw)
  - Test other modes still work
- **Dependencies**: Step 2.1
- **Validation**: All validation tests pass

### Phase 6: Code Quality

#### Step 6.1: Run Linter
- **Action**: `npm run lint`
- **Dependencies**: All previous steps
- **Validation**: No linting errors

#### Step 6.2: Run Type Check
- **Action**: `npm run typecheck`
- **Dependencies**: All previous steps
- **Validation**: No type errors

#### Step 6.3: Run All Tests
- **Action**: `npm test`
- **Dependencies**: All previous steps
- **Validation**: All tests pass

#### Step 6.4: Code Review
- **Action**: Run `/code-review` on modified files
- **Dependencies**: All previous steps
- **Validation**: Review passes, address any issues

## Implementation Notes

### Key Patterns to Follow
1. **Stateless Operations**: All methods remain stateless, state passed as parameters
2. **Immutability**: State updates create new objects, never mutate
3. **Reuse Existing Logic**: Leverage `applyIteration()`, `runConsolidation()`, `contextManager`
4. **Error Handling**: Validate early, provide clear error messages
5. **Type Safety**: Use strict TypeScript, no `any` types

### Edge Cases to Handle
1. User selects no iterations → still run consolidation
2. User selects invalid iteration ID → throw clear error
3. Callback throws error → propagate with context
4. ProductType provided but no applicable iterations → return empty options
5. Selected iterations not in WORKFLOW_ORDER → filter to only valid ones, maintain order

### Testing Strategy
- Unit tests for each new method
- Integration test for full flow
- Mock callback for predictable testing
- Test error paths explicitly

## Acceptance Criteria Checklist

- [ ] `runInteractiveMode()` implemented and tested
- [ ] `gatherIterationSelections()` implemented and tested
- [ ] Selected iterations applied in WORKFLOW_ORDER
- [ ] Consolidation runs after selected iterations
- [ ] Multi-select supported (callback returns array)
- [ ] Works with and without productContext
- [ ] TypeScript strict mode compliance
- [ ] All tests pass
- [ ] Code review approved

## Files to Modify

1. `src/agent/types.ts` - Add new types
2. `src/agent/user-story-agent.ts` - Implement interactive mode
3. `tests/agent/user-story-agent.test.ts` - Add tests

## Estimated Complexity

- **Type Definitions**: ~30 lines
- **Core Implementation**: ~100-150 lines
- **Tests**: ~200-300 lines
- **Total**: ~330-480 lines of code

## Dependencies

- USA-14 (must be completed first - core agent class)
- Existing iteration registry
- Existing context manager
- Existing state management
