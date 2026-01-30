# Memory Usage Strategy

**Version:** 1.0
**Date:** 2026-01-18
**Status:** Active

This document defines when and how to use memory throughout the design and coding workflows.

---

## Core Principles

1. **Memory is for decisions, not artifacts** - Don't store code/docs, store the *reasoning* behind them
2. **Prompted over automatic** - Per AP-2, always prompt before saving (no silent saves)
3. **Category discipline** - Use correct category for searchability
4. **Privacy-aware** - Default to Level 1 (personal), explicit for Level 0 (local-only) or Level 2+ (team)

---

## Design Workflow Integration

### Phase-by-Phase Memory Triggers

| Phase | Gate | Memory Trigger | Category | Prompt Template |
|-------|------|----------------|----------|-----------------|
| P0 - Intake | Gate P0 | Non-goal decisions | `decision` | "Save non-goal '{X}' as a decision to remember?" |
| P0.5 - Experience | Gate P0.5 | Anti-principles | `decision` | "Save anti-principle '{AP-X}' to prevent future violations?" |
| P1 - Reality Scan | Gate P1 | Discovered constraints | `pattern` | "Save constraint '{C-X}' as a pattern for this project?" |
| P2 - Use Cases | Gate P2 | Edge case learnings | `learning` | "Save edge case insight '{EC-X}' for future reference?" |
| P3 - Options | Gate P3 | Rejected alternatives (and why) | `decision` | "Save why we rejected '{Option X}'?" |
| P4 - Design Doc | Gate P4 | Key interface decisions | `decision` | "Save interface decision for {I-X}?" |
| P5 - Review | Gate P5 | Review findings addressed | `learning` | "Save lesson from review finding '{F-X}'?" |
| P6 - ADR | Gate P6 | **Every ADR** | `decision` | "Save ADR-{XXXX} decision to memory?" |
| P7 - Traceability | Gate P7 | (No memory trigger) | - | - |
| P8 - Tickets | Gate P8 | (No memory trigger) | - | - |

### Design Workflow Memory Actions

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DESIGN PIPELINE + MEMORY                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SESSION START                                                       │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────┐                                                │
│  │ /memory/context │  ← Auto-load relevant decisions/patterns       │
│  │   --project     │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │  P0: Intake     │                                                │
│  └────────┬────────┘                                                │
│           │ Gate P0 PASS                                            │
│           ▼                                                          │
│  ┌─────────────────┐   Prompt: "Save non-goals as decisions?"       │
│  │ MEMORY PROMPT   │──────────────────────────────────────────────► │
│  └────────┬────────┘                                                │
│           │                                                          │
│          ...                                                         │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   P6: ADR       │                                                │
│  └────────┬────────┘                                                │
│           │ Gate P6 PASS                                            │
│           ▼                                                          │
│  ┌─────────────────┐   ALWAYS prompt for each ADR                   │
│  │ MEMORY PROMPT   │──────────────────────────────────────────────► │
│  │ (mandatory)     │   "Save ADR-0003 decision? [Y/n]"              │
│  └────────┬────────┘                                                │
│           │                                                          │
│          ...                                                         │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │    COMPLETE     │                                                │
│  └─────────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Mandatory Memory Saves (Design)

These ALWAYS prompt (agent must not skip):

| Event | Category | Content Template |
|-------|----------|------------------|
| ADR created | `decision` | `[ADR-{XXXX}] {title}: {decision}` |
| Design option rejected | `decision` | `Rejected {option} for {feature} because: {reason}` |
| Anti-principle established | `decision` | `[AP-{X}] Never: {anti-principle}` |

### Optional Memory Saves (Design)

Prompt only if substantive:

| Event | Category | Condition |
|-------|----------|-----------|
| Non-goal added | `decision` | If it represents a deliberate exclusion |
| Constraint discovered | `pattern` | If it affects future work |
| Edge case documented | `learning` | If non-obvious |
| Review finding addressed | `learning` | If it reveals a pattern |

---

## Coding Workflow Integration

### Event-Based Memory Triggers

| Event | Category | Prompt Template | Privacy |
|-------|----------|-----------------|---------|
| `/review` finding fixed | `learning` | "Save pattern from fixing {finding}?" | Level 1 |
| Gate failure resolved | `learning` | "Save how we fixed {gate} failure?" | Level 1 |
| User states preference | `preference` | "Remember preference: {preference}?" | Level 1 |
| Architectural decision | `decision` | "Save architectural decision: {decision}?" | Level 1 |
| Bug pattern identified | `pattern` | "Save bug pattern to watch for?" | Level 1 |
| Security issue fixed | `pattern` | "Save security pattern for future?" | Level 0* |

*Security patterns default to Level 0 (local-only) for safety

