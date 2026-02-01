# USA-30: Convert Iterations to Skills Format

**Epic:** USA - User Story Agent
**Type:** Enhancement
**Priority:** High
**Dependencies:** USA-10

## Description

Convert iteration prompts to Anthropic's Agent Skills open standard for portability across platforms. This aligns with Anthropic's skill architecture: each skill has a SKILL.md file with metadata and instructions, plus optional reference files.

## Problem Statement

- Iterations are defined in TypeScript, limiting portability
- Can't easily share iterations across Claude Code, Agent SDK, and Claude.ai
- All iterations in single registry file (maintenance burden)
- No progressive disclosure (references loaded even when not needed)

## Acceptance Criteria

- [ ] Create `.claude/skills/user-story/` directory structure
- [ ] Convert each iteration to SKILL.md format with frontmatter
- [ ] Support optional reference files per iteration
- [ ] Create skill loader that reads SKILL.md files
- [ ] Update iteration registry to load from skills directory
- [ ] Maintain backward compatibility with existing iteration IDs
- [ ] Add skill discovery command (`--list-skills`)
- [ ] Create migration script from TypeScript to SKILL.md

## Files

### New Directory Structure
```
.claude/skills/user-story/
├── README.md                    # Skill family overview
├── user-roles/
│   └── SKILL.md
├── interactive-elements/
│   └── SKILL.md
├── validation/
│   └── SKILL.md
├── accessibility/
│   ├── SKILL.md
│   └── wcag-reference.md       # Optional reference
├── performance/
│   └── SKILL.md
├── security/
│   └── SKILL.md
├── responsive-web/
│   └── SKILL.md
├── responsive-native/
│   └── SKILL.md
├── i18n-language/
│   └── SKILL.md
├── i18n-locale/
│   └── SKILL.md
├── i18n-cultural/
│   └── SKILL.md
├── analytics/
│   └── SKILL.md
└── consolidate/
    └── SKILL.md
```

### New Files
- `src/shared/skill-loader.ts` - Load skills from SKILL.md files (~100 lines)
- `scripts/migrate-iterations.ts` - Migration script
- Tests for skill loader

### Modified Files
- `src/shared/iteration-registry.ts` - Use skill loader
- `src/cli.ts` - Add --list-skills command

## Status: COMPLETE (2026-01-31)

## Technical Notes

### SKILL.md Format

```markdown
---
name: Validation Rules
id: validation
description: Identifies form validation requirements and error messaging
category: core
order: 3
---

# Validation Iteration

You are enhancing a user story with validation requirements...

[Full iteration prompt content]

## Output Format

Return your enhanced story with validation rules clearly documented.

## References

For WCAG validation guidelines, see wcag-reference.md
```

### Skill Loader

```typescript
// src/shared/skill-loader.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';

export interface SkillMetadata {
  name: string;
  id: string;
  description: string;
  category: string;
  order: number;
}

export interface LoadedSkill {
  metadata: SkillMetadata;
  prompt: string;
  references: Map<string, string>;
}

export async function loadSkills(skillsDir: string): Promise<LoadedSkill[]> {
  const skills: LoadedSkill[] = [];
  const entries = await readdir(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = join(skillsDir, entry.name, 'SKILL.md');
      const content = await readFile(skillPath, 'utf-8');
      const { data, content: prompt } = matter(content);

      const references = await loadReferences(
        join(skillsDir, entry.name)
      );

      skills.push({
        metadata: data as SkillMetadata,
        prompt: prompt.trim(),
        references
      });
    }
  }

  return skills.sort((a, b) => a.metadata.order - b.metadata.order);
}

async function loadReferences(dir: string): Promise<Map<string, string>> {
  const refs = new Map<string, string>();
  const files = await readdir(dir);

  for (const file of files) {
    if (file !== 'SKILL.md' && file.endsWith('.md')) {
      const content = await readFile(join(dir, file), 'utf-8');
      refs.set(file, content);
    }
  }

  return refs;
}
```

### Registry Integration

```typescript
// In iteration-registry.ts
import { loadSkills } from './skill-loader';

let cachedIterations: IterationDefinition[] | null = null;

export async function getIterations(): Promise<IterationDefinition[]> {
  if (cachedIterations) return cachedIterations;

  const skillsDir = join(__dirname, '../../.claude/skills/user-story');
  const skills = await loadSkills(skillsDir);

  cachedIterations = skills.map(skill => ({
    id: skill.metadata.id,
    name: skill.metadata.name,
    description: skill.metadata.description,
    prompt: skill.prompt,
    category: skill.metadata.category as IterationCategory
  }));

  return cachedIterations;
}
```

### Migration Script

```typescript
// scripts/migrate-iterations.ts
import { ITERATION_REGISTRY } from '../src/shared/iteration-registry';
import { mkdir, writeFile } from 'fs/promises';

async function migrate() {
  const baseDir = '.claude/skills/user-story';

  for (const [id, iteration] of Object.entries(ITERATION_REGISTRY)) {
    const skillDir = join(baseDir, id);
    await mkdir(skillDir, { recursive: true });

    const skillMd = `---
name: ${iteration.name}
id: ${id}
description: ${iteration.description}
category: ${iteration.category}
order: ${iteration.order}
---

${iteration.prompt}
`;

    await writeFile(join(skillDir, 'SKILL.md'), skillMd);
    console.log(`Migrated: ${id}`);
  }
}

migrate();
```

## Benefits

1. **Cross-platform portability** - Works with Claude.ai, Agent SDK, Claude Code
2. **Progressive disclosure** - References loaded only when needed
3. **Easier maintenance** - One file per skill
4. **Community friendly** - Easy to contribute new iterations
5. **IDE support** - Markdown files get syntax highlighting

## Verification

```bash
# Run migration
npx ts-node scripts/migrate-iterations.ts

# Verify skills load correctly
npm test -- --grep "skill loader"

# List available skills
npm run agent -- --list-skills

# Run with loaded skills
echo "As a user I want to login" | npm run agent -- \
  --mode individual --iterations validation
```

## References

- [Agent Skills - Anthropic Engineering](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - YAML frontmatter parser
