# /doc-write - Documentation Writing Skill

## Purpose

Delegate documentation writing to cursor-agent specialists, keeping Claude as orchestrator. Each document type has specific structure requirements and conventions.

**Shared Vocabulary:** This skill uses the same three-level maturity framework (MVP/Lean/Enterprise) as the Steve code reviewer, ensuring alignment when documentation accompanies code. However, Steve reviews CODE - this skill writes DOCS independently.

**Two entry points:**
1. **Primary:** User requests documentation → `/doc-write` creates it
2. **Secondary:** Steve reviews code, flags doc gaps → Claude invokes `/doc-write` to address them

## Usage

```
/doc-write <type> <path> --task "description" [--level 1|2|3] [--model <model>] [--no-review]
```

**Types:** `readme` | `spec` | `adr` | `ticket` | `audit` | `design` | `runbook` | `api-doc` | `compliance` | `user-story` | `rfc`

**Levels:**
- **Level 1 (MVP/Prototype):** Fast structure, minimal polish - don't block the build
- **Level 2 (Lean Production):** Complete, consistent, ready to use (DEFAULT)
- **Level 3 (Enterprise/Platform):** Polished, verified, compliance-ready

**Models:** `auto` | `sonnet-4.5` | `opus-4.5` | `opus-4.5-thinking` | `gemini-3-pro` | `gpt-5.2`

**Flags:**
- `--no-review` : Skip auto-review (use for drafts or when manually reviewing)

---

## Quality Levels (Shared with Steve Code Reviewer)

### Level 1: MVP / Prototype
- **Goal:** Speed. Don't block the dev.
- **Focus:** Required sections exist, basic formatting
- **Ignore:** Polish, extensive examples, cross-refs, version history
- **Review:** Structure check only (Level 1 review)
- **Tone:** Informal, imperative ("Run `npm start`. It works on my machine.")
- **Motto:** "Make it work"

**FORBIDDEN at Level 1:**
- Architecture diagrams
- OpenAPI/GraphQL specs
- Runbooks or incident playbooks
- Compliance documentation

### Level 2: Lean Production (DEFAULT)
- **Goal:** Stability. Documentation must survive team turnover.
- **Focus:** All required sections, working examples, consistent naming, proper cross-refs
- **Ignore:** Perfect prose, exhaustive edge cases
- **Review:** Standard review (Level 2) with auto-fix loop
- **Tone:** Professional but practical ("This endpoint returns 429 under load. Cache responses client-side.")
- **Motto:** "YAGNI - Keep it simple but safe"

### Level 3: Enterprise / Platform
- **Goal:** Compliance, auditability, zero-knowledge onboarding.
- **Focus:** Every detail verified, all cross-refs valid, changelog accurate, no ambiguity
- **Ignore:** Nothing - nitpick everything
- **Review:** Thorough review (Level 3) with dual-model QA
- **Tone:** Formal, exhaustive ("This service implements OAuth 2.0 PKCE flow per RFC 7636.")
- **Motto:** "Bulletproof at scale"

### Level Selection by Doc Type

| Doc Type | Default Level | When to Use Level 3 | Forbidden at L1 |
|----------|---------------|---------------------|-----------------|
| `readme` | 2 | SLOs required | - |
| `spec` | 2 | Status → "Approved" | - |
| `adr` | 2 | Status → "Accepted" | - |
| `ticket` | 1 | Complex, multi-team | - |
| `audit` | 2 | Final audit reports | - |
| `design` | 2 | Status → "Approved" | - |
| `runbook` | 2 | Incident response needed | YES |
| `api-doc` | 2 | SDK generation needed | YES |
| `compliance` | 3 | Always L3 | YES |
| `user-story` | 1 | External stakeholders | - |
| `rfc` | 2 | Status → "Accepted" | - |

### Required vs Conditional Artifacts

| Artifact | L1 | L2 | L3 | Condition |
|----------|----|----|----|-----------|
| README | REQ | REQ | REQ | Always |
| Inline comments | OPT | REQ | REQ | Where logic non-obvious |
| API docs | - | REQ | REQ | If public APIs exist |
| ADRs | - | OPT | REQ | For non-obvious decisions |
| Runbook | - | REQ | REQ | If deployable service |
| Migration guide | - | COND | REQ | If breaking changes |
| Compliance docs | - | - | REQ | Always at L3 |
| Onboarding path | - | - | REQ | Always at L3 |

