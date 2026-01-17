# Session Persistence

This directory separates ephemeral session progress from permanent architectural insights in CLAUDE.md.

## What Goes Where

| Content Type | Location | Commit? |
|--------------|----------|---------|
| Session progress | `progress.md` | NO |
| Task status | Claude's TodoWrite | NO |
| **Permanent** insights | `../../CLAUDE.md` | YES |
| **Permanent** decisions | `docs/decisions/` ADR | YES |

## Progress Entry Format

Append to `progress.md` at session end:

```markdown
## Session: YYYY-MM-DD - [Brief Tag]

### Completed
- [Task 1]
- [Task 2]

### Patterns Discovered
- [Pattern 1]: [Why it matters]

### Issues Encountered
- [Issue]: [Resolution or workaround]

### Files Modified
- `path/to/file.ts` - [what changed]

### Next Session
- [ ] [Task 1]
- [ ] [Task 2]
```

## When to Update CLAUDE.md

ONLY add to CLAUDE.md when:
- It's an **architectural insight** that affects future work
- It's a **workflow improvement** we want to keep
- It's a **pattern** that should be followed project-wide

**DO NOT** put session progress in CLAUDE.md.

## File Lifecycle

1. **Session starts:** Read `progress.md` to see previous session's "Next Session" section
2. **Session active:** Use TodoWrite for in-session tracking
3. **Session ends:** Append summary to `progress.md`
4. **Milestone reached:** Move permanent insights to CLAUDE.md, create ADR if needed
