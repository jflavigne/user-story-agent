# Design Brief v1.2 — Multi-Pass Discovery → Story Backlog → React Build Plan (with Agent-Retrieved Visual Evidence + Vision/Image Constraints)

## 0) What we're building

A repeatable creative-to-build pipeline that starts from:

- One or many Figma links (plus optional references)
- Optional component inventory table (like the one you pasted)
- Optional free-form human instructions

…and produces:

1. A human-reviewable **Evidence Pack** (images + links + extracted vocabulary + component graph), then
2. A dependency-ordered backlog of Markdown user stories (1 story per component level by default), plus
3. Optional JSON patch outputs from specialist advisor passes (validation, accessibility, responsive, performance, security, locale, etc.) appended after the base story exists.

**Primary target use case:** user stories that directly enable React component implementation.

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
  - **Confirmed** (visible in frame/close-up/layers)
  - **Inferred** (reasonable but not explicit)
  - **Unknown** (needs more evidence)

## 2) Inputs the agent must accept

### 2.1 Required

- User prompt (goal + constraints)
- Figma URLs (one or many)

### 2.2 Optional (recommended)

- Component inventory table (your table is considered "ideal input")
- Any supporting docs (component library notes, architecture constraints, etc.)

### 2.3 Optional (minimal user effort)

- 0–2 screenshots max from the user only if needed to unblock access (see "Asset Retrieval Policy" below).

**Default expectation:** the user does NOT export a pile of screenshots.

## 3) Asset Retrieval Policy (agent-retrieved evidence)

### 3.1 Default expectation: the agent retrieves visual evidence

If the user provides Figma links (and especially a component inventory table with node links), assume:

- The agent can open linked node(s) and retrieve frame renders (PNG/JPEG) itself, and
- The user should not have to export everything manually.

### 3.2 What "agent retrieves" means (implementation-agnostic)

The brief does not mandate a specific integration, but the pipeline assumes one is available:

- **Figma API-based export** (preferred): render nodeId frames to PNG/JPEG
- Figma file access via tool/connector
- **Fallback:** user provides minimum screenshot(s) when automated retrieval fails

### 3.3 Failure mode (when retrieval isn't possible)

If the agent cannot access Figma content (permissions, missing token, blocked connector), it must:

- Request the smallest possible asset set to proceed:
  1. One screenshot of the relevant frame(s), or
  2. One component/variant sheet export
- Record the limitation in the Evidence Pack:
  - "Access constraint: no Figma render access"

### 3.4 Table-driven targeting (authoritative)

When a component inventory table includes specific Figma node links, the agent must:

- Treat those links as the authoritative starting point for evidence
- Fetch only the images needed for the current pass (not the whole file)
- Attach evidence per component story (tight, reviewable, auditable)

## 4) Vision & Image Constraints (critical operating rules)

This pipeline depends on vision models. Vision reliability is constrained by readability and payload limits. The agent must actively manage image selection, cropping, and batching.

### 4.1 Readability gate (non-negotiable)

Before using an image as evidence for labels/control types/states:

- If a human cannot read the smallest relevant text at 100% zoom, the model likely can't either.
- If unreadable: do not infer; instead retrieve a tighter crop, a frame render, a close-up, or a layers/inspector export.

### 4.2 Payload budgeting (vendor-agnostic)

The agent must obey the active provider's constraints. Since limits vary, the policy is:

- Prefer multiple small, readable images over one huge board image.
- Batch assets into multiple requests if needed.
- Keep images compressed (PNG/JPEG as appropriate) and avoid oversized exports.

### 4.3 Large board policy (avoid "board postcards")

For large Figma boards:

- A full-board export is allowed only as a **map shot** (coverage/navigation).
- Extraction must be done from:
  - frame-level renders, or
  - region crops / tiles, or
  - close-ups, or
  - layers/inspector exports.
- **Never** extract microcopy, control type, validation states, or "is that a button?" from a map shot.

