
## 0) Inputs the system can use

- **Human inputs:** brief text, pasted tables (like your atomic inventory), constraints, priorities.
- **Visual inputs:**
  - Board overview (tiny, for map/coverage only)
  - Frame-level screenshots (read labels + structure)
  - Component close-ups (states, microcopy, affordances)
  - Layers/panel exports (names, variants, constraints, component instances)
  - Flow / prototype path screens (transitions, entry points)
  - Annotations (designer notes, redlines)
- **Docs:** component library, architecture notes, existing story drafts.

Rule of thumb: Overview = find targets. Close-ups = extract truth. Layers = disambiguate.

---

## 1) Intake (human context capture)

- **Vision:** ❌ none by default
- **Uses:** user brief, constraints, pasted tables, links list
- **Output:** Context Pack (goals, constraints, unknowns)

---

## 2) Asset Discovery (link triage)

- **Vision:** ✅ light (optional if the link is visual)
- **Goal:** decide what to screenshot and at what zoom
- **Asset strategy:**
  - If it's Figma: prefer frame list + page map (not the whole board image).
  - If it's docs: no vision; just parse text.
- **Output:** Asset Index: pages/frames/components available + "shot list" candidates

Decision it makes here: "Do I need overview shots, or can I jump straight to frames?"

---

## 3) Pass 0A — Visual Inventory (components only)

- **Vision:** ✅ yes, structured
- **Goal:** enumerate components/screens/states without interpretation
- **Asset strategy (progressive zoom):**
  1. Board/Page overview (ONLY to locate regions + count screens)
  2. Frame-level captures (each key screen, readable labels)
  3. Component close-ups (only for ambiguous items: icons, toggles, chips, field types)
  4. Optional: layers export when names/variants matter (e.g., "FilterSheet", "CardNews")
- **Output:** Component list + raw mentions + containment ("X contains Y")

Rule: never extract copy/state from a board overview. Overview is a map, not evidence.

---

## 4) Pass 0B — Behavior & Flow Sketch (story signals)

- **Vision:** ✅ yes, but targeted
- **Goal:** infer intents/flows based on UI structure
- **Asset strategy:**
  - Use frame-level screens for layout + affordances.
  - Pull prototype/flow frames if available (start nodes, overlays, transitions).
  - Use close-ups for triggers (e.g., "Apply filters", "Clear", "Show more +").
  - Use layers only if the UI implies something but you need proof (e.g., is that a link or button?)
- **Output:** candidate intents + events + rough flow map

---

## 5) Pass 0C — Canonicalization & Vocabulary

- **Vision:** ⚠️ optional
- **Goal:** naming consistency
- **Asset strategy:**
  - Prefer layers/panel names (component instance names, variant names).
  - Vision only if names are visible in the UI (labels, headings).
- **Output:** canonical names map + vocabulary map

---

## 6) Dependency Graph (atomic design build order)

- **Vision:** ❌ not required (mostly structural reasoning)
- **Uses:** your atomic inventory table + containment from Pass 0A
- **Asset strategy:** none unless containment is unclear → then request a frame-level proof
- **Output:** dependency edges + build order + parallel clusters

---

## 7) Advisor Routing Map (scope flags)

- **Vision:** ⚠️ minimal
- **Goal:** determine which specialist passes are needed later
- **Asset strategy:** mostly uses the component list; only consult images if a component's nature is unclear (e.g., is it a "form" or just "static content"?)
- **Output:** entity → advisors list

---

## 8) Story Seed Generation

- **Vision:** ❌ not necessary (uses outputs of earlier passes)
- **Output:** 1–N seed stories, scoped and bounded

---

## 9) React Developer Requirements Pass

- **Vision:** ⚠️ selective
- **Goal:** identify what a React dev needs: props, state, events, composition slots, data needs, states
- **Asset strategy:**
  - Mostly from canonical components + flows.
  - Use close-ups when:
    - you need exact labels of actions ("Apply", "Reset", "Back")
    - you need to confirm field types (select vs combobox vs input)
    - you need to see empty/loading/error visuals
  - Use layers when:
    - variants exist (Default/Hover/Disabled)
    - component instances matter (shared components)
- **Output:** Dev Requirements Pack per story

---

## 10) Advisor Augmentation Passes (AC/UVB)

- **Vision:** ✅ yes, per advisor and only what they need
- **Asset strategy by advisor type:**
  - Interactive-elements / validation: close-ups of inputs/buttons + any error states
  - Responsive-web: multiple breakpoint frames (mobile/tablet/desktop)
  - Responsive-native: platform-specific frames + permission modals if shown
  - Performance/loading: any skeleton/spinner/loading variants
  - Security/privacy: login/consent screens, sensitive flows, form submission patterns
  - Locale/language: language switcher + date/currency displays (if present)
- **Output:** patches in allowed paths

---

## 11) Consolidation & De-duplication

- **Vision:** ❌ none
- **Output:** merged coherent story + unified acceptance criteria

---

## 12) Pre-build Gate (ready-to-build)

- **Vision:** ❌ none
- **Output:** readiness + final build order + parallel plan

---

## How the agent decides "which visual asset to use"

Use a simple ladder:

1. **Map shot (overview)**  
   Use when you need: navigation of the file, coverage, counting screens.  
   Never use for: labels, field types, states.

2. **Frame shot (screen-level)**  
   Use when you need: structure, grouping, primary/secondary actions, layout sections.

3. **Component close-up**  
   Use when you need: exact control type, icon meaning, microcopy, state indicators.

4. **Variant/state sheet**  
   Use when you need: hover/focus/disabled/error/loading confirmation.

5. **Layers/Inspector export**  
   Use when you need: canonical names, variants, component instance identity, constraints.

---

## A practical "Shot List" template the agent can generate (no implementation, just process)

For each Figma page/frame:

- **Overview:** 1 image per page for map
- **Screens:** 1 per key frame
- **Close-ups:** only for ambiguous/critical components (inputs, filters, modals, nav triggers)
- **Variants:** only if shown
- **Layers evidence:** only when naming/variants are required for canonicalization

