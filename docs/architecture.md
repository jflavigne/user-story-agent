# Architecture Overview

This document describes the high-level architecture of User Story Agent.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Entry Points                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   CLI       │  │ Programmatic│  │ Claude Code Skills      │  │
│  │ (cli.ts)    │  │ (index.ts)  │  │ (.claude/skills/)       │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          └────────────────┼─────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     UserStoryAgent                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Agent Core                            │    │
│  │  • Mode selection (individual/workflow/interactive)      │    │
│  │  • Iteration sequencing                                  │    │
│  │  • Error handling & graceful degradation                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌───────────────┐  ┌───────┴───────┐  ┌──────────────────┐    │
│  │ContextManager │  │ ClaudeClient  │  │ StreamingHandler │    │
│  │ (state/)      │  │               │  │                  │    │
│  └───────────────┘  └───────┬───────┘  └──────────────────┘    │
│                              │                                   │
│                     ┌────────┴────────┐                         │
│                     │    Evaluator    │                         │
│                     │  (optional)     │                         │
│                     └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Anthropic Claude API                          │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Entry Points

| Component | File | Purpose |
|-----------|------|---------|
| CLI | `src/cli.ts` | Command-line interface with argument parsing |
| Library | `src/index.ts` | Programmatic API exports |
| Skills | `.claude/skills/` | Claude Code slash commands |

### Agent Core (`src/agent/`)

| Component | File | Purpose |
|-----------|------|---------|
| UserStoryAgent | `user-story-agent.ts` | Main orchestrator class |
| ClaudeClient | `claude-client.ts` | Anthropic API wrapper with retry logic |
| StreamingHandler | `streaming.ts` | Handles streaming responses |
| Evaluator | `evaluator.ts` | Verifies iteration output quality |
| Config | `config.ts` | Configuration management |

### State Management (`src/agent/state/`)

| Component | File | Purpose |
|-----------|------|---------|
| StoryState | `story-state.ts` | Tracks story through iterations |
| ContextManager | `context-manager.ts` | Builds prompts with accumulated context |

### Shared (`src/shared/`)

| Component | File | Purpose |
|-----------|------|---------|
| Types | `types.ts` | Core type definitions |
| Schemas | `schemas.ts` | Zod validation schemas |
| Iteration Registry | `iteration-registry.ts` | Central iteration metadata |
| Errors | `errors.ts` | Custom error classes |
| Skill Loader | `skill-loader.ts` | Loads skills from SKILL.md files |

### Prompts (`src/prompts/`)

| Component | File | Purpose |
|-----------|------|---------|
| System Prompt | `system.ts` | Base system prompt for Claude |
| Post-Processing | `post-processing.ts` | Consolidation prompt |
| Iterations | `iterations/*.ts` | Individual iteration prompts |

## Data Flow

### Processing Pipeline

```
Input Story
    │
    ▼
┌──────────────────┐
│ Create Initial   │
│ StoryState       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌─────────────────┐
│ Get Applicable   │────▶│ ITERATION_REGISTRY
│ Iterations       │     └─────────────────┘
└────────┬─────────┘
         │
         ▼
    ┌────────┐
    │  Loop  │◀────────────────────────────┐
    └────┬───┘                             │
         │                                 │
         ▼                                 │
┌──────────────────┐                       │
│ Build Context    │                       │
│ Prompt           │                       │
└────────┬─────────┘                       │
         │                                 │
         ▼                                 │
┌──────────────────┐                       │
│ Call Claude API  │                       │
│ (with retry)     │                       │
└────────┬─────────┘                       │
         │                                 │
         ▼                                 │
┌──────────────────┐                       │
│ Parse Structured │                       │
│ Output           │                       │
└────────┬─────────┘                       │
         │                                 │
         ▼                                 │
┌──────────────────┐                       │
│ Verify Output    │ (optional)            │
│ (Evaluator)      │                       │
└────────┬─────────┘                       │
         │                                 │
         ▼                                 │
┌──────────────────┐                       │
│ Update Context   │───────────────────────┘
│ & StoryState     │
└────────┬─────────┘
         │
         ▼ (after all iterations)
┌──────────────────┐
│ Consolidation    │
│ (workflow/       │
│  interactive)    │
└────────┬─────────┘
         │
         ▼
   AgentResult
```

