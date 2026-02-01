# USA-4: Iteration Prompts - User Roles & Interactive Elements

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-2

## Description

Create iteration prompt modules for user roles and interactive elements aspects.

## Acceptance Criteria

- [x] Create `user-roles.ts` with prompt for identifying distinct user roles and their interactions
- [x] Create `interactive-elements.ts` with prompt for documenting buttons, inputs, links, icons and their states (default, hover, focus, active, disabled, error)
- [x] Each file exports: prompt string + metadata object
- [x] Metadata includes: id, name, description, category, applicableWhen, order

## Status: COMPLETE (2026-01-16)

## Files

- `src/prompts/iterations/user-roles.ts`
- `src/prompts/iterations/interactive-elements.ts`
- `src/prompts/index.ts` (updated)