**Legend:** REQ=Required, OPT=Optional, COND=Conditional, -=Forbidden

---

## Approval Loop

### Write → Review → Fix → Approve

The skill automatically reviews output and iterates until approved:

```
┌─────────────────────────────────────────────────────────────┐
│  /doc-write spec foo.md --task "..." --level 2              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  cursor_dispatch: Write documentation                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  cursor_agent_analyze_files: Review at matching level        │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────┐           ┌─────────────────────┐
│  Verdict: APPROVED  │           │  Verdict: NEEDS_FIX │
│  → Present to user  │           │  → Extract issues   │
└─────────────────────┘           └─────────┬───────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  cursor_dispatch: Fix   │
                              │  issues from review     │
                              └─────────────┬───────────┘
                                            │
                                            ▼
                                    [Loop back to Review]
                                    (max 3 iterations)
```

### Loop Configuration

| Level | Max Iterations | On Max Reached |
|-------|----------------|----------------|
| 1 | 1 | Present as-is (draft) |
| 2 | 3 | Present with warnings |
| 3 | 5 | Escalate to user |

### Verdict Format

```
## Write Result: {filename}

**Level:** 2 (Production)
**Iterations:** 2
**Verdict:** APPROVED

### Summary
- Sections: 8/8 required ✓
- Examples: 5 JSON samples ✓
- Cross-refs: 3 validated ✓

### Review Notes
[Any suggestions for future improvement]
```

---

## Model Selection

| Level | Default Model | Why |
|-------|---------------|-----|
| Level 1 | `sonnet-4.5` | Fast, cost-effective |
| Level 2 | `auto` | Cursor selects based on task |
| Level 3 | `opus-4.5` | Better reasoning for polish |

| Task Complexity | Recommended Model | Why |
|-----------------|-------------------|-----|
| Simple ticket, short ADR | `sonnet-4.5` | Fast, cost-effective |
| Complex spec, design doc | `opus-4.5` | Better reasoning, structure |
| Architectural analysis | `opus-4.5-thinking` | Deep thinking for tradeoffs |
| Quick drafts | `gemini-3-flash` | Fastest option |

**Override:** `--model X` always takes precedence

---

## Doc-Type Agents

### 1. Spec Writer (`/doc-write spec`)

**cursor_dispatch prompt template:**

```
Write/update a technical specification document.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
- Version (SemVer), Status (Draft|Review|Approved), Date
- Executive Summary (2-3 sentences)
- Table of Contents (if >500 lines)
- Numbered sections with clear hierarchy
- JSON/code examples with syntax highlighting
- Version History table at end

CONVENTIONS:
- Timestamps: ts_monotonic_s, *_at_s (monotonic), *_ms (durations)
- Measured data: Always use values/meta separation pattern
- Joint keys: head_yaw, head_pitch, head_roll, antenna_left, antenna_right
- All JSON examples must be valid and consistent
- Cross-references use "Section X.Y" format

QUALITY BAR:
- Every claim has an example
- Every schema has a JSON sample
- No placeholder text (TODO, TBD, etc.)
- Consistent terminology throughout
```

**Example:**
```
/doc-write spec docs/specs/new-feature.md --task "Define the Audio Capture API including WebSocket protocol, message formats, and error handling"
```

---

### 2. ADR Writer (`/doc-write adr`)

**cursor_dispatch prompt template:**

```
Write an Architecture Decision Record.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# ADR-NNNN: {Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Deciders:** {roles}

## Context
Why this decision is needed. What problem are we solving?
Include constraints, requirements, and forces at play.

## Decision
What we decided. Be specific and concrete.
Include diagrams if architectural.

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Mitigation strategy

### Neutral
- Side effect that's neither good nor bad

## Alternatives Considered
| Option | Pros | Cons | Why Not |
|--------|------|------|---------|
| Alt 1  | ...  | ...  | ...     |

## Implementation Notes
- Affected files
- Migration path (if applicable)

QUALITY BAR:
- Context explains WHY, not just WHAT
- Decision is actionable (someone could implement from this)
- Consequences are honest (include real tradeoffs)
- Alternatives show the thinking process
```

**Example:**
```
/doc-write adr docs/decisions/0002-event-stream-protocol.md --task "Document decision to use SSE over WebSocket for event streaming, including rationale and alternatives considered"
```

---

### 3. Ticket Writer (`/doc-write ticket`)

**cursor_dispatch prompt template:**

