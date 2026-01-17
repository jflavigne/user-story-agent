# User Story Iterations

This directory contains user story iteration prompts in Anthropic's Agent Skills format.

## Skills

Each skill is in its own subdirectory with a `SKILL.md` file containing:
- Frontmatter with metadata (name, id, description, category, order, etc.)
- The prompt content

## Available Skills

- **user-roles** - See `user-roles/SKILL.md`
- **interactive-elements** - See `interactive-elements/SKILL.md`
- **validation** - See `validation/SKILL.md`
- **accessibility** - See `accessibility/SKILL.md`
- **performance** - See `performance/SKILL.md`
- **security** - See `security/SKILL.md`
- **responsive-web** - See `responsive-web/SKILL.md`
- **responsive-native** - See `responsive-native/SKILL.md`
- **language-support** - See `language-support/SKILL.md`
- **locale-formatting** - See `locale-formatting/SKILL.md`
- **cultural-appropriateness** - See `cultural-appropriateness/SKILL.md`
- **analytics** - See `analytics/SKILL.md`

## Usage

These skills can be loaded using the skill loader in `src/shared/skill-loader.ts`:

```typescript
import { loadSkills } from './shared/skill-loader.js';

const skills = await loadSkills('.claude/skills/user-story');
```

## Migration

These skills were migrated from TypeScript iteration prompts in `src/prompts/iterations/`.
See `scripts/migrate-iterations.ts` for the migration script.
