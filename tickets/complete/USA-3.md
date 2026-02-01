# USA-3: Core System Prompts

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-1

## Description

Extract and create the main system prompt and post-processing prompt from the prompts document.

## Acceptance Criteria

- [x] Create `SYSTEM_PROMPT` constant with the AI user story writer persona
- [x] Include user story template format (As a [role], I want [goal], So that [reason])
- [x] Include acceptance criteria format guidance
- [x] Create `POST_PROCESSING_PROMPT` for consolidation/refinement
- [x] Include guidelines: consolidate similar criteria, effective formatting, plain language, user-centric, avoid omissions
- [x] Export prompts with metadata (name, description, tokenEstimate)

## Status: COMPLETE (2026-01-16)

## Files

- `src/prompts/system.ts`
- `src/prompts/post-processing.ts`
- `src/prompts/index.ts`
