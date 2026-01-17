# /doc-review - Documentation QA Skill

## Purpose

Independent QA review of documentation using SEPARATE agent contexts. Multiple models from different providers catch different blind spots.

**Shared Vocabulary:** This skill uses the same three-level maturity framework (MVP/Lean/Enterprise) as the Steve code reviewer, ensuring alignment between code and documentation quality expectations.

**Important distinction:**
- **Steve** reviews CODE quality (via `/code-review`)
- **This skill** reviews DOCUMENTATION quality (via `/doc-review`)
- They are separate reviewers with separate purposes

## Usage

```
/doc-review <path> [--type spec|adr|ticket|audit|design|readme|runbook|api-doc|compliance] [--level 1|2|3] [--model <model>] [--dual] [--verify-code <code-path>]
```

**Levels:**
- **Level 1 (MVP/Prototype):** Structure, required sections, obvious errors
- **Level 2 (Lean Production):** + consistency, cross-refs, examples validity (DEFAULT)
- **Level 3 (Enterprise/Platform):** + deep validation, schema checking, compliance artifacts

**Models:** `auto` | `sonnet-4.5` | `opus-4.5` | `opus-4.5-thinking` | `gemini-3-pro` | `gemini-3-flash`

**Flags:**
- `--dual` : Run parallel reviews with Claude + Gemini, combine results (RECOMMENDED for Level 2+)

## Dual-Model Review (Recommended)

**Why dual-model?** Different providers have different:
- Training data and knowledge cutoffs
- Reasoning patterns and biases
- Strengths (Claude: nuance, Gemini: factual, breadth)

Running both in parallel catches issues either alone would miss.

### Default Pairings

| Review Level | Primary Model | Secondary Model | Parallel? |
|--------------|---------------|-----------------|-----------|
| Level 1 | `sonnet-4.5` | - | No (fast) |
| Level 2 | `sonnet-4.5` | `gemini-3-pro` | **Yes** |
| Level 3 | `opus-4.5` | `gemini-3-pro` | **Yes** |
| Critical | `opus-4.5-thinking` | `gemini-3-pro` | **Yes** |

### Dual Review Flow

```
/doc-review docs/specs/api.md --level 2 --dual
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ Claude Review │       │ Gemini Review │
│ (sonnet-4.5)  │       │ (gemini-3-pro)│
└───────┬───────┘       └───────┬───────┘
        │                       │
        └───────────┬───────────┘
                    ▼
        ┌───────────────────────┐
        │   Combine Results     │
        │   - Union of issues   │
        │   - Consensus verdict │
        │   - Conflict notes    │
        └───────────────────────┘
```

### Combined Output Format

```
## Dual-Model Review: api-spec.md

### Claude (sonnet-4.5) Findings
- Issue 1: Line 45 - inconsistent naming
- Issue 2: Line 120 - missing example
Verdict: NEEDS_CHANGES

### Gemini (gemini-3-pro) Findings
- Issue 1: Line 45 - inconsistent naming (SAME)
- Issue 3: Line 200 - ambiguous wording
- Issue 4: Line 315 - schema mismatch
Verdict: NEEDS_CHANGES

### Combined Assessment
**Consensus Issues (both found):**
- Line 45: inconsistent naming

**Claude-only Issues:**
- Line 120: missing example

**Gemini-only Issues:**
- Line 200: ambiguous wording
- Line 315: schema mismatch

**Final Verdict: NEEDS_CHANGES**
Total unique issues: 4
```

## Single-Model Selection

For quick reviews or when dual isn't needed:

| Review Level | Recommended Model | Why |
|--------------|-------------------|-----|
| Level 1 (Quick) | `sonnet-4.5` | Fast structure check |
| Level 2 (Standard) | `sonnet-4.5` | Good balance |
| Level 3 (Thorough) | `opus-4.5` | Deep analysis needed |
| Alternative view | `gemini-3-pro` | Different perspective |

**Default:** `--dual` for Level 2+, single `sonnet-4.5` for Level 1

## Why Separate Agent?

The writer agent has context bias - it "knows what it meant" even when the text is ambiguous. A separate review agent:
- Reads the doc fresh, like a new team member would
- Catches unclear explanations the writer thought were obvious
- Validates examples actually work (not just look right)
- Finds inconsistencies between sections

---

## Review Checklists by Doc Type

### Spec Review (`--type spec`)

