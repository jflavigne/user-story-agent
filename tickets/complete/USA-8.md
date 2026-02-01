# USA-8: Iteration Prompts - Internationalization

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** Medium
**Dependencies:** USA-2

## Description

Create iteration prompt modules for internationalization (language, locale, cultural).

## Acceptance Criteria

- [x] Create `language-support.ts` for multi-language and RTL support
- [x] Create `locale-formatting.ts` for date/time/number/currency/address formats
- [x] Create `cultural-appropriateness.ts` for cultural sensitivity review
- [x] Prompts return story unmodified if i18n not applicable
- [x] Each file exports: prompt string + metadata object

## Status: COMPLETE (2026-01-16)

## Files

- `src/prompts/iterations/language-support.ts`
- `src/prompts/iterations/locale-formatting.ts`
- `src/prompts/iterations/cultural-appropriateness.ts`
