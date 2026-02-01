# USA-79: Iteration prompt loader (markdown + frontmatter)

## Goal

Add a **prompt loader** that loads iteration prompts from markdown files with YAML frontmatter, and **remove** iteration prompt content from TypeScript. The loader becomes the **only** source for workflow iteration prompts; prompts are easier to edit and maintain in .md. Keep this separate from the existing **skill loader** (which loads Anthropic Agent Skills from SKILL.md).

## Context

- **Current**: Iteration prompts live in `src/prompts/iterations/*.ts` as template literals with a separate `*_METADATA` export. Registry imports those and builds `ITERATION_REGISTRY`; `allowedPaths` is hardcoded in the registry.
- **Existing**: `skill-loader.ts` loads SKILL.md (frontmatter + body); `parseFrontmatter` in `frontmatter.ts`; `loadIterationsFromSkills` + `skillsCache` allow loading iterations from a skills dir. Naming is confusing when reusing “skill loader” for iteration prompts.
- **Drafts**: `src/prompts/drafts/*.md` already use markdown; a loader aligns canonical format with that.
- **Scope**: The **12 workflow iterations** (user-roles, interactive-elements, validation, accessibility, performance, security, responsive-web, responsive-native, language-support, locale-formatting, cultural-appropriateness, analytics) move to .md and are loaded by the prompt loader. **story-interconnection** and **system-discovery** stay in TS for this ticket (they have builder logic / system-prompt usage); optional follow-up to move their template text to .md later.

## Plan

### 1. Define frontmatter schema for iteration prompts

**Fields (aligned with `IterationDefinition` + registry):**

| Field            | Type     | Required | Notes |
|------------------|----------|----------|--------|
| `id`             | string   | yes      | Must match a known iteration id (or extend set). |
| `name`           | string   | yes      | Human-readable name. |
| `description`    | string   | yes      | What the iteration does. |
| `category`       | string   | yes      | One of `ITERATION_CATEGORIES`. |
| `order`          | number   | yes      | Processing order (lower first). |
| `applicableWhen` | string   | no       | When this iteration applies. |
| `applicableTo`   | string/array | no    | `all` or list: `web`, `mobile-native`, etc. |
| `allowedPaths`   | array    | no       | Patch paths this iteration may modify. If omitted, fall back to registry `ALLOWED_PATHS[id]`. |
| `outputFormat`   | string   | no       | `patches` (default). |
| `supportsVision` | boolean  | no       | Whether iteration supports image input. |

Body = prompt text (markdown), trimmed.

**Example** (`src/prompts/iteration-prompts/user-roles.md`):

```yaml
---
id: user-roles
name: User Roles Analysis
description: Identifies distinct user roles and their interactions with the interface
category: roles
order: 1
applicableWhen: When the mockup shows features that may vary by user type
applicableTo: all
allowedPaths:
  - story.asA
  - story.iWant
  - story.soThat
  - outcomeAcceptanceCriteria
outputFormat: patches
---

# PATH SCOPE
...
```

### 2. New module: `src/shared/prompt-loader.ts`

**Responsibilities:**

- Load iteration prompts from markdown files (frontmatter + body).
- Reuse `parseFrontmatter` from `frontmatter.ts`; no dependency on `skill-loader`.
- Validate required frontmatter fields; normalize types (e.g. `applicableTo`).

**API:**

- `loadIterationPrompts(promptsDir: string): Promise<LoadedIterationPrompt[]>`  
  - Scan `promptsDir` for `*.md` files (flat layout).  
  - For each file: read, parse frontmatter, validate, return `{ metadata, prompt }`.  
  - Sort by `order`.
- `loadIterationPrompt(filePath: string): Promise<LoadedIterationPrompt>`  
  - Load and validate a single file.

**Types:**

- `LoadedIterationPrompt`: `{ metadata: IterationPromptMetadata, prompt: string }`.
- `IterationPromptMetadata`: frontmatter fields above (typed); `allowedPaths` optional.

**Validation:**

- Required: `id`, `name`, `description`, `category`, `order`.
- `category` must be in `ITERATION_CATEGORIES`.
- `applicableTo`: parse to `'all'` or `ProductType[]` (reuse or mirror logic from skill-loader).
- `allowedPaths`: if present, validate each value against `PatchPath` (or a string array and cast).