### Coding Workflow Memory Actions

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CODING WORKFLOW + MEMORY                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SESSION START                                                       │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────────┐                                                │
│  │ /memory/context │  ← Auto-load preferences, patterns             │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   IMPLEMENT     │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   /gates        │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│      FAIL │ ─────────────────────────────────────────┐              │
│           │                                          │              │
│           │                                          ▼              │
│           │                              ┌─────────────────────┐    │
│           │                              │ Fix issue           │    │
│           │                              └──────────┬──────────┘    │
│           │                                         │               │
│           │                                         ▼               │
│           │                              ┌─────────────────────┐    │
│           │                              │ MEMORY PROMPT       │    │
│           │                              │ "Save fix pattern?" │    │
│           │                              └──────────┬──────────┘    │
│           │                                         │               │
│           │ ◄────────────────────────────────────────               │
│           │                                                          │
│      PASS ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   /review       │                                                │
│  └────────┬────────┘                                                │
│           │                                                          │
│  ISSUES   │ ─────────────────────────────────────────┐              │
│           │                                          │              │
│           │                                          ▼              │
│           │                              ┌─────────────────────┐    │
│           │                              │ Address findings    │    │
│           │                              └──────────┬──────────┘    │
│           │                                         │               │
│           │                                         ▼               │
│           │                              ┌─────────────────────┐    │
│           │                              │ MEMORY PROMPT       │    │
│           │                              │ "Save from finding?"│    │
│           │                              └──────────┬──────────┘    │
│           │                                         │               │
│           │ ◄────────────────────────────────────────               │
│           │                                                          │
│ APPROVED  ▼                                                          │
│  ┌─────────────────┐                                                │
│  │   COMMIT        │                                                │
│  └─────────────────┘                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implicit Context Recall

Agent should automatically recall relevant memories when:

| Situation | Memory Query | Purpose |
|-----------|--------------|---------|
| Working on feature X | `"feature X decisions"` | Surface past decisions |
| Fixing lint errors | `"ruff lint patterns"` | Recall common fixes |
| Writing tests | `"testing preferences"` | Apply user preferences |
| Making architecture choice | `"architecture decisions"` | Check for prior decisions |
| Starting new session | `/memory/context --project` | Load project context |

---

## Category Reference

| Category | Use For | Examples |
|----------|---------|----------|
| `decision` | Choices made with rationale | ADRs, rejected options, architectural choices |
| `preference` | User/project preferences | Code style, tool choices, conventions |
| `pattern` | Recurring patterns to follow/avoid | Bug patterns, security patterns, code patterns |
| `learning` | Insights and lessons learned | Review findings, failure post-mortems |

---

## Privacy Level Guidelines

| Level | When to Use | Examples |
|-------|-------------|----------|
| **0 - Local-only** | Sensitive, client-specific, security | API patterns, client configs, security fixes |
| **1 - Personal** | Personal workflow, default | Most decisions, preferences |
| **2 - Team** | Shared team decisions | Architecture, conventions, onboarding info |
| **3 - Org** | Org-wide standards | Company patterns, compliance requirements |

### Automatic Level Suggestions

Agent should suggest privacy level based on content:

| Content Pattern | Suggested Level |
|-----------------|-----------------|
| Contains "secret", "key", "password", "token" | Level 0 + warning |
| Contains "client", "confidential" | Level 0 |
| Contains "team decided", "we agreed" | Level 2 |
| Contains "company policy", "org standard" | Level 3 |
| Default | Level 1 |

---

## Session Lifecycle

### Session Start

**Current Implementation (Manual):**

Claude Code does not yet support automatic session startup hooks. Context loading is triggered:
- Manually by user: `/memory/context`
- Automatically by workflow commands: `/implement`, `/design-pipeline`
- When agent recognizes a new session (best effort)

```
1. Agent recognizes session start or user runs /memory/context
2. Execute: /memory/context --project
3. Display loaded context summary
4. Proceed with user request
```

**Future (When Hooks Available):**

When Claude Code supports `on_session_start` hooks, add to `.claude/settings.json`:
```json
{
  "hooks": {
    "on_session_start": "/memory/context --project"
  }
}
```

### During Session

```
1. Agent recognizes memory-worthy events (see triggers above)
2. Prompts user: "Would you like me to remember [X]?"
3. If yes: Calls /memory/save with appropriate category/level
4. Confirms save with sync status indicator
```

### Session End

```
1. If pending memories in sync queue: "X memories pending sync"
2. No automatic saves at session end
```

---

## Implementation Notes

### For `/design-pipeline` Integration

Add memory prompts at gate transitions:

```markdown
### Gate P6 Transition (ADR)
After each ADR is created:
1. Extract key decision from ADR
2. Prompt: "Save ADR-{XXXX} to memory? [Y/n]"
3. If yes: /memory/save "[ADR-{XXXX}] {decision}" --category decision
```

### For `/implement` Integration

Add memory prompts after fixing review findings:

```markdown
### After Disposition Table Execution
For each FIX NOW item:
1. Complete the fix
2. If fix reveals a pattern, prompt: "Save pattern from fixing {finding}?"
3. If yes: /memory/save "Pattern: {description}" --category pattern
```

### For `/review` Integration

After fact-checking findings:

```markdown
### Rejected Findings
If a finding is rejected as false positive:
1. Prompt: "Save that {pattern} is intentional in this codebase?"
2. If yes: /memory/save "Intentional pattern: {description}" --category pattern
```

---

## Metrics

Track memory effectiveness:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Memory recall during session | 3+ per hour | Count implicit recalls |
| Saved memories per design | 5-10 | Count after pipeline complete |
| Saved memories per coding session | 1-3 | Count per commit |
| Re-explanation events | < 1 per week | User reports "I already told you" |

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| Saving without prompting | Violates AP-2 | Always prompt |
| Saving code snippets | Memory is for reasoning | Save the *why*, not the *what* |
| Saving every decision | Context overload | Save only substantive decisions |
| Skipping ADR saves | ADRs are the most valuable | Always prompt for ADRs |
| Defaulting to Level 2+ | May leak sensitive info | Default to Level 1 |
| Saving during gate failure | Incomplete work | Save only after resolution |
