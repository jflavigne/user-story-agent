# Figma Intake Process

## Inputs the system can use

- **Human inputs:** brief text, pasted tables (like your atomic inventory), constraints, priorities, draft stories, "do/don't" lists.
- **Visual inputs:**
  - Board/Page overview (tiny, for map/coverage only)
  - Frame-level screenshots (read labels + structure)
  - Component close-ups (states, microcopy, affordances)
  - Variant/state strips (default/hover/focus/disabled/error/loading)
  - Layers/inspector exports (names, variants, constraints, component instances)
  - Prototype/flow path screens (transitions, entry points)
  - Annotations (designer notes, redlines)
- **Docs:** component library, architecture notes, existing story drafts.

> Rule of thumb: Overview = find targets. Close-ups = extract truth. Layers = disambiguate.

---

## Vision Constraints Policy (cloud models)

**Why this matters:** giant boards become unreadable + expensive + sometimes rejected.

- **Hard limits to respect**
  - Keep total request payload under provider limits (example: Claude docs cite 32 MB per request and reject images above 8000×8000).
  - Cost/latency scales with pixels
  - Prefer cropping over downscaling. Downscaling makes text illegible; cropping preserves evidence.
- **Legibility rule (non-negotiable)**
  - Never use an image where key UI text is unreadable at 100% zoom for decisions that depend on labels, states, or field types.
- **Sizing targets (practical defaults)**
  - Close-ups: ~1200–1600 px on the long side (best "readable + efficient" zone for most UIs).
  - Screen/frame shots: ~1600–2400 px long side if you need both layout + readable labels.
  - Overviews: small on purpose; treat as a map, not evidence.
- **Detail control (if available)**
  - Use low detail for overviews/map shots; high detail only for close-ups where microcopy/state matters.

---

## 1) Intake (human context capture)

- **Vision:** ❌ none by default
- **Uses:** user brief, constraints, pasted tables, links list, existing stories (if provided)
- **Output:** updated Context Pack (goals, constraints, assumptions, unknowns, "definition of done")

---

## 2) Asset Discovery (link triage + shot planning)

- **Vision:** ✅ light (optional)
- **Goal:** decide what visual evidence is needed, at what zoom, and in what order
- **Asset strategy**
  - If Figma: prefer page/frame list + targeted frame exports, not "whole board" exports.
  - If docs: no vision; parse text.
- **New output:** Asset Index + Shot Plan
- **What to capture:** (overview vs frames vs close-ups vs variants vs layers)
- **Intended purpose per shot:** (map vs evidence)
- **"Legibility check" requirement per shot:** (labels/states must be readable where relevant)

> Decision it makes here: "Do I need overview shots for navigation, or can I jump straight to frames + close-ups?"

---

## 3) Pass 0A — Visual Inventory (components only)

- **Vision:** ✅ yes, structured
- **Goal:** enumerate components/screens/states without interpretation
- **Asset strategy (progressive zoom)**
  1. Page overview (ONLY to locate regions + count screens)
  2. Frame-level captures (each key screen; labels must be readable if used as evidence)
  3. Close-ups (only for ambiguous items: icons, toggles, chips, field types, microcopy)
  4. Optional layers/inspector when names/variants/instances matter ("FilterSheet", "CardNews", etc.)
- **Output:** Component list + raw mentions + containment ("X contains Y")

> Rule: never extract copy/state from a board overview. Overview is a map, not evidence.

---

## 4) Pass 0B — Behavior & Flow Sketch (story signals)

- **Vision:** ✅ yes, targeted
- **Goal:** infer intents/flows based on UI structure + affordances
- **Asset strategy**
  - Frame-level screens for layout + affordances.
  - Prototype/flow frames if available (entry points, overlays, transitions).
  - Close-ups for triggers ("Apply", "Clear", "Show more +").
  - Layers only if you need proof (is that a link or a button? is it a select or a combobox?)
- **Output:** candidate intents + events + rough flow map

