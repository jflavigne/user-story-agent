# USA-78: Pass 0 Story Planning and Work Context

## Summary

Extend Pass 0 (system discovery) so the agent can **derive a planned list of user stories** (with recommended writing order) from Figma/source structure and build a **work context string** describing what we're building. Pass this context to all subsequent steps so every pass knows "what we are working on."

## Goals

1. **Story planning from discovery** – When input is Figma (or discovery yields components/sections), derive an ordered list of story seeds (one per story-worthy entity) instead of requiring the caller to supply them.
2. **Recommended writing order** – Use the same approach as the Component Inventory analysis: bottom-up by abstraction (ATOM → MOL → ORG) or by dependency so later stories can reference earlier ones.
3. **Work context string** – A short, stable narrative (e.g. product name, main components, story order) passed to Pass 1, Pass 2, and Pass 2b so prompts stay aligned on scope.

## Current Behavior

- **Caller supplies stories** – `runSystemWorkflow(stories, referenceDocuments)` requires a non-empty `stories: string[]`. The vision benchmark hardcodes story seeds; there is no automatic "one story per component/section."
- **Pass 0 output** – Returns `SystemDiscoveryContext` (componentGraph, sharedContracts, productVocabulary, etc.). No planned stories or work summary.
- **Context in later passes** – Pass 1 uses `productContext` (from config) and `systemContext` (from Pass 0) via `ContextManager.buildContextPrompt()`; there is no single "what we're building" summary.

## Desired Behavior

- **Optional story planning** – When Figma is used (or when caller passes empty/minimal stories), Pass 0 can produce a **planned story list** (ordered seeds) from the design structure.
- **Work context string** – Pass 0 (or a small post-step) builds a **workContextSummary** (e.g. 2–4 sentences) from product context + discovery (component names, vocabulary) + planned order. This is stored in context and injected into prompts for Pass 1, Pass 2, Pass 2b.
- **Caller flexibility** – If caller provides explicit `stories`, keep current behavior (use them). If caller provides empty or a single "analyze this" story, use **plannedStories** from Pass 0 as the story list for Pass 1.

## Data Model Changes

### 1. Planned story (new type)

```ts
// src/shared/types.ts (or agent/types.ts)

export interface PlannedStory {
  /** One-line seed for Pass 1 (e.g. "User sees loading spinner while filter results update") */
  seed: string;
  /** 1-based recommended order (bottom-up: atoms first, then molecules, then organisms) */
  order: number;
  /** Optional component/section ID or canonical name this story is about */
  componentRef?: string;
  /** Optional level for ordering: 'atom' | 'molecule' | 'organism' | 'screen' */
  level?: string;
}
```

### 2. Extend SystemDiscoveryContext

```ts
// Add to SystemDiscoveryContext (src/shared/types.ts)

export interface SystemDiscoveryContext {
  // ... existing fields ...
  /** Ordered story seeds derived from discovery (when Figma/sections used) */
  plannedStories?: PlannedStory[];
  /** Short narrative: what we're building, main components, story order (for all passes) */
  workContextSummary?: string;
}
```

### 3. runSystemWorkflow signature (optional)

- Keep `runSystemWorkflow(stories: string[], referenceDocuments?: string[])`.
- **Semantics**: If `stories.length === 0` and Pass 0 returns `plannedStories`, use `plannedStories.map(p => p.seed)` (in order) as the story list for Pass 1. If caller provides stories, use them and optionally attach `plannedStories` / `workContextSummary` for context only.

## Story Planning Approach (same as manual analysis)

1. **Source of structure**
   - **Figma**: When `mockupImages` includes a Figma URL, after fetching file document (already done for sections fallback), parse **SECTION** nodes (and optionally top-level COMPONENT/FRAME) from the document. Each section has a name and optional description (child TEXT nodes).
   - **Non-Figma**: If only text/images are provided, the existing Pass 0 LLM output (canonicalNames, evidence) can be used to infer story-worthy entities; ordering may be heuristic (e.g. by mention order or a small LLM ask).

2. **Classify and order**
   - From section/component **names** (e.g. "ATOM - SpinnerLoading", "MOL - FilterItem", "ORG - FilterSheet"), infer level: ATOM → MOL → ORG (or screen). If no prefix, treat as organism/screen.
   - Sort by level (ATOM first, then MOL, then ORG), then by name within level. This yields the **recommended writing order**.

3. **Build story seeds**
   - One seed per section/component. Seed text can be: section description (if available), or a generated one-liner from the name (e.g. "User interacts with FilterBar" / "User sees loading spinner while the grid updates").

4. **Work context string**
   - Build a 2–4 sentence summary, e.g.:
     - "**Component Inventory System.** We are writing user stories for: mobile FilterSheet, desktop FilterBar, FilterGroup, FilterItem, and SpinnerLoading. Stories are ordered bottom-up: SpinnerLoading → FilterItem → FilterGroup → FilterSheet → FilterBar."
   - Include product name (from productContext) and main component names from discovery. Optionally append: "Work context: [workContextSummary]" in prompts.

## Where to Implement

### Option A: Programmatic (Figma-first)

