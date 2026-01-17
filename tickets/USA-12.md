# USA-12: Context Manager

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-11

## Description

Implement context carrying logic between iterations per the prompts document guidance.

## Acceptance Criteria

- [ ] Create `ContextManager` class
- [ ] Implement `buildContextPrompt(state)` - creates context preamble including product context and applied iterations summary
- [ ] Implement `updateContext(state, iteration)` - updates history after each iteration
- [ ] Implement `resetContext()` - clears history for new sessions
- [ ] Context summaries include: product type, priority, applied enhancements

## Files

- `src/agent/state/context-manager.ts`
- `src/agent/state/index.ts`