### 4.4 Image batching strategy (parallel-friendly)

The agent should structure retrieval + analysis into small batches:

- Batch by page, flow, or component family
- Batch by dependency cluster (atoms first, then molecules, etc.)
- Keep each batch small enough to remain readable and within payload budgets

## 5) Outputs (human-reviewable package)

The pipeline produces an **Evidence Pack** and a **Story Pack**.

### 5.1 Evidence Pack

A single Markdown index that links everything together.

`/evidence/INDEX.md` includes:

- Project context (user prompt summary)
- Source links (Figma URLs + table reference)
- Asset registry (images + what they show)
- Extracted vocabulary (raw mentions + canonical names)
- Component graph (containment + event coordination)
- Open questions / unknowns (what the agent needs next)

### 5.2 Asset registry rules (critical)

Each asset gets:

- **assetId:** A-001, A-002…
- **type:** map, frame, closeup, overlay-open, layers, variant, tile
- **purpose:** "Confirms FilterSheet contents"
- **source:** Figma link (ideally node link)
- **imageRef:** local PNG filename or a remote render reference
- **confidence:** Confirmed / Inferred / Unknown
- **readability:** Readable / Not readable (and if not readable, it should not be used for extraction)

Example entry (in markdown):

- **A-014** (overlay-open) — FilterSheet open with active counts  
  Source: Figma node link  
  Image: `evidence/A-014.png`  
  Confirms: FilterGroup, FilterItem, Apply/Reset triggers, spinner placeholder  
  Confidence: Confirmed  
  Readability: Readable

### 5.3 Story Pack

`/stories/` contains:

- `BACKLOG.md` (ordered list by dependency + parallel batches)
- One story file per component: `STORY-<ComponentName>.md`

Each story file must include:

- Links to relevant assetIds and Figma nodes
- A mini "Evidence" section mapping claims → assets

### 5.4 Optional Advisor Patches

`/patches/` contains JSON outputs from advisor passes:

- `patch-validation.json`, `patch-accessibility.json`, etc.

These are generated after base stories exist, and are appended to acceptance criteria or system criteria depending on the advisor.

## 6) Multi-pass process (smallest viable steps, parallel-friendly)

This refactors "analysis" into many small tasks.

### Pass A — Intake & Constraints (no vision)

**Goal:** normalize inputs.

- Capture: user intent, constraints, target platform (web), "design system" assumption
- Register sources: Figma links, table artifact, any notes

**Output:** `evidence/INDEX.md` skeleton + source list

### Pass B — Evidence Targeting Plan (table-first)

**Goal:** decide what to retrieve from Figma (not what to infer).

- Parse the table: component names, levels, dependencies, node links
- Create an evidence retrieval queue: "for each component, fetch 1–3 assets max (plus tiles only if frames aren't available)"
- Define batching plan: which components/pages are grouped per request

**Output:** an "Evidence Retrieval Plan" section in `evidence/INDEX.md`

### Pass C — Visual Retrieval (agent-driven, constraint-aware)

**Goal:** retrieve only what's needed, and ensure it's readable for extraction.

**Visual preflight** (must happen before extraction):

- Decide whether the component can be captured as:
  - a frame render (preferred)
  - an overlay-open render
  - a close-up crop
  - a variant sheet
  - a layers/inspector export
  - or (fallback) tiled board regions
- Apply readability gate:
  - if the export is not readable, replace it with a tighter crop/close-up/tile

Default retrieval set per component (stop early if sufficient):

1. Primary frame/variant (must-have)
2. Overlay-open (if component triggers overlay or lives inside one)
3. Layers snippet (only when naming/variant mapping is unclear)

**Fallback** if frames aren't accessible: tiles/crops until readable.

**Output:** asset registry populated + local references  
**Failure handling:** if retrieval fails, request minimal screenshots and log the limitation.

### Pass D — Component Inventory Extraction (vision + table-aware)