- **Figma file structure** – Already available: `getFileData` in `runPass0Discovery` fetches document; today we only use it for `parseSectionsFromFileData` when Components API returns 0. Extend usage: always fetch document when Figma URL is present; parse SECTION nodes (and optionally top-level COMPONENT nodes) to get candidates.
- **New module** – e.g. `src/agent/story-planner.ts`: `planStoriesFromFigmaDocument(document, fileKey): PlannedStory[]` (parse sections, classify by name prefix, sort, generate seeds from name/description). `buildWorkContextSummary(productContext, plannedStories, componentGraph): string`.
- **Pass 0** – After building `SystemDiscoveryContext`, if Figma was used and we have document/sections: call story planner, set `context.plannedStories` and `context.workContextSummary`. If discovery had no Figma structure, leave plannedStories undefined; optionally derive a short workContextSummary from productContext + component names only.

### Option B: LLM-augmented Pass 0

- Extend **SystemDiscoveryMentions** (and system-discovery prompt) to ask the model to also output:
  - `plannedStories: { seed: string; order: number; componentRef?: string; level?: string }[]`
  - `workContextSummary: string` (2–4 sentences).
- Pros: works for non-Figma inputs (text + images). Cons: extra tokens, prompt complexity, ordering may be less deterministic.

### Option C: Hybrid (recommended)

- **Programmatic** when Figma is available: use Option A to compute `plannedStories` and `workContextSummary` from document sections + discovery component names.
- **Fallback** when no Figma: either leave plannedStories undefined and build workContextSummary from productContext + component names only, or add an optional short LLM call / extended prompt to suggest story seeds and order from discovery output.

## Context String Injection

- **SystemDiscoveryContext** carries `workContextSummary`.
- **ContextManager.buildContextPrompt()** – When `systemContext` is present and `systemContext.workContextSummary` is set, prepend (or append) it to the context prompt, e.g. "**What we're building:** {workContextSummary}\n\n" before the existing System Context section.
- **Pass 2 / Pass 2b** – When building prompts that include system context, include `workContextSummary` in the preamble so the model knows scope (e.g. in `buildStoryInterconnectionPrompt`, `judgeGlobalConsistency`).

## API and Caller Behavior

- **runSystemWorkflow(stories, referenceDocuments)**
  - If `stories.length > 0`: current behavior; Pass 0 still runs with these stories as input; add `plannedStories` / `workContextSummary` to context when available (from Figma structure).
  - If `stories.length === 0`: run Pass 0 with minimal input (e.g. productContext + mockupImages only; may need a single placeholder "Analyze the attached design" in user message). After Pass 0, if `plannedStories` exists, set `stories = plannedStories.map(p => p.seed)` in order and proceed to Pass 1. If no plannedStories, return early with a clear message ("Pass 0 did not produce story plan; provide story seeds or ensure Figma design is available").
- **Backward compatibility** – Existing callers that pass explicit stories are unchanged; they just get richer context (workContextSummary) when Pass 0 had Figma/sections.

## Implementation Tasks (checklist)

- [x] **Types** – Add `PlannedStory`; add `plannedStories` and `workContextSummary` to `SystemDiscoveryContext`. Schema updates for validation if needed.
- [x] **Figma document parsing** – Ensure document is fetched when Figma URL is present; extract SECTION (and optionally top-level COMPONENT) list with name + description (longest TEXT child).
- [x] **Story planner** – New `story-planner.ts`: classify by ATOM/MOL/ORG from name prefix; sort; generate seeds; build workContextSummary string.
- [x] **Pass 0 integration** – After building SystemDiscoveryContext, if Figma sections/components available, call planner and set plannedStories + workContextSummary. When no Figma, build workContextSummary from productContext + component names only (no plannedStories).
- [x] **Empty-stories flow** – In runSystemWorkflow, when stories.length === 0, allow Pass 0 to run with minimal input; after Pass 0, if plannedStories exists, use them as story list; else return early with helpful message.
- [x] **Context injection** – In ContextManager.buildContextPrompt, include workContextSummary when present. In Pass 2 / Pass 2b prompt builders, include workContextSummary in system context preamble.
- [x] **Tests** – Unit tests for story planner (ordering, seed generation); updated test for runSystemWorkflow with empty stories (early return with planMessage); context-manager test for workContextSummary.

## Out of Scope (for this ticket)

- Changing Pass 0 LLM output schema for plannedStories/workContextSummary (Option B) unless we adopt hybrid and add fallback LLM.
- Supporting non-Figma design tools (Figma-first is enough for the "same approach" as the Component Inventory analysis).

## References

- Manual analysis: Figma file `MHujefjiDpZQVpSQzE3pq1` (Test_Component-Inventory) → 5 sections → 5 stories in order: SpinnerLoading → FilterItem → FilterGroup → FilterSheet → FilterBar.
- Existing: `src/utils/figma-utils.ts` (`parseSectionsFromFileData`, `autoDetectFigmaComponents`, document fetch in agent); `src/agent/user-story-agent.ts` (`runPass0Discovery`, `runSystemWorkflow`); `src/agent/state/context-manager.ts` (`buildContextPrompt`).
