# Workflow Overview

Guide to the development workflow and available skills.

## Delegation Model

Claude orchestrates, specialists implement.

```
User Request
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE (Orchestrator)                                      │
│  - Understands intent                                       │
│  - Plans approach                                           │
│  - Delegates to specialists                                 │
│  - Reviews outputs                                          │
│  - Presents results                                         │
└─────────────────────────────────────────────────────────────┘
     │
     ├──────────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼
 cursor_dispatch  /code-review   /doc-write    /audit
 (implementation) (Steve review) (docs)        (quality)
```

---

## Skills Available

### `/code-review` — Steve McConnell Code Review

Reviews code with a "Steve McConnell" persona focused on pragmatic quality.

**Levels:**
- Level 1: MVP (critical bugs only)
- Level 2: Lean Production (DEFAULT) — stability, clarity, YAGNI
- Level 3: Enterprise (strict architectural review)

**Usage:**
```
/code-review src/path/to/file.py
/code-review src/path/to/file.py --level 3
```

---

### `/doc-write` — Documentation Writer

Delegates documentation creation to cursor_dispatch with type-specific prompts.

**Types:** `readme`, `spec`, `adr`, `ticket`, `audit`, `design`, `runbook`, `api-doc`, `user-story`

**Usage:**
```
/doc-write ticket docs/tickets/NEW-TICKET.md --task "Add retry logic to client"
/doc-write adr docs/decisions/0005-new-decision.md --task "Document caching choice"
```

**Includes Sizing Discipline:** Tickets must be completable in ~30 min focused work.

---

### `/doc-review` — Documentation Reviewer

Reviews docs with fresh eyes (separate agent context).

**Usage:**
```
/doc-review docs/path/to/doc.md
/doc-review docs/path/to/doc.md --level 3
```

---

### `/audit` — Quality Auditor

Multi-mode quality analysis tool.

**Modes:**

| Mode | Command | Purpose |
|------|---------|---------|
| **Ticket** | `/audit TICKET-XXX` | Audit implementation against acceptance criteria |
| **Ship** | `/audit --ship` | Production readiness check before deploy |
| **Coverage** | `/audit --coverage src/` | Risk-based test coverage gaps |
| **Sizing** | `/audit --sizing docs/tickets/` | Validate ticket sizing discipline |

**Ship Verdicts:**
- SHIP IT — Deploy with confidence
- SHIP WITH NOTES — Deploy + track issues
- FIX FIRST — Block until resolved

**Sizing Scores:**
- ✅ 100% RIGHT-SIZED
- ⚠️ 80-99% ALMOST
- 🔶 60-79% OVERSIZED
- ❌ <60% TOO BIG

---

### `/ast-grep` — Structural Code Search

Find code by AST patterns, not just text.

**Usage:**
```
/ast-grep  (then follow the guide)
```

**Examples:**
- Find all async functions without try-catch
- Find all logger calls inside class methods
- Find functions matching a pattern

---

## The Essential Loop

For any code change:

```
delegate → test → lint → REVIEW (Steve) → fix (delegate!) → commit
```

**Key rule:** Never commit without code review. If Steve says "Needs Changes", delegate fixes back to Cursor, don't fix manually.

---

## Sizing Discipline

Every ticket should pass the **Right-Sized Test**:

| Criterion | Check |
|-----------|-------|
| Explain | Problem & Solution ≤ 200 words |
| Scope | 1-3 files explicitly mentioned |
| Done | Clear Acceptance Criteria |
| Delegatable | Single `cursor_dispatch` (~30 min) |
| Quality Gates | ruff/pytest/Steve review in AC |

If a ticket is too big → **split it** (like COVERAGE-005 → 005a, 005b, 005c).

---

## Session Persistence

| Content | Location | Committed? |
|---------|----------|------------|
| Session progress | `.claude/session/progress.txt` | No |
| Permanent insights | `CLAUDE.md` | Yes |
| Architectural decisions | `docs/decisions/` ADRs | Yes |

---

## Quick Reference

```bash
# Code review
/code-review src/file.py

# Write a ticket
/doc-write ticket docs/tickets/07-quality/NEW-001.md --task "..."

# Check ship readiness
/audit --ship

# Check coverage gaps
/audit --coverage src/

# Validate ticket sizing
/audit --sizing docs/tickets/

# Find code patterns
/ast-grep
```

---

## Anti-Patterns to Avoid

1. **Manual quick fixes** — Always delegate back to Cursor
2. **Deferred quality checks** — Run lint/test after every change
3. **Commit without review** — Steve review is mandatory
4. **Oversized tickets** — Split anything > 2-3 hours
5. **"Future work" notes** — Create a follow-up ticket immediately
