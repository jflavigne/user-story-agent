# USA-16: Agent Entry Point - Implementation Plan

## Goal
Design and implement the agent entry point with CLI support and proper library exports.

## Current State Analysis

### Existing Code
- ✅ `src/agent/index.ts` - Barrel exports (UserStoryAgent, createAgent, types, ClaudeClient, state)
- ✅ `src/agent/user-story-agent.ts` - Has `createAgent(config)` factory function
- ✅ `src/agent/types.ts` - Has UserStoryAgentConfig and AgentResult interfaces
- ✅ `src/index.ts` - Exists but only exports VERSION
- ⚠️ `package.json` - Has `"agent": "tsx src/agent/index.ts"` but this points to barrel exports, not CLI

### Gaps
- ❌ No CLI entry point file
- ❌ No configuration handling module (env vars, defaults, validation)
- ❌ `src/index.ts` doesn't export agent functionality
- ❌ Package.json script points to wrong file

---

## Step-by-Step Implementation Plan

### Phase 1: Configuration Module (Foundation)

**1. Create `src/agent/config.ts`**
   - Purpose: Centralize configuration handling (env vars, defaults, validation)
   - Functions to implement:
     - `loadConfigFromEnv()` - Read from environment variables
     - `mergeConfigWithDefaults(partialConfig)` - Merge user config with defaults
     - `validateConfig(config)` - Validate configuration (can reuse agent's validateConfig logic)
   - Defaults:
     - `apiKey`: `process.env.ANTHROPIC_API_KEY`
     - `model`: `'claude-sonnet-4-20250514'`
     - `mode`: `'individual'` (if not specified)
     - `iterations`: `[]` (must be provided by user)
   - Export: `AgentConfig` type (alias for UserStoryAgentConfig) and helper functions

**2. Update `src/agent/types.ts`**
   - Add JSDoc examples for UserStoryAgentConfig
   - Consider if we need a separate CLI-specific config type (probably not - YAGNI)

### Phase 2: Main Library Export

**3. Update `src/index.ts`**
   - Export all agent functionality:
     - Re-export from `src/agent/index.ts` (UserStoryAgent, createAgent, types)
     - Re-export from `src/shared/index.ts` (if needed)
     - Keep VERSION export
   - Add JSDoc with usage examples:
     ```typescript
     /**
      * @example
      * ```typescript
      * import { createAgent } from 'user-story-agent';
      * 
      * const agent = createAgent({
      *   mode: 'individual',
      *   iterations: ['validation', 'accessibility'],
      *   apiKey: process.env.ANTHROPIC_API_KEY
      * });
      * 
      * const result = await agent.processUserStory('As a user...');
      * ```
      */

### Phase 3: CLI Entry Point

**4. Create `src/cli.ts`**
   - Purpose: CLI entry point for `npm run agent`
   - Keep it simple - no CLI framework (YAGNI principle)
   - Use Node.js built-in `process.argv` parsing
   - Support arguments:
     - `--mode <individual|workflow>` (required)
     - `--iterations <id1,id2,...>` (required for individual mode)
     - `--product-type <web|mobile|desktop>` (required for workflow mode)
     - `--input <file>` or read from stdin (default: stdin)
     - `--output <file>` or write to stdout (default: stdout)
     - `--api-key <key>` (optional, defaults to env var)
     - `--model <model>` (optional, defaults to claude-sonnet-4-20250514)
   - Flow:
     1. Parse CLI arguments
     2. Read input (file or stdin)
     3. Load config (merge CLI args + env vars + defaults)
     4. Create agent using `createAgent()`
     5. Process story
     6. Write output (file or stdout)
     7. Exit with appropriate code (0 on success, 1 on error)

**5. Add error handling and user-friendly messages**
   - Validate required arguments
   - Show usage/help message if arguments are invalid
   - Clear error messages for common issues (missing API key, invalid iteration IDs, etc.)

### Phase 4: Package.json Updates

**6. Update `package.json` scripts**
   - Change `"agent": "tsx src/agent/index.ts"` → `"agent": "tsx src/cli.ts"`
   - Verify `"main"` points to `"dist/index.js"` (already correct)
   - Verify `"types"` points to `"dist/index.d.ts"` (already correct)

### Phase 5: Documentation & Examples

**7. Add JSDoc examples to key exports**
   - `src/agent/index.ts` - Add example for createAgent usage
   - `src/cli.ts` - Add file-level JSDoc with CLI usage examples
   - `src/index.ts` - Add library usage examples

**8. Create inline usage examples in code**
   - Add example comments showing:
     - Library usage (programmatic)
     - CLI usage (command-line)

### Phase 6: Testing & Validation

**9. Test CLI with various scenarios**
   - Individual mode with iterations
   - Workflow mode with product type
   - Input from file
   - Input from stdin
   - Output to file
   - Output to stdout
   - Error cases (missing args, invalid IDs, etc.)

**10. Verify library exports work**
   - Test importing from `src/index.ts`
   - Test importing from `src/agent/index.ts`
   - Verify TypeScript types are correct

**11. Run quality gates**
   - `npm run lint`
   - `npm run typecheck`
   - `npm test` (if tests exist for these modules)

---

## Design Decisions

### 1. Configuration Module (`config.ts`)
**Decision**: Create dedicated config module
**Rationale**: 
- Centralizes env var handling
- Makes testing easier
- Follows separation of concerns
- Can be reused by both CLI and library usage

### 2. CLI Framework
**Decision**: No framework (use Node.js built-ins)
**Rationale**:
- YAGNI - basic functionality only
- Minimal dependencies
- Simple argument parsing is sufficient for MVP
- Can add framework later if needed

### 3. CLI Arguments
**Decision**: Support essential args only
**Rationale**:
- `--mode`, `--iterations`/`--product-type` are required
- `--input`, `--output` for file I/O (stdin/stdout default)
- `--api-key`, `--model` for overrides
- Keep it minimal per requirements

### 4. File Location
**Decision**: `src/cli.ts` (not `src/agent/cli.ts`)
**Rationale**:
- CLI is a top-level entry point
- Keeps agent module focused on core functionality
- Matches common Node.js project structure

### 5. Factory Function Name
**Decision**: Keep `createAgent` (don't rename to `createUserStoryAgent`)
**Rationale**:
- Already exists and works
- Shorter name is fine in context
- No need to change unless there's a naming conflict

---

## File Structure After Implementation

```
src/
├── index.ts              # Main library export (updated)
├── cli.ts                # CLI entry point (NEW)
├── agent/
│   ├── index.ts          # Agent barrel exports (no changes needed)
│   ├── config.ts         # Configuration handling (NEW)
│   ├── types.ts          # Types (add examples)
│   └── user-story-agent.ts # Agent implementation (no changes)
└── ...
```

---

## Acceptance Criteria Checklist

- [ ] Create `createUserStoryAgent(options)` factory function
  - ✅ Already exists as `createAgent` - verify it meets requirements
- [ ] Support CLI invocation via `npm run agent`
  - [ ] Create `src/cli.ts`
  - [ ] Update package.json script
  - [ ] Test CLI works
- [ ] Export agent class and types for library usage
  - [ ] Update `src/index.ts` to export agent functionality
  - [ ] Verify exports work
- [ ] Include example usage in comments
  - [ ] Add JSDoc examples to exports
  - [ ] Add CLI usage examples

---

## Implementation Order

1. **Config module** (foundation for everything else)
2. **Main library export** (simple re-exports)
3. **CLI entry point** (depends on config)
4. **Package.json update** (trivial)
5. **Documentation** (can be done in parallel)
6. **Testing** (final validation)

---

## Notes

- Follow existing code patterns (TypeScript strict mode, error handling style)
- Keep CLI simple - no fancy features
- Focus on MVP functionality per requirements
- Can enhance later if needed (CLI framework, more options, etc.)
