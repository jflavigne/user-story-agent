# USA-14: Core Agent Class - Workflow Mode

**Epic:** USA - User Story Agent
**Type:** Story
**Priority:** High
**Dependencies:** USA-13

## Description

Extend UserStoryAgent with unified workflow mode.

## Acceptance Criteria

- [ ] Implement `runWorkflowMode()` - runs all applicable iterations sequentially
- [ ] Filter iterations based on product type (web vs native)
- [ ] Build context-aware prompts using ContextManager
- [ ] Update context after each iteration
- [ ] Implement `runConsolidation()` - applies post-processing prompt
- [ ] Workflow mode runs consolidation as final step

## Status: COMPLETE (2026-01-31)

## Files

- `src/agent/user-story-agent.ts`