```
cursor_agent_analyze_files prompt:

Review this specification document for quality and consistency.

FILE: {path}

STRUCTURE CHECKS:
- [ ] Has version number (SemVer format)
- [ ] Has status field (Draft/Review/Approved)
- [ ] Has date field
- [ ] Has table of contents (required if >500 lines)
- [ ] Has version history section
- [ ] All sections referenced in TOC exist

CONSISTENCY CHECKS:
- [ ] Field naming consistent throughout:
      - Timestamps: ts_monotonic_s, *_at_s, *_ms
      - Joint keys: head_yaw, head_pitch, head_roll, antenna_left, antenna_right
- [ ] Schema patterns consistent (if values/meta used, used everywhere)
- [ ] All JSON examples are valid JSON
- [ ] Examples match schema definitions
- [ ] Cross-references valid (Section X.Y exists if referenced)
- [ ] No TODO/FIXME/TBD markers in approved docs

COMPLETENESS CHECKS:
- [ ] Every API endpoint has request/response examples
- [ ] Every error code is documented
- [ ] Every field has type and description
- [ ] Edge cases and failure modes documented

OUTPUT FORMAT:
## Doc Review: {filename}

### Passed (N checks)
- List of passing checks

### Warnings (N issues)
- Line X: Issue description
- Line Y: Issue description

### Failed (N issues)
- Critical issue 1
- Critical issue 2

### Suggested Fixes
1. Specific fix for issue 1
2. Specific fix for issue 2

### Verdict: APPROVED | NEEDS_CHANGES | REJECTED
```

---

### ADR Review (`--type adr`)

```
cursor_agent_analyze_files prompt:

Review this Architecture Decision Record for completeness and clarity.

FILE: {path}

STRUCTURE CHECKS:
- [ ] Has Date, Status, Deciders fields
- [ ] Has Context section (explains WHY)
- [ ] Has Decision section (explains WHAT)
- [ ] Has Consequences section (positive/negative/neutral)
- [ ] Has Alternatives Considered (shows thinking process)

QUALITY CHECKS:
- [ ] Context explains the problem, not just the solution
- [ ] Decision is specific enough to implement
- [ ] Consequences include honest tradeoffs (not just positives)
- [ ] At least 2 alternatives were considered
- [ ] Status matches content (Proposed vs Accepted)

CLARITY CHECKS:
- [ ] A new team member could understand this without other context
- [ ] Technical terms are defined or linked
- [ ] Diagrams included for complex architecture

OUTPUT FORMAT:
## ADR Review: {filename}

### Structure: PASS | FAIL
Missing sections: ...

### Quality: PASS | NEEDS_WORK
Issues: ...

### Clarity: PASS | NEEDS_WORK
Unclear sections: ...

### Verdict: APPROVED | NEEDS_CHANGES
```

---

### Ticket Review (`--type ticket`)

```
cursor_agent_analyze_files prompt:

Review this implementation ticket for actionability.

FILE: {path}

STRUCTURE CHECKS:
- [ ] Has Priority, Effort, Status fields
- [ ] Has Problem section
- [ ] Has Solution section
- [ ] Has Acceptance Criteria
- [ ] Has Definition of Done

ACTIONABILITY CHECKS:
- [ ] Problem is clear without reading other tickets
- [ ] Solution is specific enough to implement
- [ ] Acceptance criteria are testable (not vague like "works correctly")
- [ ] Effort estimate is realistic for the scope
- [ ] Dependencies are identified and linked

QUALITY CHECKS:
- [ ] No blocked ticket without blocker identified
- [ ] Definition of Done includes verification commands
- [ ] Edge cases mentioned in Technical Notes

OUTPUT FORMAT:
## Ticket Review: {filename}

### Actionability: HIGH | MEDIUM | LOW
Can someone implement this without asking questions?

### Testability: PASS | FAIL
Are acceptance criteria testable?

### Issues Found:
- Issue 1
- Issue 2

### Verdict: APPROVED | NEEDS_CHANGES
```

---

### Audit Review (`--type audit`)

```
cursor_agent_analyze_files prompt:

Review this audit document for rigor and actionability.

FILE: {path}

STRUCTURE CHECKS:
- [ ] Has Date, Status, Auditor fields
- [ ] Has Executive Summary
- [ ] Has Findings with Severity ratings
- [ ] Has Summary Table
- [ ] Has Prioritized Recommendations

RIGOR CHECKS:
- [ ] Findings are evidence-based (includes code/logs/screenshots)
- [ ] Severity ratings match actual impact
- [ ] No findings without evidence
- [ ] Scope is clearly defined

ACTIONABILITY CHECKS:
- [ ] Recommendations are specific (not "improve security")
- [ ] Each finding has a clear remediation path
- [ ] Priorities are justified

OUTPUT FORMAT:
## Audit Review: {filename}

### Rigor: HIGH | MEDIUM | LOW
Are findings evidence-based?

### Actionability: HIGH | MEDIUM | LOW
Can someone act on recommendations?

### Issues:
- Issue 1
- Issue 2

### Verdict: APPROVED | NEEDS_CHANGES
```