```
Write an implementation ticket.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {TICKET-ID}: {Title}

**Priority:** P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low)
**Effort:** X-Y hours
**Status:** TODO | IN_PROGRESS | BLOCKED | DONE
**Assignee:** (optional)

## Dependencies
| Dependency | Required For | Status |
|------------|--------------|--------|
| TICKET-XXX | ...          | ...    |

## Problem
What problem does this solve? Why does it matter?
Include user impact if applicable.

## Solution
Specific implementation approach.
Include code snippets, API changes, file modifications.

## Acceptance Criteria
- [ ] Criterion 1 (testable)
- [ ] Criterion 2 (testable)
- [ ] Tests pass
- [ ] Documentation updated

## Technical Notes
Implementation details, gotchas, edge cases.

## Definition of Done
```bash
# Commands to verify completion
pytest tests/...
curl http://...
```

QUALITY BAR:
- Problem is clear without reading other tickets
- Solution is specific enough to implement
- Acceptance criteria are testable (not vague)
- Effort estimate is realistic

## SIZING DISCIPLINE (Critical)

Each ticket MUST be completable in ONE Claude Code session (~30 min focused work).

**Right-Sized Test:**
- Can explain the task in 2-3 sentences? -> YES
- Touches 1-3 files? -> YES
- Has clear "done" definition? -> YES
- Could be delegated with a single cursor_dispatch? -> YES

**Too Big (MUST split):**
- "Implement the motion system" -> SPLIT into integrator, watchdog, protocol
- "Add authentication" -> SPLIT into token, middleware, endpoints
- "Refactor the daemon" -> SPLIT into config, server, handlers

**Right-Sized Examples:**
- "Add velocity-to-position integrator function" -> GOOD
- "Create WebSocket handshake handler" -> GOOD
- "Add watchdog freeze stage" -> GOOD

**If ticket is too big:**
1. STOP - do not write it
2. Split into 2-4 smaller tickets
3. Add dependency links between them
4. Each sub-ticket should pass the Right-Sized Test

## MANDATORY ACCEPTANCE CRITERIA

Every ticket MUST include these in Acceptance Criteria:
- [ ] `ruff check` passes
- [ ] `pytest` passes
- [ ] Steve code review: Level 2 PASS
```

**Example:**
```
/doc-write ticket docs/tickets/07-e2e-reality/E2E-011-new-test.md --task "Create ticket for implementing audio latency measurement test"
```

---

### 4. Audit Writer (`/doc-write audit`)

**cursor_dispatch prompt template:**

```
Write a technical audit document.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {Topic} Audit

**Date:** YYYY-MM-DD
**Status:** In Progress | Complete | Action Required
**Auditor:** {name}

## Executive Summary
3-5 sentences: What was audited, key findings, recommendation.

## Audit Scope
What was examined, what was excluded, methodology used.

## Findings

### Finding 1: {Title}
**Severity:** Critical | High | Medium | Low | Info
**Status:** Open | Resolved | Accepted Risk

**Evidence:**
```
{code, logs, screenshots}
```

**Impact:** What happens if not addressed?

**Recommendation:** Specific fix.

### Finding 2: ...

## Summary Table
| ID | Finding | Severity | Status | Recommendation |
|----|---------|----------|--------|----------------|
| F1 | ...     | ...      | ...    | ...            |

## Recommendations (Prioritized)
1. **Immediate:** ...
2. **Short-term:** ...
3. **Long-term:** ...

QUALITY BAR:
- Findings are evidence-based (not opinions)
- Severity reflects actual impact
- Recommendations are actionable
- Summary table enables quick scanning
```

**Example:**
```
/doc-write audit docs/audits/security-audit.md --task "Audit the test API endpoints for security vulnerabilities including auth bypass, injection, and information disclosure"
```

---

### 5. Design Doc Writer (`/doc-write design`)

**cursor_dispatch prompt template:**

