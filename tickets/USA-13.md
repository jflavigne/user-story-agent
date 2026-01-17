# USA-13: Core Agent Class - Individual Mode

**Epic:** USA - User Story Agent
**Type:** Story
**Priority:** High
**Dependencies:** USA-10, USA-12

## Description

Implement the UserStoryAgent class with individual iteration mode.

## Acceptance Criteria

- [ ] Create `UserStoryAgent` class with constructor accepting config
- [ ] Implement `processUserStory(initialStory)` main entry point
- [ ] Implement `runIndividualMode()` - applies only specified iterations
- [ ] Implement `applyIteration(iteration, context)` - calls Claude API with iteration prompt
- [ ] Individual mode applies iterations in specified order
- [ ] Returns enhanced user story

## Files

- `src/agent/user-story-agent.ts`