---

### Design Doc Review (`--type design`)

```
cursor_agent_analyze_files prompt:

Review this design document for implementability.

FILE: {path}

STRUCTURE CHECKS:
- [ ] Has Overview, Goals, Non-Goals
- [ ] Has Architecture section with diagram
- [ ] Has API Changes (if applicable)
- [ ] Has Security Considerations
- [ ] Has Testing Strategy
- [ ] Has Open Questions (or explicitly states none)

IMPLEMENTABILITY CHECKS:
- [ ] Someone could implement from this doc alone
- [ ] Component responsibilities are clear
- [ ] Interfaces are defined (not just described)
- [ ] Data flow is step-by-step traceable

COMPLETENESS CHECKS:
- [ ] Non-goals prevent scope creep
- [ ] Alternatives considered (shows thinking)
- [ ] Security is explicitly addressed (not ignored)
- [ ] Rollback plan exists

OUTPUT FORMAT:
## Design Review: {filename}

### Implementability: HIGH | MEDIUM | LOW
Can someone build this from the doc?

### Completeness: PASS | GAPS_FOUND
Missing: ...

### Issues:
- Issue 1
- Issue 2

### Verdict: APPROVED | NEEDS_CHANGES
```

---

## Review Levels (Shared with Steve Code Reviewer)

### Level 1: MVP / Prototype
- Checks required sections exist
- Validates basic formatting
- **Focus:** Critical structure issues only
- **Ignore:** Style, polish, minor inconsistencies
- **Approval:** "A dev can run this without asking questions"
- ~30 seconds

### Level 2: Lean Production (DEFAULT)
- All Level 1 checks
- Validates field naming consistency
- Checks JSON examples are valid
- Validates cross-references
- **Focus:** Stability, clarity, correctness
- **Ignore:** Subjective style preferences, <5% improvements
- **Approval:** "A new team member can onboard using only this doc"
- ~2-3 minutes

### Level 3: Enterprise / Platform
- All Level 2 checks
- Validates examples match schemas exactly
- Checks every claim has evidence
- Validates version history accuracy
- Cross-checks with related documents
- Verifies external links are alive
- Checks compliance artifacts present
- **Focus:** Everything - nitpick if necessary
- **Ignore:** Nothing
- **Approval:** "Passes compliance audit and enables zero-knowledge onboarding"
- ~5-10 minutes

---

## Review Priority Order (P0-P4)

Reviews should check issues in priority order. Higher priority issues block approval.

### P0 - ACCURACY (BLOCKING)
- Do documented endpoints match code?
- Do examples actually work?
- Do schemas match implementations?
- **If `--verify-code` flag used:** Cross-reference docs against actual code

**Drift Detection (when --verify-code specified):**
```python
cursor_agent_analyze_files(
    paths=[doc_path, code_path],
    prompt="""
    Compare this documentation against the code.

    CHECK FOR DRIFT:
    - API endpoints in docs vs routes in code
    - Function signatures in docstrings vs actual signatures
    - Schema definitions vs model classes
    - Configuration options documented vs actually supported

    FLAG as CRITICAL if:
    - Doc describes endpoint that doesn't exist
    - Code has endpoint/feature not documented
    - Schema in docs doesn't match code model
    """
)
```

### P1 - COMPLETENESS
- Are all required artifacts present for this level?
- Are all sections filled (not stubs)?
- Are required fields (version, date, status) present?

### P2 - FRESHNESS
- Are external links alive? (verify with WebFetch for L3)
- Are version numbers current?
- Is this doc >6 months old? (check git log for L3)
- Are referenced dependencies still maintained?

### P3 - CLARITY
- Can a new engineer onboard from this?
- Are acronyms defined?
- Are diagrams included for complex flows?
- Is the tone appropriate for the level?

### P4 - COMPLIANCE (Level 3 only)
- Audit trails documented?
- Threat model present?
- SLOs/SLAs defined?
- Data flow diagrams included?
- Security model documented?

### Priority by Level

| Priority | L1 | L2 | L3 |
|----------|----|----|-----|
| P0 Accuracy | Check | Check | Check + verify |
| P1 Completeness | Structure only | All sections | All artifacts |
| P2 Freshness | Skip | Links only | Full check |
| P3 Clarity | Skip | Basic | Full check |
| P4 Compliance | Skip | Skip | Required |

