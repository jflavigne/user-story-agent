# USA-20: Skill Generation Script

**Epic:** USA - User Story Agent
**Type:** Task
**Priority:** Low
**Dependencies:** USA-10, USA-19

## Description

Create script to generate Claude Code skills from TypeScript prompt definitions.

## Acceptance Criteria

- [ ] Create `generate-skills.ts` script
- [ ] Read from `ITERATION_REGISTRY`
- [ ] Generate markdown skill files in `.claude/commands/user-story/`
- [ ] Include proper frontmatter and prompt content
- [ ] Add to `npm run generate-skills` script
- [ ] Script is idempotent (can re-run safely)

## Files

- `scripts/generate-skills.ts`