**Errors:**

- Throw or return errors for missing required fields, invalid category, invalid paths, duplicate `id`.

### 3. Iteration registry: loader as only source (remove TS iterations)

**Current behavior:**  
Registry imports the 12 `*_METADATA` from `prompts/index.js` and builds `ITERATION_REGISTRY`. `getIterationById` etc. read from that.

**Changes:**

1. **Remove TS iteration data from registry**  
   - Remove imports of the 12 iteration METADATA from `prompts/index.js`.  
   - Remove the `ITERATION_REGISTRY` object (the 12 hardcoded entries).  
   - Keep `WORKFLOW_ORDER`, `IterationId`, `ALLOWED_PATHS` (used as fallback when .md doesn't specify `allowedPaths`).

2. **Single cache populated by prompt loader**  
   - Replace `skillsCache` with one cache: `externalIterationsCache: IterationRegistryEntry[] | null`.  
   - New: `loadIterationsFromPrompts(promptsDir: string): Promise<IterationRegistryEntry[]>` uses prompt-loader, maps to `IterationRegistryEntry[]`, sets `externalIterationsCache`, returns.  
   - Keep `loadIterationsFromSkills(skillsDir)` for backward compatibility (same cache); optional / legacy.

3. **Cache-only resolution**  
3. **Cache-only resolution**  
   - `getIterationById(id)`: if cache is set, find entry by `id` in cache; else return `undefined`.  
   - `getApplicableIterations(productType)`: if cache set, filter cache by product type and order; else return `[]`.  
   - `getAllIterations()`: if cache set, return cache (sorted by order); else return `[]`.  
   - `getIterations()`: return cache ?? `[]`. No TS fallback.

4. **Initialization required**  
   - Add `initializeIterationPrompts(promptsDir: string): Promise<void>` which calls `loadIterationsFromPrompts(promptsDir)` and sets the cache.  
   - **CLI (and any programmatic use) must call `initializeIterationPrompts()` at startup** before creating the agent. Default path: e.g. `src/prompts/iterations`.

5. **Mapping from LoadedIterationPrompt to IterationRegistryEntry**  
   - New helper: `promptToRegistryEntry(loaded: LoadedIterationPrompt, allowedPathsFallback: PatchPath[]): IterationRegistryEntry`.  
   - `allowedPaths`: use `loaded.metadata.allowedPaths` if present and valid, else `allowedPathsFallback` from `ALLOWED_PATHS[loaded.metadata.id]`.  
   - `tokenEstimate`: e.g. `Math.ceil(loaded.prompt.length / 4)`.  
   - `applicableTo`: parse like skill-loader (`all` or list of product types).

### 4. Directory layout

- **Use `src/prompts/iterations/` for iteration prompts as .md (flat `*.md`).**
- The 12 workflow iteration **.ts** files are **removed**; they are replaced by 12 **.md** files in the same dir (e.g. `user-roles.md`, `validation.md`, …).
- **story-interconnection.ts** and **system-discovery.ts** stay in that dir (they contain builder logic and are not loaded by the iteration prompt loader).

### 5. Migration: TS → .md and remove TS iteration files

- **Migrate all 12 workflow iterations** from TS to .md: for each of user-roles, interactive-elements, validation, accessibility, performance, security, responsive-web, responsive-native, language-support, locale-formatting, cultural-appropriateness, analytics, create a `.md` file in `src/prompts/iterations/` with frontmatter (from `*_METADATA`) + prompt body (from `*_PROMPT`).
- **Delete the 12 corresponding .ts files** (e.g. `user-roles.ts`, `validation.ts`, …).
- **Update `src/prompts/index.ts`**: remove the 12 iteration exports (USER_ROLES_PROMPT/METADATA, INTERACTIVE_ELEMENTS_*, …). Keep exports for system, post-processing, story-interconnection, judge rubrics.
- Optional: add a small script to convert one .ts iteration to .md (extract prompt + metadata) to speed up migration; not required.

### 6. Startup / CLI

- **CLI must call `initializeIterationPrompts(promptsDir)` at startup** (e.g. at the beginning of the main run, before `createAgent`). Use default path relative to project root (e.g. `src/prompts/iterations`).
- If the prompts dir is missing or empty, fail fast or log a clear error so users know iterations must be loaded from .md.
- Any programmatic use of the agent must also call `initializeIterationPrompts()` (or `loadIterationsFromPrompts()`) before using `getIterationById` / `getAllIterations`.

### 7. Exports and public API

- Export from `src/shared/index.ts`: `loadIterationPrompts`, `loadIterationPromptsFromDir` (or only the one that loads dir), and types `LoadedIterationPrompt`, `IterationPromptMetadata` if needed by consumers.
- Export from `src/index.ts`: `loadIterationsFromPrompts`, `initializeIterationPrompts` (and keep `loadIterationsFromSkills`, `initializeSkillsCache`).

### 8. Tests

- **Unit (prompt-loader):**
  - Valid markdown with full frontmatter → parsed `LoadedIterationPrompt` with correct `metadata` and `prompt`.
  - Missing required field → throws or returns error.
  - Invalid `category` → error.
  - `applicableTo: all` vs array → normalized correctly.
  - `allowedPaths` in frontmatter → present in metadata; absent → not required (fallback in registry).
- **Unit (iteration-registry):**
  - After `loadIterationsFromPrompts(dir)` with one .md file, `getIterationById(id)` returns entry with prompt from file and `allowedPaths` from frontmatter or fallback.
  - `getAllIterations()` returns cache when set.
- **Fixture:** Add a minimal valid `.md` in `tests/fixtures/prompt-loader/` (e.g. `minimal-iteration.md`) and use it in tests.

### 9. Documentation

- **docs/configuration.md** (or equivalent): describe loading iteration prompts from markdown; frontmatter schema; that `initializeIterationPrompts(promptsDir)` opts into this; coexistence with TS and skills.
- **Code comments:** In `prompt-loader.ts` and registry, one-line summary that this is for “iteration prompts” (not Agent Skills).

### 10. Implementation order

1. Define frontmatter schema (doc) and implement `src/shared/prompt-loader.ts` (parse, validate, `loadIterationPrompt`, `loadIterationPrompts`).
2. Add `loadIterationsFromPrompts` and cache-only behavior in `iteration-registry.ts`; remove TS iteration imports and `ITERATION_REGISTRY`; introduce `externalIterationsCache`; update `getIterationById`, `getApplicableIterations`, `getAllIterations`, `getIterations` to resolve from cache only.
3. Migrate all 12 iteration prompts from TS to .md in `src/prompts/iterations/`.
4. Delete the 12 iteration .ts files; update `src/prompts/index.ts` (remove 12 iteration exports).
5. CLI: call `initializeIterationPrompts(promptsDir)` at startup (before `createAgent`).
6. Unit tests for prompt-loader and registry.
7. Update docs (configuration + code comments).

### 11. Out of scope (follow-up)

- Moving story-interconnection and system-discovery template text to .md (optional; they have builder logic in TS).
- Build-time generation of TS from .md (keep runtime loading).
- Changing skill-loader name or behavior (it stays for Agent Skills only).

---

## Acceptance criteria

- [ ] `src/shared/prompt-loader.ts` exists, exports `loadIterationPrompts(dir)` and `loadIterationPrompt(filePath)`, uses `parseFrontmatter`, validates required fields and category.
- [ ] Iteration registry has no TS iteration data; `loadIterationsFromPrompts(promptsDir)` and `initializeIterationPrompts(promptsDir)` populate the cache; `getIterationById` / `getApplicableIterations` / `getAllIterations` resolve from cache only (no TS fallback).
- [ ] All 12 workflow iteration prompts exist as .md in `src/prompts/iterations/`; the 12 .ts iteration files are removed; `src/prompts/index.ts` no longer exports those 12 iterations.
- [ ] CLI calls `initializeIterationPrompts(promptsDir)` at startup before creating the agent; agent runs using prompts loaded from .md.
- [ ] Unit tests cover prompt-loader (valid/invalid frontmatter) and registry (cache resolution).
- [ ] Docs describe the frontmatter schema and that iteration prompts are loaded from markdown (required at startup).