---

## 5) Pass 0C — Canonicalization & Vocabulary

- **Vision:** ⚠️ optional
- **Goal:** naming consistency across outputs
- **Asset strategy**
  - Prefer layers/inspector names (component instance names, variant names).
  - Vision only if names are visibly present in UI labels/headings.
- **Output:** canonical names map + vocabulary map

---

## 6) Dependency Graph (atomic design build order)

- **Vision:** ❌ not required (mostly structural reasoning)
- **Uses:** atomic inventory table + containment from Pass 0A + canonical names from Pass 0C
- **Asset strategy:** none unless containment is unclear → then request a frame-level proof
- **Output:** dependency edges + build order + parallel clusters

---

## 7) Advisor Routing Map (scope flags)

- **Vision:** ⚠️ minimal
- **Goal:** determine which specialist passes are needed later
- **Asset strategy:** mostly uses the component list; consult images only if a component's nature is unclear (form vs static content, interactive vs decorative)
- **Output:** entity → advisors list

---

## 8) Story Seed Generation

- **Vision:** ❌ not necessary (uses outputs of earlier passes)
- **Output:** 1–N seed stories, scoped and bounded

---

## 9) React Developer Requirements Pass

- **Vision:** ⚠️ selective
- **Goal:** identify what a React dev needs: props, state, events, composition slots, data needs, states
- **Asset strategy**
  - Mostly from canonical components + flow map.
  - Use close-ups when:
    - exact action labels matter ("Apply", "Reset", "Back")
    - field type must be confirmed (select vs combobox vs input)
    - empty/loading/error visuals appear (or are implied)
  - Use layers/inspector when:
    - variants exist (Default/Hover/Disabled/Error/Loading)
    - component instances matter (shared components, nested instances)
- **Output:** Dev Requirements Pack per story

---

## 10) Advisor Augmentation Passes (AC/UVB)

- **Vision:** ✅ yes, per advisor and only what they need
- **Asset strategy by advisor type**
  - **Interactive-elements / validation:** close-ups of inputs/buttons + error/success states
  - **Responsive-web:** matched frames across breakpoints (mobile/tablet/desktop)
  - **Responsive-native:** platform-specific frames + permission modals if shown
  - **Performance/loading:** skeleton/spinner/loading variants + long operation flows if shown
  - **Security/privacy:** login/consent screens, sensitive flows, form submission patterns
  - **Locale/language:** language switcher + date/currency displays (if present)
- **Output:** patches in allowed paths

---

## 11) Consolidation & De-duplication

- **Vision:** ❌ none
- **Output:** merged coherent stories + unified acceptance criteria

---

## 12) Pre-build Gate (ready-to-build)

- **Vision:** ❌ none
- **Output:** readiness + final build order + parallel plan

---

## How the agent decides "which visual asset to use"

Use a simple ladder (and never skip legibility):

1. **Map shot (overview)**  
   Use for: navigation of file, coverage, counting screens.  
   Never for: labels, field types, states.

2. **Frame shot (screen-level)**  
   Use for: structure, grouping, primary/secondary actions, layout sections.

3. **Component close-up**  
   Use for: exact control type, icon meaning, microcopy, state indicators.

4. **Variant/state strip**  
   Use for: hover/focus/disabled/error/loading confirmation.

5. **Layers/Inspector export**  
   Use for: canonical names, variants, component instance identity, constraints.

---

## A practical "Shot List" template the agent can generate (process-only)

For each Figma page/frame:

- **Overview:** 1 image per page for map (low detail)
- **Screens:** 1 per key frame (readable labels if used as evidence)
- **Close-ups:** only for ambiguous/critical components (inputs, filters, modals, nav triggers)
- **Variants:** only if states are shown or required for build
- **Layers evidence:** only when naming/variants/instances are required for canonicalization

> Quality gate per shot: "Can I read what I'm about to claim?" If not, recrop/zoom and replace the asset.
