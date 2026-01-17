# Software Development Workflow

Best practices for AI-assisted software development with TypeScript/Node.js projects.

## Core Workflow: Claude Plans → Cursor Implements

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude (Orchestrator)                                          │
│  - Reads specs/tickets                                          │
│  - Plans implementation approach                                │
│  - Delegates to Cursor                                          │
│  - Runs tests, reviews code                                     │
│  - Delegates fixes back to Cursor                               │
│  - Commits when green                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cursor (Implementer)                                           │
│  - Writes code based on detailed prompts                        │
│  - Implements fixes based on error messages                     │
│  - Works on focused, well-scoped tasks                          │
└─────────────────────────────────────────────────────────────────┘
```

## The Implementation Loop

For each ticket/task:

```
1. READ SPEC
   └─→ Understand requirements before writing code

2. DELEGATE TO CURSOR
   └─→ cursor_dispatch with clear task description

3. RUN TESTS
   └─→ npm test (jest/vitest)

4. IF TESTS FAIL
   └─→ Delegate fix to Cursor (NOT manual fix!)
   └─→ Repeat steps 3-4

5. CODE REVIEW
   └─→ Run linter (eslint) and type checker (tsc)
   └─→ Review for patterns, security, clarity

6. IF REVIEW FINDS ISSUES
   └─→ Delegate fix to Cursor
   └─→ Repeat steps 3-5

7. COMMIT
   └─→ Only when tests pass AND review approves
```

## Critical Anti-Patterns to Avoid

### Anti-Pattern 1: "Quick Manual Fix"

**BAD:**
```
Tests fail with 3-line fix needed
→ "I'll just fix it myself, faster"
→ Breaks delegation discipline
→ Doesn't scale
```

**GOOD:**
```
Tests fail with 3-line fix needed
→ Delegate to Cursor with error context
→ Cursor learns from error patterns
→ Maintains workflow consistency
```

### Anti-Pattern 2: Deferred Quality Checks

**BAD:**
```
Implement → Implement → Implement → ... → Audit (find 112 issues!)
```

**GOOD:**
```
Implement → Test → Lint → Review → Commit (always clean)
```

### Anti-Pattern 3: Accumulated Stale PRs

**BAD:**
```
Cursor cloud agents create PRs
→ Never merged or cleaned up
→ Stale PRs accumulate
```

**GOOD:**
```
After each Cursor cloud task:
→ Review PR → Merge or Close
OR use local mode to avoid PRs entirely
```

## Parallel Execution Strategy

**When to parallelize:**
- Independent components (no shared dependencies)
- Different test files or modules
- Separate features that don't interact

**When NOT to parallelize:**
- Sequential dependencies
- Shared state or database
- Integration tests

## Code Review Levels

| Level | Name | When to Use | Focus |
|-------|------|-------------|-------|
| 1 | MVP | Prototype, POC | Critical bugs, security only |
| 2 | Lean Production | Default | Stability, clarity, YAGNI |
| 3 | Enterprise | Critical systems | Strict architecture, full coverage |

**Level 2 (default) checklist:**
- [ ] No obvious bugs
- [ ] No security vulnerabilities
- [ ] Clear, readable code
- [ ] Proper error handling
- [ ] Tests cover happy path + key edge cases
- [ ] No over-engineering

## Test Strategy

### Jest/Vitest Run in Parallel by Default

No special configuration needed for parallel execution. For sequential tests:

```typescript
// jest.config.js
module.exports = {
  maxWorkers: 1, // Force sequential if needed
};

// Or run with flag
// npx jest --runInBand
```

### Test During Development, Not Just CI

```bash
# After EVERY code change
npm test

# Quick smoke test for specific module
npm test -- --testPathPattern=story

# Watch mode during development
npm test -- --watch
```

## Quality Gates

Run these before EVERY commit:

```bash
# Minimum gate
npm run lint && npm test

# Full gate
npm run lint && npm run typecheck && npm test
```

**Automate via pre-commit hooks** (husky + lint-staged).

## Delegation Prompt Templates

### Initial Implementation

```
cursor_dispatch:
  task: |
    Implement [TICKET-XXX]: [Title]

    Requirements:
    - [Requirement 1]
    - [Requirement 2]

    Files to create/modify:
    - src/module/file.ts
    - tests/file.test.ts

    Patterns to follow:
    - See existing [similar_file.ts] for patterns

    Run tests after implementation to verify.
  mode: local
  cwd: /path/to/project
```

### Fix Delegation

```
cursor_dispatch:
  task: |
    Fix the following test failures:

    Failed tests:
    - test something: TypeError: Cannot read property 'x' of undefined
    - test other: AssertionError: expected 'idle' but got 'speaking'

    Root causes to investigate:
    - Missing null check in functionX()
    - State machine transition logic

    Run npm test after fixes to verify.
  mode: local
  cwd: /path/to/project
```

### Code Review Fix

```
cursor_dispatch:
  task: |
    Address the following code review issues:

    HIGH:
    - manager.ts:45 - Resource leak in unregister()

    MEDIUM:
    - stateMachine.ts:320 - Dangling async task

    LOW:
    - yolo.ts:98 - Unused parameter

    Apply fixes and run lint + test to verify.
  mode: local
  cwd: /path/to/project
```

## Project Audit Checklist

Run periodically (weekly or at milestones):

### Code Quality
- [ ] `npm run lint` - 0 errors
- [ ] `npm run typecheck` - No errors
- [ ] No TODO/FIXME accumulation
- [ ] No commented-out code

### Tests
- [ ] All tests passing
- [ ] Test execution time acceptable
- [ ] Coverage meets target (80%+)

### Git Hygiene
- [ ] No stale branches
- [ ] No stale PRs
- [ ] Commits are atomic and well-described

### Security
- [ ] No hardcoded secrets
- [ ] No SQL/command injection
- [ ] Input validation at boundaries
- [ ] `npm audit` clean

### Documentation
- [ ] README current
- [ ] API docs if applicable
- [ ] ADRs for key decisions

## Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Test pass rate | 100% | CI/CD |
| Lint errors | 0 | `npm run lint` |
| Type errors | 0 | `npm run typecheck` |
| Test time | <60s | `npm test` |
| Coverage | >80% | `npm test -- --coverage` |

## Quick Reference

```bash
# The essential loop
delegate → test → lint → REVIEW (Steve) → fix (delegate!) → commit

# Quality commands
npm run lint && npm run typecheck && npm test

# Security audit
npm audit
```
