# USA-2: Shared Type Definitions

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** High
**Dependencies:** USA-1

## Description

Create TypeScript interfaces and types used across both implementations.

## Acceptance Criteria

- [x] Create `IterationDefinition` interface with: id, name, description, prompt, category, applicableWhen, order
- [x] Create `IterationCategory` type: 'roles' | 'elements' | 'validation' | 'quality' | 'responsive' | 'i18n' | 'analytics'
- [x] Create `ProductContext` interface with: productName, productType, clientInfo, targetAudience, keyFeatures, businessContext, specificRequirements, i18nRequirements
- [x] Create `AgentMode` type: 'individual' | 'workflow' | 'interactive'
- [x] Create `StoryMetadata` interface for parsed story data
- [x] Export all types from index file

## Status: COMPLETE (2026-01-16)

## Files

- `src/shared/types.ts`
- `src/shared/index.ts`