### State Transitions

```
StoryState {
  originalStory      ─────────────────────────────▶ (immutable)
  currentStory       ───▶ updated after each iteration
  appliedIterations  ───▶ IDs accumulate
  iterationResults   ───▶ results accumulate
  failedIterations   ───▶ failures tracked (graceful degradation)
  productContext     ─────────────────────────────▶ (immutable)
}
```

## Execution Modes

### Individual Mode

```
User specifies: --iterations validation,accessibility

Executes:
  1. validation iteration
  2. accessibility iteration
  (no consolidation)
```

### Workflow Mode

```
User specifies: --product-type web

Executes:
  1. Filter iterations by product type
  2. Run all applicable iterations in WORKFLOW_ORDER
  3. Run consolidation step
```

### Interactive Mode

```
User specifies: --mode interactive

Executes:
  1. Present iteration options to user
  2. User selects via callback
  3. Run selected iterations in WORKFLOW_ORDER
  4. Run consolidation step
```

## Iteration System

### Registry Structure

Each iteration is defined in `ITERATION_REGISTRY`:

```typescript
{
  id: 'accessibility',
  name: 'Accessibility',
  description: 'WCAG compliance and inclusive design',
  prompt: '...',           // Full prompt template
  category: 'quality',
  order: 4,
  applicableTo: 'all',     // or ['web', 'mobile-web']
  tokenEstimate: 1200,
}
```

### Product Type Filtering

| Product Type | Excluded Iterations |
|--------------|---------------------|
| `web` | `responsive-native` |
| `mobile-native` | `responsive-web` |
| `mobile-web` | `responsive-native` |
| `desktop` | `responsive-web`, `responsive-native` |
| `api` | All UI-focused iterations |

## Error Handling

### Error Hierarchy

```
AgentError (base)
├── APIError (HTTP errors, retryable flag)
├── ValidationError (input validation)
└── TimeoutError (request timeouts)
```

### Graceful Degradation

When an iteration fails after retries:
1. Error is logged
2. Iteration is skipped
3. Processing continues with next iteration
4. Failed iteration is tracked in `failedIterations`
5. Summary includes failure information

## Streaming Architecture

Streaming requests use a configurable stream-creation timeout (default 60s). If the stream does not establish within that time, the client throws `TimeoutError` and the agent does not hang.

```
ClaudeClient.sendMessageStreaming()
    │
    ▼
StreamingHandler
    │
    ├── 'start'    event ───▶ Agent.emit('stream', ...)
    ├── 'chunk'    event ───▶ Agent.emit('stream', ...)
    ├── 'complete' event ───▶ Agent.emit('stream', ...)
    └── 'error'    event ───▶ Agent.emit('stream', ...)
                                     │
                                     ▼
                              CLI event handler
                              (writes to stderr)
```

## Verification System (Evaluator)

When `--verify` is enabled:

```
Iteration Output
      │
      ▼
┌─────────────────┐
│    Evaluator    │
│                 │
│ • Compares input│
│   vs output     │
│ • Checks for    │
│   regressions   │
│ • Scores quality│
└────────┬────────┘
         │
         ▼
VerificationResult {
  passed: boolean
  score: number (0-1)
  reasoning: string
  issues: string[]
}
```

## Skills System

### Dual Loading

The iteration system supports two loading modes:

1. **TypeScript Metadata** (synchronous, default)
   - Loaded from `src/prompts/iterations/*.ts`
   - Used when skills cache is not initialized

2. **Skills Files** (async)
   - Loaded from `.claude/skills/user-story/*/SKILL.md`
   - Anthropic Agent Skills format
   - Must call `initializeSkillsCache()` first

### Skill File Format

```markdown
---
id: accessibility
name: Accessibility
description: WCAG compliance requirements
category: quality
order: 4
applicableTo: all
---

# Accessibility Iteration

[Prompt content here...]
```

## Dependencies

```
user-story-agent
├── @anthropic-ai/sdk    # Claude API client
└── zod                  # Runtime validation
```

All other functionality uses Node.js built-ins (fs, path, events, readline).
