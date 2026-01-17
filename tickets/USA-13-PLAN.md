# USA-13 Implementation Plan: Core Agent Class - Individual Mode

## Overview

Implement `UserStoryAgent` class with individual iteration mode. This class will serve as the core agent for processing user stories through enhancement iterations using the Claude API.

---

## Dependencies Status

| Dependency | Status | File |
|------------|--------|------|
| USA-10 (Iteration Registry) | Done | `src/shared/iteration-registry.ts` |
| USA-12 (Context Manager) | Done | `src/agent/state/context-manager.ts` |

---

## Implementation Tasks

### Task 1: Create Agent Config Types

**File:** `src/agent/types.ts`

Define configuration and result types for the agent:

```typescript
interface UserStoryAgentConfig {
  mode: 'individual';  // (workflow/interactive added in later tickets)
  iterations: IterationId[];  // Which iterations to apply
  productContext?: ProductContext;
  apiKey?: string;  // Optional, defaults to ANTHROPIC_API_KEY env
  model?: string;   // Optional, defaults to claude-sonnet-4-20250514
}

interface AgentResult {
  success: boolean;
  originalStory: string;
  enhancedStory: string;
  appliedIterations: string[];
  iterationResults: IterationResult[];
  summary: string;
}
```

### Task 2: Create Claude API Client Wrapper

**File:** `src/agent/claude-client.ts`

Wrap the Anthropic SDK with our domain-specific needs:

```typescript
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: string;
  stopReason: string;
  usage: { inputTokens: number; outputTokens: number };
}

class ClaudeClient {
  constructor(apiKey?: string, model?: string);
  async sendMessage(systemPrompt: string, messages: ClaudeMessage[]): Promise<ClaudeResponse>;
}
```

### Task 3: Implement UserStoryAgent Class

**File:** `src/agent/user-story-agent.ts`

Core implementation:

```typescript
class UserStoryAgent {
  private config: UserStoryAgentConfig;
  private client: ClaudeClient;
  private contextManager: ContextManager;

  constructor(config: UserStoryAgentConfig);

  // Main entry point
  async processUserStory(initialStory: string): Promise<AgentResult>;

  // Individual mode - applies only specified iterations in order
  private async runIndividualMode(state: StoryState): Promise<StoryState>;

  // Apply single iteration
  private async applyIteration(
    iteration: IterationRegistryEntry,
    state: StoryState
  ): Promise<IterationResult>;
}
```

**Key Implementation Details:**

1. **Constructor** - Initialize client, validate config, set up context manager
2. **processUserStory** - Create initial state, delegate to mode runner, build result
3. **runIndividualMode** - Loop through `config.iterations` in order, apply each
4. **applyIteration** - Build prompt with context, call Claude, parse response

### Task 4: Create Barrel Export

**File:** `src/agent/index.ts`

Export all public APIs:

```typescript
export { UserStoryAgent, createAgent } from './user-story-agent.js';
export type { UserStoryAgentConfig, AgentResult } from './types.js';
export { ClaudeClient } from './claude-client.js';
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/agent/user-story-agent.test.ts`

1. **Config validation tests**
   - Rejects invalid iteration IDs
   - Accepts valid config

2. **Individual mode tests**
   - Applies iterations in specified order
   - Passes context between iterations
   - Returns correct AgentResult structure

3. **applyIteration tests**
   - Builds correct prompt with context
   - Handles Claude API response correctly

### Mock Strategy

- Mock `ClaudeClient` to avoid real API calls
- Use fixture stories and expected outputs

---

## Execution Plan (Using Cursor + Steve)

### Phase 1: Implementation (Cursor)

```bash
# Delegate implementation to Cursor
cursor_dispatch:
  task: |
    Implement USA-13: UserStoryAgent with individual mode.

    Create these files:
    1. src/agent/types.ts - Agent config and result types
    2. src/agent/claude-client.ts - Anthropic SDK wrapper
    3. src/agent/user-story-agent.ts - Main agent class
    4. Update src/agent/index.ts - Add exports

    Requirements:
    - Import types from src/shared/types.ts
    - Use ContextManager from src/agent/state/context-manager.ts
    - Use iteration registry from src/shared/iteration-registry.ts
    - Use SYSTEM_PROMPT from src/prompts/system.ts
    - Individual mode applies iterations in config.iterations order
    - Each iteration gets context from ContextManager.buildContextPrompt()
    - After each iteration, update state via ContextManager.updateContext()

    See USA-13-PLAN.md for detailed specs.
  mode: local
  cwd: /Users/jflavigne/user-story-agent
```

### Phase 2: Quality Gate

```bash
# Run quality checks
npm run lint && npm run typecheck && npm test
```

### Phase 3: Code Review (Steve)

```bash
# Use /code-review skill
/code-review src/agent/user-story-agent.ts src/agent/claude-client.ts src/agent/types.ts --level 2
```

If issues found, delegate fixes back to Cursor, then re-run quality gate.

### Phase 4: Tests (Cursor)

```bash
# Delegate test writing to Cursor
cursor_dispatch:
  task: |
    Write unit tests for UserStoryAgent in tests/agent/user-story-agent.test.ts

    Requirements:
    - Mock ClaudeClient to avoid real API calls
    - Test config validation
    - Test individual mode applies iterations in order
    - Test applyIteration builds correct prompts
    - Test AgentResult structure
  mode: local
  cwd: /Users/jflavigne/user-story-agent
```

### Phase 5: Final Quality Gate + Commit

```bash
npm run lint && npm run typecheck && npm test
# If all pass, commit
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/agent/types.ts` | Create | Agent config and result types |
| `src/agent/claude-client.ts` | Create | Anthropic SDK wrapper |
| `src/agent/user-story-agent.ts` | Create | Main UserStoryAgent class |
| `src/agent/index.ts` | Modify | Add exports |
| `tests/agent/user-story-agent.test.ts` | Create | Unit tests |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Claude API rate limits | Add basic retry logic with exponential backoff |
| Token limits | Track usage, warn if approaching limits |
| Response parsing | Define clear expected format, handle variations |

---

## Definition of Done

- [ ] All acceptance criteria from USA-13 met
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Unit tests pass
- [ ] Code review approved (Steve level 2)