```
Write a technical design document.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {Feature} Design

**Author:** {name}
**Date:** YYYY-MM-DD
**Status:** Draft | Review | Approved | Implemented
**Reviewers:** {names}

## Overview
What is being designed? Why? 2-3 paragraphs.

## Goals and Non-Goals

### Goals
- Goal 1
- Goal 2

### Non-Goals (Explicit)
- What this design does NOT address

## Background
Context needed to understand the design.
Link to related ADRs, specs, tickets.

## Design

### Architecture
```
[ASCII diagram or description]
```

### Components
| Component | Responsibility | Interface |
|-----------|----------------|-----------|
| ...       | ...            | ...       |

### Data Flow
Step-by-step flow through the system.

### API Changes
New or modified APIs with examples.

### Data Model
Schema changes, new types.

## Alternatives Considered
Brief summary of rejected approaches.

## Security Considerations
Authentication, authorization, data protection.

## Testing Strategy
How will this be tested?

## Rollout Plan
Phased rollout, feature flags, rollback plan.

## Open Questions
Unresolved decisions needing input.

QUALITY BAR:
- Someone could implement from this doc
- Diagrams are included for complex flows
- Non-goals prevent scope creep
- Security is explicitly addressed
```

**Example:**
```
/doc-write design docs/02-design/motion-integrator.md --task "Design the 10Hz motion integrator including velocity-to-position integration, watchdog integration, and SDK interface"
```

---

### 6. User Story Writer (`/doc-write user-story`)

**cursor_dispatch prompt template:**

```
Write user stories for a feature.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {Feature} User Stories

## Epic Summary
Brief description of the feature from user perspective.

## User Personas
| Persona | Description | Goals |
|---------|-------------|-------|
| ...     | ...         | ...   |

## User Stories

### US-001: {Title}
**As a** {persona}
**I want** {capability}
**So that** {benefit}

**Acceptance Criteria:**
- Given {precondition}
- When {action}
- Then {expected result}

**Priority:** Must Have | Should Have | Could Have | Won't Have
**Effort:** S | M | L | XL

### US-002: ...

## Story Map
```
[Backbone activities]
    │
    ├── [Walking skeleton stories]
    │
    └── [Enhancement stories]
```

## Dependencies
Stories that must be completed first.

## Out of Scope
What is explicitly NOT included.

QUALITY BAR:
- Stories are independent (can be implemented separately)
- Stories are negotiable (not contracts)
- Stories are valuable (deliver user value)
- Stories are estimable (clear enough to size)
- Stories are small (completable in one sprint)
- Stories are testable (acceptance criteria are concrete)
```

**Example:**
```
/doc-write user-story docs/features/wake-word-stories.md --task "Write user stories for the wake word detection feature including happy path, error cases, and accessibility considerations"
```

---

### 7. RFC Writer (`/doc-write rfc`)

**Purpose:** RFCs (Request for Comments) capture iterative research and exploration that leads to technical decisions. Unlike ADRs which record a single decision, RFCs document the journey from question to recommendation.

**Lifecycle:** Draft → Discussion → Accepted/Rejected/Superseded

**cursor_dispatch prompt template:**

```
Write or update a Request for Comments document.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# RFC-NNN: {Title}

## Meta
| Field | Value |
|-------|-------|
| Status | Draft / Discussion / Accepted / Rejected / Superseded |
| Authors | {names} |
| Created | YYYY-MM-DD |
| Updated | YYYY-MM-DD |
| Related | ADR-XXXX (if accepted), TICKET-XXX |

## Summary
One paragraph: What problem? What solution direction?

## Motivation
Why does this matter? What use cases drive this?

## Research Log
### Session 1: [Date] - Initial Investigation
- What we explored
- Key findings
- Open questions

### Session 2: [Date] - [Focus Area]
- ...
(Add sessions as research progresses)

## Technical Analysis
### Option A: [Name]
- How it works
- Pros/Cons
- Feasibility: High/Medium/Low
- Effort estimate

### Option B: [Name]
- ...

### Option C: [Name] (if applicable)
- ...

## Recommendation
Which option and why. Include:
- Recommended approach
- Key tradeoffs accepted
- Migration path if applicable

## Implementation Path
High-level steps if accepted:
1. Step 1
2. Step 2
3. ...

## Open Questions
What still needs answering before this can be accepted?

## References
- Links to sources, issues, PRs, docs
- External documentation consulted

CONVENTIONS:
- Research Log is append-only (never delete sessions, add new ones)
- Each session should be timestamped
- Options should be mutually exclusive approaches
- Recommendation should reference specific option(s)
- Open Questions drive the next research session

QUALITY BAR:
- Problem is clearly stated
- Research is evidence-based (links, code snippets, test results)
- Options are fairly evaluated (no strawman alternatives)
- Recommendation is justified by the analysis
- Implementation path is actionable
```

