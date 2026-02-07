# System-Workflow Mode

System-workflow is a multi-pass mode that discovers system structure, generates stories with quality judging and rewriting, adds interconnections, and runs global consistency checks. Use it when you have multiple story seeds or design artifacts and want a single run to produce a coherent set of stories with shared context.

## When to Use System-Workflow

| Mode | Use when |
|------|----------|
| **individual** | You want to run specific iterations on one story. |
| **workflow** | You have one story (or one batch) and want the full iteration pipeline (no discovery, no judge/rewrite, no Pass 2). |
| **interactive** | You want to choose which iterations run via a callback/UI. |
| **system-workflow** | You have multiple story seeds (or Figma/design input) and want: discovery → story generation with judge/rewrite → interconnection → global consistency. |

System-workflow requires `--product-type`. Pass story seeds as input (one per line or via file); optionally provide reference documents or Figma file key for Pass 0 discovery.

## Pipeline: Pass 0 → Pass 1 → Pass 2 → Pass 2b

```mermaid
flowchart LR
  P0[Pass 0 Discovery]
  P1[Pass 1 Generation]
  P2[Pass 2 Interconnection]
  P2b[Pass 2b Global Consistency]
  P0 --> P1 --> P2 --> P2b
```

### Pass 0: System Discovery

- **Purpose:** Extract components, state models, events, data flows, and product vocabulary from story texts and optional reference documents (or Figma).
- **Output:** `SystemDiscoveryContext` with a component graph, shared contracts, and stable IDs (minted by the ID registry). Optional: planned story seeds and work context summary.
- **Used by:** Pass 1 (story generation and judge/rewrite) and Pass 2.

### Pass 1: Story Generation with Refinement

- **Purpose:** For each story seed, run the iteration pipeline (expand seed into full story, apply iterations). Then run **Pass 1c** (judge) and, if score is below threshold, **Pass 1b** (rewrite). Optionally merge high-confidence relationships from the judge back into context and re-run Pass 1 until convergence.
- **Output:** One enhanced story (and optional structure) per seed; judge results; optional `needsManualReview` when quality stays low after rewrite.
- **Key behavior:** Judge uses a unified rubric (dimensions 0–5, recommendation, newRelationships). Rewrite is triggered when overall score &lt; 3.5 (configurable). Refinement loop merges relationships with confidence ≥ 0.75 and re-runs Pass 1.

### Pass 2: Interconnection

- **Purpose:** For each story, add UI mapping, contract dependencies, ownership, and related stories using the shared system context.
- **Output:** `StoryInterconnections` per story (uiMapping, contract dependencies, etc.).

### Pass 2b: Global Consistency

- **Purpose:** Compare all stories and system context; produce a consistency report and optional fix patches (e.g. add bidirectional links, normalize contract IDs, normalize terms to vocabulary).
- **Output:** `GlobalConsistencyReport` (issues + fix patches). Fixes can be applied to story structures; final markdown is re-rendered.

## Judge and Rewrite

- **Judge (Pass 1c):** Runs after story generation. Output is a `JudgeRubric`: dimensions (sectionSeparation, correctnessVsSystemContext, testability, completeness), overallScore 0–5, recommendation (`approve` | `rewrite` | `manual-review`), and optional `newRelationships` with confidence.
- **Rewrite (Pass 1b):** Triggered when overallScore &lt; threshold (default 3.5). Uses judge violations (e.g. section-separation) to rewrite the story; then Pass 1c runs again. If still below threshold, the story is marked for manual review.
- **Refinement:** If the judge returns high-confidence new relationships, they are merged into the system context and Pass 1 is re-run for all stories until no new high-confidence relationships or max rounds.

See [EXAMPLES](EXAMPLES.md#judge-output-format) for the full judge output shape and [Troubleshooting](troubleshooting.md#system-workflow-issues) for low scores and convergence.

## Patch-Based Story Representation

In system-workflow, stories can be represented as **story structure** (structured sections with stable IDs) plus **markdown**. Iterations that support `outputFormat: 'patches'` emit `SectionPatch` operations (add/replace/remove) that are validated and applied to the structure; markdown is then re-rendered. Global consistency fixes in Pass 2b also operate on structure. See [Patch-based advisor format](EXAMPLES.md#patch-based-advisor-format) and [Architecture](architecture.md#execution-modes) for details.

## Stable IDs

Components, state models, events, and data flows use stable IDs minted by the ID registry (e.g. `COMP-*`, `C-STATE-*`, `E-*`, `DF-*`). Story sections (e.g. user-visible behavior, acceptance criteria) use path-specific prefixes (e.g. `UVB-*`, `AC-OUT-*`). See [Stable ID conventions](EXAMPLES.md#stable-id-conventions).

## CLI

```bash
# Story seeds from stdin (one per line)
printf "User logs in\nUser sees dashboard" | \
  npm run agent -- --mode system-workflow --product-type web

# From file
npm run agent -- --mode system-workflow --product-type web --input seeds.txt

# With reference documents (Pass 0)
npm run agent -- --mode system-workflow --product-type web \
  --input seeds.txt --reference-docs doc1.md,doc2.md
```

## Related Docs

- [Architecture](architecture.md) — Modes and high-level data flow
- [EXAMPLES](EXAMPLES.md) — Examples per pass, patch format, stable IDs
- [Troubleshooting](troubleshooting.md) — Judge scores, patch rejections, convergence
