# USA-15: Interactive Mode - Action List

## Phase 1: Type Definitions

1. **Add IterationOption interface** to `src/agent/types.ts`
   - Fields: id, name, description, category, applicableTo
   - Represents an iteration choice presented to user

2. **Add IterationSelectionCallback type** to `src/agent/types.ts`
   - Signature: `(options: IterationOption[]) => Promise<IterationId[]>`
   - Async callback for user interaction

3. **Update UserStoryAgentConfig interface** in `src/agent/types.ts`
   - Add 'interactive' to mode union type (already exists in AgentMode)
   - Add optional `onIterationSelection?: IterationSelectionCallback` property

## Phase 2: Configuration Validation

4. **Update validateConfig() method** in `src/agent/user-story-agent.ts`
   - Add 'interactive' to supported modes check (line 43)
   - Add validation: if mode is 'interactive', require `onIterationSelection` callback
   - Add validation: ensure callback is a function if provided

## Phase 3: Core Implementation

5. **Implement gatherIterationSelections() private method** in `src/agent/user-story-agent.ts`
   - Get applicable iterations: if `productContext?.productType` exists, use `getApplicableIterations()`, else use `getAllIterations()`
   - Map `IterationRegistryEntry[]` to `IterationOption[]`
   - Call `this.config.onIterationSelection(options)` and await result
   - Validate returned IDs: check each ID exists in `ITERATION_REGISTRY`
   - Return validated `IterationId[]` array
   - Handle errors: throw with clear message if invalid ID or callback error

6. **Implement runInteractiveMode() private method** in `src/agent/user-story-agent.ts`
   - Call `gatherIterationSelections(state)` to get user selections
   - Filter selections: only keep IDs that exist in `WORKFLOW_ORDER` array
   - Sort filtered selections by their position in `WORKFLOW_ORDER`
   - Loop through sorted selections:
     - Get iteration by ID using `getIterationById()`
     - Call `applyIteration(iteration, currentState)`
     - Call `contextManager.updateContext(currentState, result)`
     - Update `currentState` with returned state
   - After all iterations: call `runConsolidation(currentState)`
   - Return final state

7. **Update processUserStory() method** in `src/agent/user-story-agent.ts`
   - Add 'interactive' case to mode routing (after line 95)
   - Call `runInteractiveMode(state)` when mode is 'interactive'
   - Ensure error handling wraps interactive mode execution

## Phase 4: Testing

8. **Add unit tests for gatherIterationSelections()** in `tests/agent/user-story-agent.test.ts`
   - Test with productType: callback receives filtered iterations
   - Test without productType: callback receives all iterations
   - Test empty selection: callback returns empty array
   - Test invalid ID: callback returns invalid ID, should throw error
   - Test callback error: callback throws, should propagate

9. **Add unit tests for runInteractiveMode()** in `tests/agent/user-story-agent.test.ts`
   - Test single iteration selection: verify applied correctly
   - Test multiple iterations: verify applied in WORKFLOW_ORDER
   - Test consolidation: verify always runs after iterations
   - Test empty selection: verify only consolidation runs
   - Test state immutability: verify new state objects created

10. **Add integration test** in `tests/agent/user-story-agent.test.ts`
    - Test full flow: create agent with interactive mode and callback
    - Mock callback to return specific iteration IDs
    - Call `processUserStory()` with test story
    - Verify result includes selected iterations in summary
    - Verify consolidation was applied

11. **Add config validation tests** in `tests/agent/user-story-agent.test.ts`
    - Test interactive mode without callback: should throw on construction
    - Test interactive mode with non-function: should throw on construction
    - Test other modes still work: individual and workflow unaffected

## Phase 5: Quality Assurance

12. **Run linter**: `npm run lint`
    - Fix any linting errors

13. **Run type checker**: `npm run typecheck`
    - Fix any type errors

14. **Run all tests**: `npm test`
    - Ensure all tests pass (existing + new)

15. **Code review**: Run `/code-review` on modified files
    - Address any review feedback
    - Ensure code follows existing patterns

## Design Decisions Summary

- **Mode**: Third mode 'interactive' (not variant of workflow)
- **Interaction**: Callback-based interface for flexibility (CLI, web, programmatic)
- **Filtering**: Use productType if provided, else show all iterations
- **Order**: Apply selections in WORKFLOW_ORDER sequence
- **Consolidation**: Always run after selected iterations

## Key Files Modified

- `src/agent/types.ts` - Type definitions
- `src/agent/user-story-agent.ts` - Core implementation
- `tests/agent/user-story-agent.test.ts` - Tests