**Example:**
```
/doc-write rfc docs/rfcs/RFC-001-tts-word-timing.md --task "Document research into TTS word-level timing for lip-sync, including Piper limitations and alternative approaches"
```

**Lifecycle Commands:**
```bash
# Start new research
/doc-write rfc docs/rfcs/RFC-002-topic.md --task "Initial investigation into..."

# Add research session
/doc-write rfc docs/rfcs/RFC-002-topic.md --task "Add Session 2: findings from testing X approach"

# Move to Discussion
/doc-write rfc docs/rfcs/RFC-002-topic.md --task "Update status to Discussion, finalize recommendation"

# Accept and link to implementation
/doc-write rfc docs/rfcs/RFC-002-topic.md --task "Mark Accepted, link to ADR-XXX and TICKET-YYY"
```

---

### 8. README Writer (`/doc-write readme`)

**Level-Aware Structure:**

**Level 1 (MVP):**
```markdown
# {Project Name}

{One sentence: what it does}

## Run It
```bash
{single command to run locally}
```

## Known Issues
- {limitation 1}
- {limitation 2}
```

**Level 2 (Lean Production):**
```markdown
# {Project Name}

{2-3 sentence description}

## Architecture
{Simple diagram or description}

## Setup
1. Install: `{command}`
2. Configure: `{command}`
3. Run: `{command}`

## Testing
```bash
{test command}
```

## API
{Link to OpenAPI spec or inline summary}

## Related
- [ADR-001: Key Decision](./docs/decisions/...)
```

**Level 3 (Enterprise):**
```markdown
# {Project Name} (v{version})

{Comprehensive description with scope}

## SLOs
- Availability: {target}
- Latency: p50 <{ms}, p99 <{ms}
- Error Rate: <{percentage}

## Architecture
{C4 diagram link or detailed description}

## Components
| Service | Language | Responsibility |
|---------|----------|----------------|

## Security Model
- Auth: {method}
- Encryption: {at-rest}, {in-transit}
- PII Handling: {approach}

## Quick Start
1. Clone + `make bootstrap`
2. Complete security training
3. Deploy to staging
4. Pair with on-call

## Compliance
- [Threat Model]({link})
- [Data Flow Map]({link})
- [Audit Reports]({link})
```

**Example:**
```
/doc-write readme README.md --task "Create project README for the payment processor service" --level 2
```

---

### 9. Runbook Writer (`/doc-write runbook`)

**Note:** FORBIDDEN at Level 1. Only available for Level 2+.

**cursor_dispatch prompt template:**

```
Write an operational runbook.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {Service} Runbook

**Last Updated:** YYYY-MM-DD
**On-Call Contact:** {team/channel}

## Service Overview
Brief description of what the service does.

## Health Checks
- **Endpoint:** `/health` or `/healthz`
- **Expected Response:** {example}
- **Dashboard:** {link}

## Common Operations

### Deploy
```bash
{deploy command}
```

### Rollback
```bash
{rollback command}
```

### Scale Up/Down
```bash
{scale command}
```

## Failure Modes

### {Failure Mode 1}: {e.g., Database Connection Lost}
**Symptoms:** {what you'll see}
**Impact:** {user-facing effect}
**Resolution:**
1. {step 1}
2. {step 2}

### {Failure Mode 2}: ...

## Incident Response (Level 3 only)
### Severity Levels
| Severity | Definition | Response Time |
|----------|------------|---------------|
| SEV1 | Service down | 15 min |
| SEV2 | Degraded | 1 hour |
| SEV3 | Minor issue | 24 hours |

### Escalation Path
1. On-call engineer
2. Team lead
3. Engineering manager

## Chaos Drill Results (Level 3 only)
| Scenario | Last Tested | Outcome |
|----------|-------------|---------|

QUALITY BAR:
- Someone unfamiliar with the service can handle incidents
- All failure modes have resolution steps
- Commands are copy-pasteable
```

**Example:**
```
/doc-write runbook docs/runbooks/payment-service.md --task "Create runbook for payment service including deploy, rollback, and database failure handling"
```

---

### 10. API Documentation Writer (`/doc-write api-doc`)

**Note:** FORBIDDEN at Level 1. Only available for Level 2+.

**cursor_dispatch prompt template:**

