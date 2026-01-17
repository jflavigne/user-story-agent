# User Story Agent - Claude Instructions

## Project Overview

A **TypeScript/Node.js** project for creating user stories from mockups and designs. Dual implementations:

1. **Claude Code Skills** - Slash commands (`/user-story`, `/iterate-*`)
2. **Claude Agent SDK** - Standalone TypeScript agent

## Technology Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.x |
| Runtime | Node.js 20+ |
| Package Manager | npm |
| Linting | ESLint + @typescript-eslint |
| Type Checking | tsc (strict mode) |
| Testing | Jest or Vitest |
| Build | tsc or tsx |

## Quality Commands

```bash
# Lint
npm run lint
# or: npx eslint src/

# Type check
npm run typecheck
# or: npx tsc --noEmit

# Test
npm test
# or: npx jest / npx vitest

# Full quality gate (run before every commit)
npm run lint && npm run typecheck && npm test
```

## Repository Structure

```
user-story-agent/
├── CLAUDE.md              # This file
├── .claude/               # Claude Code configuration
│   ├── settings.local.json
│   └── skills/            # Skills and prompts
├── .mcp.json              # MCP server configuration
├── reference/             # Research and examples
├── tickets/               # Implementation tickets (USA-1 to USA-20)
├── src/                   # Source code (TO BE CREATED)
│   ├── types/             # Shared type definitions
│   ├── prompts/           # System and iteration prompts
│   ├── agent/             # Agent SDK implementation
│   └── skills/            # Skill implementations
└── tests/                 # Test files (TO BE CREATED)
```

## Implementation Tickets

See `tickets/README.md` for the full backlog. Key phases:

| Sprint | Focus | Tickets |
|--------|-------|---------|
| 1 | Foundation | USA-1 to USA-6 |
| 2 | Prompts & Registry | USA-7 to USA-11 |
| 3 | Agent SDK | USA-12 to USA-16 |
| 4 | Claude Code Skills | USA-17 to USA-20 |

---

## Agent Orchestration Philosophy

### Claude is an Orchestrator, Not a Worker

For non-trivial tasks:
1. **Understand** - Parse intent, clarify requirements
2. **Plan** - Break into delegatable chunks
3. **Delegate** - Use specialists (cursor-agent, subagents)
4. **Review** - Validate outputs
5. **Synthesize** - Present coherent result

### When to Delegate vs Do Directly

| Task Type | Approach | Tool |
|-----------|----------|------|
| Single quick edit (<5 lines) | Do directly | Edit |
| Bulk edits, refactoring | Delegate | `cursor_dispatch` |
| Writing new docs | Delegate | `/doc-write` |
| Reviewing docs | Delegate | `/doc-review` |
| Exploring codebase | Delegate | `Task(subagent_type="Explore")` |
| Running tests/builds | Delegate | `Task(subagent_type="Bash")` |
| Code review | Delegate | `/code-review` |

### The Essential Loop

```
delegate → test → lint → REVIEW → fix (delegate!) → commit
```

**Never commit without code review.** After implementing, run `/code-review` before committing.

---

## Development Workflow

### For Each Ticket

1. **Read spec** - Understand requirements
2. **Delegate to Cursor** - `cursor_dispatch` with clear task
3. **Run tests** - `npm test`
4. **If tests fail** - Delegate fix to Cursor (NOT manual!)
5. **Code review** - `/code-review` or `cursor_agent_analyze_files`
6. **If review finds issues** - Delegate fix
7. **Commit** - Only when tests pass AND review approves

### Anti-Patterns to Avoid

**"Quick Manual Fix"** - Always delegate back to Cursor
**Deferred Quality** - Run lint/test after every change
**"Future Work" Notes** - Create a follow-up ticket immediately

---

## Code Review Levels

| Level | Name | Focus |
|-------|------|-------|
| 1 | MVP | Critical bugs, security only |
| 2 | Lean Production (DEFAULT) | Stability, clarity, YAGNI |
| 3 | Enterprise | Strict architecture |

---

## TypeScript Conventions

### Naming

```typescript
// Constants
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Enums (PascalCase)
enum StoryStatus {
  Draft = 'draft',
  Review = 'review',
  Approved = 'approved',
}

// Types/Interfaces (PascalCase)
interface UserStory {
  id: string;
  title: string;
  acceptanceCriteria: string[];
}
```

### File Organization