---

## Issues vs Suggestions (Steve McConnell-inspired)

Reviews must clearly distinguish:

### Issues (Must Fix)
- Missing required sections
- Invalid JSON/code examples
- Broken cross-references
- Incorrect field naming
- Security/correctness problems
- Contradictions or ambiguity that blocks understanding

### Suggestions (Nice to Have)
- Style improvements
- Additional examples that would help
- Reorganization for clarity
- Prose polish
- Optional sections that could be added

**Level-Specific Filtering:**

| Level | Report Issues | Report Suggestions |
|-------|---------------|-------------------|
| 1 | Critical only | Never |
| 2 | All issues | Only if significant (>5% improvement) |
| 3 | All issues | All suggestions |

### Verdict Rules

**Verdict: APPROVED** when:
- No Issues remain (Suggestions are acceptable)
- Document meets quality bar for current Level

**Verdict: NEEDS_CHANGES** when:
- Any Issue exists
- Required sections missing or broken

**Stability Rules (avoid flip-flopping):**
1. If a fix introduces a minor trade-off but resolves the issue, accept it
2. Don't suggest reverting previous fixes
3. Discard suggestions that offer <5% improvement (Level 1-2)
4. When in doubt, approve - perfect is the enemy of good

---

## Implementation

When `/doc-review` is invoked, Claude should:

1. **Detect doc type** from path or `--type` flag:
   - `docs/specs/*` → spec
   - `docs/decisions/*` → adr
   - `docs/tickets/*` → ticket
   - `docs/audits/*` → audit
   - `docs/design/*` or `docs/02-design/*` → design

2. **Select review level** (default: 2)

3. **Determine review mode:**
   - `--dual` flag OR Level 2+ → dual-model review
   - `--model X` specified → single-model review with X
   - Level 1 → single-model with `sonnet-4.5`

4. **For DUAL-MODEL review (Level 2+ default):**

   Run both reviews in parallel using multiple tool calls in ONE message:

   ```python
   # PARALLEL EXECUTION - both in same message block
   cursor_agent_analyze_files(
       paths=[path],
       prompt="{review_prompt_for_type_and_level}",
       model="sonnet-4.5"  # Claude model
   )
   # AND simultaneously:
   cursor_agent_analyze_files(
       paths=[path],
       prompt="{review_prompt_for_type_and_level}",
       model="gemini-3-pro"  # Google model
   )
   ```

   **IMPORTANT:** Use parallel tool calls (multiple `<invoke>` blocks in single message) for true parallelism.

5. **For SINGLE-MODEL review:**
   ```python
   cursor_agent_analyze_files(
       paths=[path],
       prompt="{review_prompt_for_type_and_level}",
       model="sonnet-4.5"  # or user-specified model
   )
   ```

6. **Combine results (for dual-model):**
   - Parse both responses
   - Identify consensus issues (both found)
   - Identify unique issues (one found, other missed)
   - Determine final verdict (NEEDS_CHANGES if either found issues)
   - Present combined assessment

7. **Present to user:**
   - For dual: show both perspectives + combined assessment
   - For single: show findings + verdict

8. **If NEEDS_CHANGES:**
   - List all unique issues (union of both models' findings)
   - Offer to fix via `/doc-write`
   - "Found 4 issues (2 consensus, 1 Claude-only, 1 Gemini-only). Fix with `/doc-write`?"

---

## Review → Fix → Review Loop

```
/doc-review docs/specs/foo.md
    │
    ▼
NEEDS_CHANGES: 3 issues found
    │
    ▼
/doc-write spec docs/specs/foo.md --task "Fix issues: {list}"
    │
    ▼
/doc-review docs/specs/foo.md
    │
    ▼
APPROVED ✓
```

This loop should be automated when possible. Claude orchestrates until review passes.

---

## Integration with /doc-write

The `/doc-write` skill should automatically offer review:

```
[After doc-write completes]

Claude: "Documentation written to docs/specs/foo.md.
         Run `/doc-review docs/specs/foo.md` to validate?"
```

For important documents, Claude should proactively run review without asking.

---

## Anti-Patterns

**DO NOT:**
- Review your own writing in the same context (use separate agent)
- Skip review for "simple" docs (inconsistencies creep in)
- Accept NEEDS_CHANGES and present to user anyway
- Ignore Level 3 for specs going to "Approved" status

**DO:**
- Always use cursor_agent_analyze_files (separate context)
- Run Level 3 review before marking any spec as "Approved"
- Fix all issues before presenting to user
- Document what was found and fixed