```
Write API documentation.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {API Name} API Documentation

**Version:** {semver}
**Base URL:** `{url}`
**Authentication:** {method}

## Overview
Brief description of API purpose and capabilities.

## Authentication
{Detailed auth instructions with examples}

## Endpoints

### {HTTP Method} {Path}
**Description:** {what it does}

**Request:**
```json
{example request body}
```

**Response:**
```json
{example response body}
```

**Error Codes:**
| Code | Meaning | Resolution |
|------|---------|------------|
| 400 | Bad Request | {fix} |
| 401 | Unauthorized | {fix} |

### {Next Endpoint}...

## Rate Limiting
{Limits and headers}

## Pagination (if applicable)
{Pagination pattern}

## Webhooks (if applicable)
{Webhook documentation}

## SDK Examples (Level 3)
### Python
```python
{example}
```

### JavaScript
```javascript
{example}
```

## Changelog
| Version | Date | Changes |
|---------|------|---------|

QUALITY BAR:
- Every endpoint has request/response examples
- All error codes documented
- Authentication is clear
- Rate limits documented
```

**Example:**
```
/doc-write api-doc docs/api/payment-api.md --task "Document the payment processing API including all CRUD endpoints and webhooks"
```

---

### 11. Compliance Documentation Writer (`/doc-write compliance`)

**Note:** Level 3 ONLY. Will refuse at Level 1 or 2.

**cursor_dispatch prompt template:**

```
Write compliance documentation.

FILE: {path}
TASK: {task}

REQUIRED STRUCTURE:
# {System} Compliance Documentation

**Last Audit:** YYYY-MM-DD
**Compliance Frameworks:** {e.g., SOC2, GDPR, PCI-DSS}
**Document Owner:** {role}

## Data Classification
| Data Type | Classification | Handling Requirements |
|-----------|---------------|----------------------|
| {type} | {PII/Sensitive/Public} | {requirements} |

## Data Flow Diagram
```mermaid
{data flow showing where data enters, processes, stores, exits}
```

## Security Controls

### Authentication & Authorization
- **Method:** {OAuth 2.0, mTLS, etc.}
- **Implementation:** {reference to code}
- **Audit Log:** {where auth events logged}

### Encryption
- **At Rest:** {algorithm, key management}
- **In Transit:** {TLS version, cert management}

### Access Control
| Role | Permissions | Audit |
|------|-------------|-------|

## Threat Model (STRIDE)
| Threat | Asset | Mitigation | Residual Risk |
|--------|-------|------------|---------------|
| Spoofing | {asset} | {control} | {risk level} |
| Tampering | ... | ... | ... |

## Audit Trail
### What is Logged
- {event type 1}
- {event type 2}

### Log Retention
- **Duration:** {period}
- **Storage:** {location}
- **Access:** {who can query}

### Export Procedures
{How to export logs for audit}

## Incident Response
{Link to incident response runbook}

## Compliance Checklist
- [ ] Data flow diagram current
- [ ] Threat model reviewed in last 6 months
- [ ] Audit logs queryable
- [ ] Access controls documented
- [ ] Encryption keys rotated per policy

QUALITY BAR:
- Auditor can verify compliance from this doc alone
- All data flows traced
- Security controls mapped to frameworks
- Audit trail is complete
```

**Example:**
```
/doc-write compliance docs/compliance/payment-system.md --task "Create compliance documentation for payment system covering PCI-DSS and GDPR requirements"
```

---

## Implementation

When `/doc-write` is invoked, Claude should:

### 1. Parse Command

```
/doc-write spec docs/specs/foo.md --task "..." [--level 2] [--model opus-4.5] [--no-review]
```

Extract: `type`, `path`, `task`, `level` (default: 2), `model` (default: by level), `no_review` flag

### 2. Select Model

```python
if user_specified_model:
    model = user_specified_model
elif level == 1:
    model = "sonnet-4.5"
elif level == 2:
    model = "auto"
elif level == 3:
    model = "opus-4.5"
```

### 3. Build Level-Aware Prompt

Append level-specific instructions to the base template:

