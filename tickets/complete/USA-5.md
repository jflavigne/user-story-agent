# USA-5: Iteration Prompts - Validation & Accessibility

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-2

## Description

Create iteration prompt modules for validation rules and accessibility requirements.

## Acceptance Criteria

- [x] Create `validation.ts` with prompt for form field validation rules (email format, password requirements, error states)
- [x] Create `accessibility.ts` with prompt for WCAG compliance (keyboard navigation, screen reader compatibility, form accessibility, state changes)
- [x] Each file exports: prompt string + metadata object
- [x] Prompts focus on user perspective, not technical implementation

## Status: COMPLETE (2026-01-16)

## Files

- `src/prompts/iterations/validation.ts`
- `src/prompts/iterations/accessibility.ts`
- `src/prompts/index.ts` (updated)
