# Examples and Reference

Sample inputs/outputs and format reference for system-workflow passes, patch format, judge output, and stable IDs.

## Pass 0: System Discovery

**Input:** Story texts (and optional reference documents or Figma file key).

**Output:** `SystemDiscoveryContext` with:
- `componentGraph` — components with stable IDs (e.g. `COMP-LOGIN-FORM`)
- `sharedContracts` — state models (`C-STATE-*`), events (`E-*`), data flows (`DF-*`)
- `productVocabulary` — technical term → product phrase
- Optional `plannedStories` (seeds + order) and `workContextSummary`

**Example (conceptual):**

```json
{
  "componentGraph": { "components": [{ "id": "COMP-LOGIN-FORM", "name": "Login Form" }] },
  "sharedContracts": {
    "stateModels": [{ "id": "C-STATE-USER-SESSION", "name": "User Session" }],
    "eventRegistry": [{ "id": "E-USER-AUTHENTICATED", "name": "user-authenticated" }],
    "dataFlows": []
  },
  "productVocabulary": { "auth": "sign-in" }
}
```

## Pass 1: Story Generation and Judge

**Input:** One story seed per run; shared `SystemDiscoveryContext` from Pass 0.

**Output:** Enhanced story (markdown and/or structure), plus `JudgeRubric` (Pass 1c).

**Example story seed:** `User logs in with email and password`

**Example judge result (excerpt):** See [Judge output format](#judge-output-format) below.

## Judge output format

The judge returns a `JudgeRubric` (see `src/shared/types.ts`). Shape:

- **sectionSeparation:** score 0–5, reasoning, optional violations (section, quote, suggestedRewrite)
- **correctnessVsSystemContext:** score 0–5, reasoning, optional hallucinations
- **testability:** outcomeAC and systemAC each with score 0–5 and reasoning
- **completeness:** score 0–5, reasoning, optional missingElements
- **overallScore:** 0–5
- **recommendation:** `approve` | `rewrite` | `manual-review`
- **newRelationships:** array of relationships (for refinement); optional **confidenceByRelationship**
- **needsSystemContextUpdate:** boolean

Rewrite (Pass 1b) is triggered when `overallScore < 3.5` (default threshold).

## Pass 2: Interconnection

**Input:** Per-story content + system context.

**Output:** `StoryInterconnections` — uiMapping (product term → component name/ID), contract dependencies (state, events, data flows), ownership, related stories.

**Example (excerpt):**

```json
{
  "uiMapping": { "login button": "Login Button (COMP-LOGIN-BUTTON)" },
  "contractDependencies": {
    "stateModels": ["C-STATE-USER-SESSION"],
    "events": ["E-USER-AUTHENTICATED"]
  }
}
```

## Pass 2b: Global Consistency

**Input:** All stories with interconnections + system context.

**Output:** `GlobalConsistencyReport`: `issues` (description, suggestedFixType, confidence, affectedStories) and `fixes` (FixPatch array: type, storyId, path, operation, item/match, confidence, reasoning).

**Example fix type:** `add-bidirectional-link`, `normalize-contract-id`, `normalize-term-to-vocabulary`.

---

## Patch-based advisor format

Iterations that use `outputFormat: 'patches'` return an **AdvisorOutput** with a **patches** array. Each patch is a **SectionPatch** (`src/shared/types.ts`):

- **op:** `add` | `replace` | `remove`
- **path:** A `PatchPath` (see below)
- **item:** Optional; required for add. Contains `id` and `text` (and optional fields per path).
- **match:** For replace/remove: `{ id?: string, textEquals?: string }`
- **metadata:** `{ advisorId: string, reasoning?: string }`

**Patch paths** (and ID prefixes when an ID is required):

| Path | ID prefix |
|------|-----------|
| `story.asA`, `story.iWant`, `story.soThat` | (none; story lines) |
| `userVisibleBehavior` | `UVB-` |
| `outcomeAcceptanceCriteria` | `AC-OUT-` |
| `systemAcceptanceCriteria` | `AC-SYS-` |
| `implementationNotes.stateOwnership` | `IMPL-STATE-` |
| `implementationNotes.dataFlow` | `IMPL-FLOW-` |
| `implementationNotes.apiContracts` | `IMPL-API-` |
| `implementationNotes.loadingStates` | `IMPL-LOAD-` |
| `implementationNotes.performanceNotes` | `IMPL-PERF-` |
| `implementationNotes.securityNotes` | `IMPL-SEC-` |
| `implementationNotes.telemetryNotes` | `IMPL-TEL-` |
| `uiMapping` | `UI-MAP-` |
| `openQuestions` | `QUESTION-` |
| `edgeCases` | `EDGE-` |
| `nonGoals` | `NON-GOAL-` |

Patches are validated by `patch-validator` (ID format, duplicates, bounds) then applied to `StoryStructure`; markdown is re-rendered from the structure.

## Stable ID conventions

**System context entities** (`src/agent/id-registry.ts`):

- **Components:** `COMP-` + normalized name (e.g. `COMP-LOGIN-BUTTON`)
- **State models:** `C-STATE-` + normalized name (e.g. `C-STATE-USER-PROFILE`)
- **Events:** `E-` + normalized name (e.g. `E-USER-AUTHENTICATED`)
- **Data flows:** `DF-` + normalized name (e.g. `DF-LOGIN-TO-DASHBOARD`)

**Normalization:** Uppercase → spaces/hyphens to underscores → strip non-alphanumeric (keep underscores) → collapse underscores → use hyphens in ID body. Collisions: same key gets suffix `_2`, `_3`, etc.

**Story section IDs:** Use the path-specific prefixes in the [Patch paths](#patch-based-advisor-format) table (e.g. `UVB-`, `AC-OUT-*`). Item IDs must be alphanumeric, underscore, or hyphen.