```python
level_instructions = {
    1: """
LEVEL 1 (MVP/PROTOTYPE):
- Goal: Speed. Don't block the dev.
- Focus on structure, not polish
- Required sections must exist
- Examples can be placeholder stubs
- Skip version history details
- TONE: Informal, imperative ("Run X. It works.")
- FORBIDDEN: Architecture diagrams, OpenAPI specs, runbooks, compliance docs
""",
    2: """
LEVEL 2 (LEAN PRODUCTION):
- Goal: Stability. Must survive team turnover.
- All required sections complete
- All examples must be valid and working
- Consistent naming throughout
- Cross-references must be valid
- No TODO/TBD/FIXME markers
- TONE: Professional but practical
""",
    3: """
LEVEL 3 (ENTERPRISE/PLATFORM):
- Goal: Compliance, auditability, zero-knowledge onboarding.
- Every detail verified and accurate
- All cross-references validated
- Changelog entries complete and accurate
- No ambiguity - explicit is better than implicit
- SLOs/SLAs documented if applicable
- Security model explicitly addressed
- TONE: Formal, exhaustive (cite RFCs, standards)
"""
}

full_prompt = f"{template}\n\n{level_instructions[level]}\n\nFILE: {path}\nTASK: {task}"
```

### 4. Write Phase

```python
cursor_dispatch(
    task=full_prompt,
    mode="local",
    model=model,
    cwd="/Users/jflavigne/projects/reachy-workspace/reachy-mini"
)
```

### 5. Review Phase (unless `--no-review`)

```python
max_iterations = {1: 1, 2: 3, 3: 5}[level]
review_level = level

for iteration in range(1, max_iterations + 1):
    # Review at matching level
    review_result = cursor_agent_analyze_files(
        paths=[path],
        prompt=f"{review_prompt_for_type}\n\nREVIEW LEVEL: {review_level}",
        model="sonnet-4.5"  # Fast reviewer
    )

    # Parse verdict
    if "Verdict: APPROVED" in review_result:
        break

    if iteration == max_iterations:
        if level == 3:
            # Escalate to user
            return f"Max iterations reached. Issues remain:\n{issues}"
        else:
            # Present with warnings
            break

    # Extract issues and fix
    issues = extract_issues(review_result)
    cursor_dispatch(
        task=f"Fix the following issues in {path}:\n\n{issues}",
        mode="local",
        model=model,
        cwd="/Users/jflavigne/projects/reachy-workspace/reachy-mini"
    )
```

### 6. Present Result

```markdown
## Write Result: {filename}

**Level:** {level} ({level_name})
**Iterations:** {iteration}/{max_iterations}
**Verdict:** {verdict}

### Summary
- Sections: {sections_count}/{required_count} ✓
- Examples: {examples_count} validated ✓
- Cross-refs: {refs_count} validated ✓

### {Review Notes or Remaining Issues}
```

---

## Level-Specific Quality Bars

### Level 1: MVP/Prototype Quality Bar

- [ ] Required sections exist
- [ ] Basic markdown formatting correct
- [ ] No syntax errors in code blocks
- [ ] How to run locally is documented
- [ ] Known limitations listed

**Approval criteria:** "A dev can run this without asking questions"

### Level 2: Lean Production Quality Bar

- [ ] All Level 1 checks
- [ ] All required sections complete (not stubs)
- [ ] All examples are valid (JSON parses, code runs)
- [ ] Consistent naming conventions throughout
- [ ] Cross-references point to existing sections
- [ ] No TODO/TBD/FIXME markers
- [ ] Version/date/status fields present
- [ ] Architecture overview included
- [ ] Testing strategy documented

**Approval criteria:** "A new team member can onboard using only this doc"

### Level 3: Enterprise/Platform Quality Bar

- [ ] All Level 2 checks
- [ ] Every claim supported by example or reference
- [ ] All cross-references validated against target docs
- [ ] Changelog accurate and complete
- [ ] No ambiguous language ("may", "might", "sometimes")
- [ ] Explicit handling of edge cases
- [ ] Consistent with related documents
- [ ] SLOs/SLAs defined (if applicable)
- [ ] Security model documented
- [ ] Compliance artifacts complete
- [ ] External links verified working
- [ ] Onboarding path: zero-to-deploy in <30 min

**Approval criteria:** "Passes compliance audit and enables zero-knowledge onboarding"

---

## Anti-Patterns

**DO NOT:**
- Write documentation directly with Edit tool (delegate instead)
- Skip review for Level 2+ docs
- Use vague task descriptions ("update the doc")
- Ignore the doc-type structure requirements
- Present NEEDS_FIX docs to user without warning
- Exceed max iterations without escalating (Level 3)

**DO:**
- Provide specific, detailed task descriptions
- Include context the agent needs (related docs, constraints)
- Let the approval loop fix issues automatically
- Escalate to user when Level 3 can't be satisfied
- Use `--no-review` only for quick drafts you'll manually review
