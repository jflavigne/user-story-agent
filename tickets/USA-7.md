# USA-7: Iteration Prompts - Responsive Design

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** Medium
**Dependencies:** USA-2

## Description

Create iteration prompt modules for responsive design (web and native app).

## Acceptance Criteria

- [x] Create `responsive-web.ts` for website responsiveness across mobile, tablet, desktop
- [x] Create `responsive-native.ts` for native app device-specific functionalities
- [x] Focus on functional behaviors, not visual appearance
- [x] Include conditional logic: web prompt skipped for native apps, vice versa
- [x] Each file exports: prompt string + metadata object

## Status: COMPLETE (2026-01-16)

## Files

- `src/prompts/iterations/responsive-web.ts`
- `src/prompts/iterations/responsive-native.ts`
