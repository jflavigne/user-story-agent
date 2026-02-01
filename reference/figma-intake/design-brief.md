# Design Brief v1.1 — Multi-Pass Discovery → Story Backlog → React Build Plan (with Agent-Retrieved Visual Evidence)

## 0) What we're building

A repeatable creative-to-build pipeline that starts from:

- one or many Figma links (plus optional references),
- optional component inventory table (like the one you pasted),
- optional free-form human instructions,

…and produces:

1. a human-reviewable Evidence Pack (images + links + extracted vocabulary + component graph), then
2. a dependency-ordered backlog of Markdown user stories (1 story per component level by default), plus
3. optional JSON patch outputs from specialist advisor passes (validation, accessibility, responsive, performance, security, etc.) appended after the base story exists.

Primary target use case: user stories that directly enable React component implementation.


## 1) Success definition

The pipeline is successful when:

- A human can review each story side-by-side with visual evidence (Figma links + referenced PNGs).
- Stories are ordered by dependency (atomic design primitives first).
- Each story contains the minimum React dev requirements needed to implement without guessing:
  - component API (props, events, slots)
  - state model (controlled/uncontrolled expectations)
  - interaction states
  - acceptance criteria (base + appended advisor criteria)
- The system avoids confident nonsense by tagging claims as:
  - Confirmed (visible in frame/layers)
  - Inferred (reasonable but not explicit)
  - Unknown (needs more evidence)


## 2) Inputs the agent must accept

### 2.1 Required

- User prompt (goal + constraints)
- Figma URLs (one or many)

### 2.2 Optional (recommended)

- Component inventory table (your table is considered "ideal input")
- Any supporting docs (component library notes, architecture constraints, etc.)

### 2.3 Optional (minimal user effort)

- 0–2 screenshots max from the user only if needed to unblock access (see "Asset Retrieval Policy" below).

The default expectation is NOT that the user exports a pile of screenshots.

## 3) Asset Retrieval Policy (the key add-on)

### 3.1 Default expectation: the agent retrieves visual evidence

If the user provides Figma links (and especially a component inventory table with node links), the system should assume:

- the agent can open the linked node(s) and retrieve frame renders (PNG/JPEG) itself, and
- the user should not have to export everything manually.

### 3.2 What "agent retrieves" means (implementation-agnostic)

The brief does not mandate a specific integration, but the pipeline assumes one of these is available:

- Figma API-based export (preferred): render nodeId frames to PNG/JPEG.
- Figma file access via tool/connector (if your environment supports it).
- Fallback: the user provides only the minimum screenshot(s) needed when automated retrieval fails.

### 3.3 Failure mode (when retrieval isn't possible)

If the agent cannot access Figma content (permissions, missing token, blocked connector), it must:

- request the smallest possible set of assets to proceed:
  1. a single screenshot of the relevant frame(s), or
  2. a single "component sheet" export,
- and record the limitation in the Evidence Pack ("Access constraint: no Figma render access").

### 3.4 Table-driven targeting (important)

When a component inventory table includes specific Figma node links, the agent must:

- treat those links as the authoritative starting point for evidence,
- fetch only the images needed for the current pass (not the whole file),
- attach evidence per component story (tight and reviewable).

## 4) Outputs (human-reviewable package)

The pipeline produces an Evidence Pack and a Story Pack.

### 4.1 Evidence Pack

A single Markdown index that links everything together.

`/evidence/INDEX.md` includes:

- Project context (user prompt summary)
- Source links (Figma URLs + table reference)
- Asset registry (images + what they show)
- Extracted vocabulary (raw mentions + canonical names)
- Component graph (containment + event coordination)
- Open questions / unknowns (what the agent needs next)

### 4.2 Asset registry rules (critical)

Each asset gets:

- assetId: A-001, A-002…
- type: frame, closeup, overlay-open, layers, variant
- purpose: "Confirms FilterSheet contents"
- source: Figma link (ideally node link)
- imageRef: local PNG filename or a remote render reference
- confidence: Confirmed / Inferred / Unknown

Example entry (in markdown):

```markdown
- A-014 (overlay-open) — FilterSheet open with active counts
  Source: Figma node link
  Image: evidence/A-014.png
  Confirms: FilterGroup, FilterItem, Apply/Reset triggers, spinner placeholder
```

### 4.3 Story Pack

`/stories/` contains:

- `BACKLOG.md` (ordered list by dependency + parallel batches)
- One story file per component: `STORY-<ComponentName>.md`

Each story file must include:

- links to relevant assetIds and Figma nodes
- a mini "Evidence" section mapping claims → assets

### 4.4 Optional Advisor Patches

`/patches/` contains JSON outputs from advisor passes:

- `patch-validation.json`, `patch-accessibility.json`, etc.

These are generated after base stories exist, and are appended to acceptance criteria or system criteria depending on the advisor.


## 5) Multi-pass process (smallest viable steps, parallel-friendly)

This refactors "analysis" into many small tasks.

### Pass A — Intake & Constraints (no vision)

**Goal:** normalize inputs.

- Capture: user intent, constraints, target platform (web), "design system" assumption
- Register sources: Figma links, table artifact, any notes

