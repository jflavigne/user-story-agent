# USA-10: Iteration Registry

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-4, USA-5, USA-6, USA-7, USA-8, USA-9

## Description

Create central registry that maps all iteration prompts for programmatic access.

## Acceptance Criteria

- [ ] Create `ITERATION_REGISTRY` object mapping iteration IDs to definitions
- [ ] Create `WORKFLOW_ORDER` array defining sequential execution order
- [ ] Implement `getIterationsByCategory(category)` helper function
- [ ] Implement `getApplicableIterations(productType)` helper function
- [ ] All 12 iterations registered with correct metadata

## Files

- `src/shared/iteration-registry.ts`
