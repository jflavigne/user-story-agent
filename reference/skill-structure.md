# Claude Code Skill Structure

## Overview

Skills are markdown files that teach Claude how to do something specific. When you ask Claude something that matches a Skill's purpose, Claude automatically applies it.

## Folder Structure

```
.claude/skills/
├── skill-name/
│   ├── SKILL.md          # Main skill definition (required)
│   ├── scripts/          # Helper scripts (optional)
│   ├── templates/        # Template files (optional)
│   └── data/             # Reference data (optional)
```

## SKILL.md Format

### Basic Template

```yaml
---
name: my-skill-name
description: A clear description of what this skill does and when to use it
---

# My Skill Name

[Instructions that Claude will follow when this skill is active]

## Examples
- Example usage 1
- Example usage 2

## Guidelines
- Guideline 1
- Guideline 2
```

### Extended Template with All Options

```yaml
---
name: skill-identifier
description: "Clear description including keywords users mention"
allowed-tools: Read, Grep, Bash, Write, Edit
model: claude-sonnet-4-20250514
---

# Skill Name

## Purpose
Explain what this skill accomplishes.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Instructions
Step-by-step instructions for Claude.

## Examples

### Good Pattern
```code
example of correct usage
```

### Anti-Pattern
```code
example of what NOT to do
```

## Integration Notes
How this skill works with other parts of the system.
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier (lowercase, hyphens for spaces) |
| `description` | Yes | What the skill does - used for semantic matching |
| `allowed-tools` | No | Comma-separated list of permitted tools |
| `model` | No | Override model (e.g., `claude-sonnet-4-20250514`) |

## Best Practices

1. **Keep SKILL.md focused** - Under 500 lines
2. **Write trigger-rich descriptions** - Claude uses semantic matching on descriptions
3. **Include examples** - Show both good and bad patterns with code
4. **Self-contained** - Package all necessary resources together
5. **Clear instructions** - Write task-specific, actionable instructions

## How Skills Work

1. **Discovery**: The `Skill` tool embeds an `<available_skills>` list from all detected skill frontmatter
2. **Invocation**: When called, the tool response includes the skill's base path and full `SKILL.md` body
3. **Execution**: Supporting scripts and resources are referenced relative to the base path

## Skills vs Commands vs Agents

| Type | Purpose | Location |
|------|---------|----------|
| **Skills** | Domain knowledge, patterns, guidelines | `.claude/skills/` |
| **Commands** | Specific actions with `/command` syntax | `.claude/commands/` |
| **Agents** | Specialized assistants with own prompts | `.claude/agents/` |

## Source

- [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)
- [Skills Deep Dive - Mikhail Shilkov](https://mikhail.io/2025/10/claude-code-skills/)