**Goal:** list all components visible/referenced and reconcile with the table.

- Extract raw mentions (labels, visible names, any exposed identifiers)
- Map to canonical names
- Flag discrepancies (table vs evidence)

**Output:**

- `mentions.components[]`
- `canonicalNames` mapping (components)
- evidence per canonical component

### Pass E — States & Interactions Sweep (vision, focused)

**Goal:** identify states shown or evidenced:

- default / hover / focus / disabled / error / loading / empty / success
- overlays (modal/drawer/sheet), open/closed

**Evidence rule:** only claim a state if it is confirmed in a readable asset (or mark as inferred/unknown).

**Output:** state inventory per component + evidence links

### Pass F — Relationships & Dependency Graph (mostly non-vision)

**Goal:** composition + build order (atomic design).

- Composition: "X contains Y"
- Dependency: "X requires Y"
- Identify parallelization batches (independent clusters)

**Output:** `BACKLOG.md` ordered list + parallel batches

### Pass G — Seed Story Drafting (no advisors yet)

**Goal:** write the first coherent story set.

**Default rule:**

- 1 story per component level (Atom/Molecule/Organism), unless explicitly trivial (rare)

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

Selective vision use in this pass (only when it removes ambiguity):

- confirm exact action labels ("Apply", "Reset", "Back")
- confirm field types (select vs combobox vs input)
- confirm empty/loading/error visuals
- confirm variant/state existence when uncertain

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

**Rule:** advisors add what is evidenced OR baseline-required by your standards.

**Output:** optional JSON patch files + story updates (append-only)

## 7) Vision usage policy (when to "look" and what to retrieve)

The system uses vision only when it reduces uncertainty.

### 7.1 Vision triggers

Use vision when:

- UI structure/containment matters
- interaction affordances are ambiguous (button vs link, icon-only, etc.)
- state evidence matters (loading/error/disabled)
- table vs design conflicts exist
- microcopy is required to define acceptance criteria

### 7.2 Retrieval ladder (kept small, now includes tiles)

For each component, choose the smallest asset that answers the question:

1. **Map shot** (overview)  
   Use for: navigation of the file, coverage, counting screens  
   Never use for: labels, field types, states

2. **Frame shot** (screen-level)  
   Use for: structure, grouping, primary/secondary actions, layout sections

3. **Component close-up**  
   Use for: exact control type, icon meaning, microcopy, state indicators

4. **Variant/state sheet**  
   Use for: hover/focus/disabled/error/loading confirmation

5. **Layers/Inspector export**  
   Use for: canonical names, variants, component instance identity, constraints

6. **Board tiling / region crops** (only when frames aren't available)  
   Use for: extracting readable regions from a large board when direct frame renders aren't accessible  
   **Rule:** tile until readable; never infer from tiny tiles

## 8) Story format (Markdown template)

Each story file must be readable and auditable.

### Header

- **Component:** CardWork (canonical)
- **Level:** Atom/Molecule/Organism
- **Depends on:** list
- **Evidence:** assetIds + Figma node links

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
- each claim tagged: Confirmed / Inferred / Unknown

## 9) How your component table is used (with Figma)

Yes—this system is designed to work with your table.

The table acts as:

- canonical naming hints + atomic levels
- dependency hints / build-order scaffolding
- evidence targeting map (node links)

**Conflict rule:** If Figma evidence contradicts the table, the agent logs:

- "Table says X; design shows Y" + assetIds + proposed resolution.

## 10) Review workflow (human-in-the-loop)

A reviewer should be able to:

- open `evidence/INDEX.md`
- click Figma links + view referenced PNGs
- scan `BACKLOG.md` for build order sanity
- open a story and see exactly which assets justify it

## 11) What the coding agent is optimizing for

- Evidence-backed correctness
- Minimal assumptions (explicitly tagged)
- Dependency-correct build order
- Stories that translate directly to React components and tests