```typescript
// 1. Imports (external → internal → types)
import { z } from 'zod';
import { processStory } from './processor';
import type { UserStory } from './types';

// 2. Constants
const DEFAULT_OPTIONS = { ... };

// 3. Types (if not in separate file)
interface Options { ... }

// 4. Implementation
export function createStory(...) { ... }
```

### Error Handling

```typescript
// Use typed errors
class StoryValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'StoryValidationError';
  }
}

// Never swallow errors
try {
  await processStory(story);
} catch (error) {
  logger.error('Failed to process story', { error, storyId: story.id });
  throw error; // Re-throw or handle appropriately
}
```

---

## MCP Tools Available

### context7

```typescript
// Resolve library ID first
mcp__context7__resolve-library-id({ libraryName: "zod", query: "schema validation" })

// Then query docs
mcp__context7__query-docs({ libraryId: "/colinhacks/zod", query: "..." })
```

### ast-grep

```typescript
// Find async functions
mcp__ast-grep__find_code({
  pattern: "async function $NAME($$$)",
  language: "typescript",
  project_folder: "src/"
})

// Find empty catch blocks
mcp__ast-grep__find_code_by_rule({
  project_folder: "src/",
  yaml: `
id: empty-catch
language: typescript
rule:
  kind: catch_clause
  has:
    kind: statement_block
    not:
      has:
        kind: expression_statement
`
})
```

### cursor-agent

```typescript
// Delegate implementation
mcp__cursor-agent__cursor_dispatch({
  task: "Implement UserStory interface per USA-2 spec",
  mode: "local",
  cwd: "/Users/jflavigne/user-story-agent"
})

// Code review
mcp__cursor-agent__cursor_agent_analyze_files({
  paths: ["src/types/story.ts"],
  model: "auto",
  prompt: "Review for type safety and completeness"
})
```

---

## Available Skills

### Code Quality

| Skill | Purpose |
|-------|---------|
| `/code-review` | Steve McConnell-style code review (levels 1-3) |
| `/constant-audit` | Scan for magic literals that should be constants |
| `/constant-extract` | Extract identified literals to constant modules |

### Security & Audit

| Skill | Purpose |
|-------|---------|
| `/audit` | Overview of audit skill family |
| `/audit-module` | Comprehensive audit of a single module |
| `/find-silent-errors` | Find empty catch blocks, swallowed exceptions |
| `/find-dead-code` | Find unreachable code, unused functions |
| `/find-injection-risks` | Find command/SQL/template injection risks |
| `/find-hardcoded-secrets` | Find API keys, passwords in code |
| `/find-resource-leaks` | Find unclosed files, connections, streams |
| `/find-type-gaps` | Find missing type annotations, `any` types |

### Code Analysis

| Skill | Purpose |
|-------|---------|
| `/ast-grep` | Guide for structural code search with AST patterns |

### Documentation

| Skill | Purpose |
|-------|---------|
| `/doc-write` | Generate documentation (README, spec, ADR, etc.) |
| `/doc-review` | Fresh-eyes documentation quality review |

### User Story Generation

| Skill | Purpose |
|-------|---------|
| `/user-story/write` | Generate user stories from mockups (full workflow) |
| `/user-story/interactive` | Interactive iteration selection |
| `/user-story/consolidate` | Refine and consolidate user stories |
| `/user-story/user-roles` | Analyze user roles and permissions |
| `/user-story/interactive-elements` | Document buttons, inputs, navigation |
| `/user-story/validation` | Identify validation rules and feedback |
| `/user-story/accessibility` | WCAG compliance and a11y requirements |
| `/user-story/performance` | Load times, responsiveness requirements |
| `/user-story/security` | Security UX and data protection |
| `/user-story/responsive-web` | Responsive web design requirements |
| `/user-story/responsive-native` | Native mobile design requirements |
| `/user-story/i18n-language` | Multi-language support requirements |
| `/user-story/i18n-locale` | Locale-specific formatting (dates, numbers) |
| `/user-story/i18n-cultural` | Cultural appropriateness requirements |
| `/user-story/analytics` | Analytics and tracking requirements |

---

## Quick Reference

```bash
# Quality gate
npm run lint && npm run typecheck && npm test

# Delegation template
cursor_dispatch:
  task: "Implement/Fix [description]..."
  mode: local
  cwd: /Users/jflavigne/user-story-agent

# Code review
/code-review src/path/to/file.ts --level 2
```

---

## Session Notes

Track session progress in `.claude/session/` if needed for multi-session work.

When starting a new session:
1. Read this file
2. Check `tickets/README.md` for current sprint
3. Review any in-progress tickets