**Output:** `evidence/INDEX.md` skeleton + source list


### Pass B — Evidence Targeting Plan (table-first)

**Goal:** decide what to retrieve from Figma (not what to infer).

- Parse the table: component names, dependencies, node links
- Create an evidence retrieval queue: "for each component, fetch 1–3 assets max"

**Output:** an "Evidence Retrieval Plan" section in `evidence/INDEX.md`

### Pass C — Visual Retrieval (agent-driven)

**Goal:** retrieve only what's needed.

- Use table node links to export:
  - the component frame/variant
  - the overlay-open state (if relevant)
  - a layers snippet only when naming/variant mapping matters

**Output:** Asset registry populated + local references

(Fallback rule: if retrieval fails, request minimal screenshots and log the limitation.)

### Pass D — Component Inventory Extraction (vision + table-aware)

**Goal:** list all components visible/referenced and reconcile with the table.

- Extract raw mentions (labels, layer names, component names)
- Map to canonical names
- Flag discrepancies (table vs evidence)

**Output:**

- `mentions.components[]`
- `canonicalNames` mapping (components)
- evidence per canonical component

### Pass E — States & Interactions Sweep (vision, focused)

**Goal:** identify states shown or implied:

- default / hover / focus / disabled / error / loading / empty / success
- overlays (modal/drawer/sheet), open/closed

**Output:** state inventory per component + evidence links

### Pass F — Relationships & Dependency Graph (mostly non-vision)

**Goal:** composition + build order (atomic design).

- Composition: "X contains Y"
- Dependency: "X requires Y"
- Identify parallelization batches

**Output:** `BACKLOG.md` ordered list + parallel batches

### Pass G — Seed Story Drafting (no advisors yet)

**Goal:** write the first coherent story set.

**Default rule:**

- 1 story per component level (Atom/Molecule/Organism), unless explicitly trivial per your rules (rare).

**Output:** first iteration of `STORY-*.md`

### Pass H — React Developer Requirements Pass (explicit dev needs)

**Goal:** ensure each story includes what a React dev needs without reverse-engineering.

For each component story, require:

- Purpose
- API draft: props, events, slots/children
- State model: controlled/uncontrolled; transitions
- Variants: only what's evidenced
- Interaction model: keyboard/touch where relevant
- Integration notes: dependencies and composition
- Testable acceptance criteria (base)

**Output:** updated story files + backlog adjustments if new dependencies appear


### Pass I — Advisor Augmentation (default timing: after base story exists)

**Goal:** append specialized acceptance criteria and notes.

**Default ordering:**

1. validation
2. accessibility
3. responsive-web / responsive-native (as applicable)
4. performance/loading
5. security
6. locale/language (only if relevant artifacts exist)

**Rule:**

- advisors add what is evidenced OR baseline-required by your standards.

**Output:** optional JSON patch files + story updates (append-only)

## 6) Vision usage policy (when to "look" and what to retrieve)

The system uses vision only when it reduces uncertainty.

### Vision triggers

Use vision when:

- UI structure/containment matters
- interaction affordances are ambiguous (button vs link, icon-only, etc.)
- state evidence matters (loading/error/disabled)
- table vs design conflicts

### Retrieval ladder (kept small)

For each component, retrieve:

1. primary frame/variant (must-have)
2. overlay-open (if component triggers overlay or lives inside one)
3. layers snippet (only when naming/variant mapping is unclear)

Stop when additional images don't materially increase confidence.

## 7) Story format (Markdown template)

Each story file must be readable and auditable.

### Header

- Component: CardWork (canonical)
- Level: Atom/Molecule/Organism
- Depends on: list
- Evidence: assetIds + Figma node links

### 1) Intent

- As a…
- I want…
- So that…

### 2) Scope

- Included
- Excluded (explicit non-goals)

### 3) Behavior

- user-visible behaviors (functional, no pixel/color specs)

### 4) States

- default, hover/focus (if evidenced), disabled, loading, empty, error, success

### 5) React Dev Requirements

- API draft (props/events/slots)
- State ownership and transitions
- Data shape assumptions (even if mocked)

### 6) Acceptance Criteria

- Base outcome ACs
- Base system ACs (only if needed)
- Advisor-appended ACs (clearly labeled as appended)

### 7) Evidence Notes

- bullet list mapping claims → assetIds

## 8) How your component table is used (with Figma)

Yes—this system is designed to work with your table.

The table acts as:

- canonical naming hints + atomic levels
- dependency hints / build-order scaffolding
- evidence targeting map (node links)

**Conflict rule:**

- If Figma evidence contradicts the table, the agent logs:
  - "Table says X; design shows Y" + assetIds + proposed resolution.

## 9) Review workflow (human-in-the-loop)

A reviewer should be able to:

- open `evidence/INDEX.md`
- click Figma links + view referenced PNGs
- scan `BACKLOG.md` for build order sanity
- open a story and see exactly which assets justify it

## 10) What the coding agent is optimizing for

- Evidence-backed correctness
- Minimal assumptions (explicitly tagged)
- Dependency-correct build order
- Stories that translate directly to React components and tests