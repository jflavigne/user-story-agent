# Artifact-Saving Feature for User Story Pipeline

## Summary

Add `--save-artifacts <dir>` and `--project <name>` CLI flags that persist pipeline outputs with a well-organized structure supporting:
- Multiple projects
- Multiple runs per project
- Image preservation alongside stories
- Intermediate step inspection
- Cross-project story registries

---

## Directory Structure (Multi-Project)

```
<artifacts-root>/                         # User-provided base directory
  projects/
    <project-name>/                       # e.g., "filter-app", "checkout-flow"
      project.json                        # Project metadata and run history
      runs/
        run-2026-02-06T14-32-15-123Z/     # Timestamped run directory
          manifest.json                   # Run metadata and artifact index

          # Pass 0: System Discovery
          discovery/
            system-context.json           # Full SystemDiscoveryContext
            component-graph.json          # ComponentGraph only (for visualization)
            planned-stories.json          # PlannedStory[] from Figma sections

          # Figma Assets (persisted for reference)
          assets/
            figma-full-page.png           # Full design screenshot
            components/
              spinner-loading.png         # Individual component screenshots
              filter-item.png
              filter-sheet.png
            component-index.json          # Component metadata + confidence scores

          # Pass 1: Story Generation
          stories/
            spinner-loading/              # One folder per story (by component ref)
              iterations.json             # All IterationResult[]
              structure.json              # StoryStructure (patch-based)
              judge.json                  # JudgeRubric (Pass 1c)
              story.md                    # Final enhanced markdown

            filter-item/
              ...

          # Pass 2: Interconnections
          interconnections/
            by-story.json                 # StoryInterconnections per story
            relationship-graph.json       # Cross-story relationships (for viz)

          # Pass 2b: Global Consistency
          consistency/
            report.json                   # GlobalConsistencyReport
            applied-fixes.json            # Fixes that were auto-applied
            flagged-for-review.json       # Fixes requiring manual review

          # Final Outputs
          final/
            all-stories.md                # Concatenated stories (single file)
            bundle.json                   # Complete SystemWorkflowResult
            quality-summary.json          # Aggregated quality metrics

      # Cross-run indexes (updated after each run)
      story-registry.json                 # All stories across runs with versions
      component-library.json              # All components discovered

  # Global index (all projects)
  index.json                              # Project listing and stats
```

### Key Organization Principles

| Principle | Implementation |
|-----------|----------------|
| **Project isolation** | Each project has its own directory |
| **Run immutability** | Each run is timestamped, never modified |
| **Story-centric** | Stories get their own folders with all artifacts |
| **Image preservation** | Figma screenshots saved alongside metadata |
| **Cross-run tracking** | Registry files track story versions |
| **Visualization-ready** | Graph exports for tools like Mermaid/D3 |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/utils/artifact-saver.ts` | **CREATE** | Core artifact saving class (~300 lines) |
| `src/utils/artifact-types.ts` | **CREATE** | TypeScript interfaces for artifacts |
| `src/cli.ts` | MODIFY | Add `--save-artifacts` and `--project` flags |
| `src/agent/types.ts` | MODIFY | Add artifact config to agent config |
| `src/agent/user-story-agent.ts` | MODIFY | Hook artifact saving + image persistence |
| `src/utils/figma-utils.ts` | MODIFY | Return image buffers for persistence |
| `src/index.ts` | MODIFY | Export new types |

---

## Implementation Details

### 1. New File: `src/utils/artifact-types.ts`

```typescript
/** Configuration for artifact saving */
export interface ArtifactConfig {
  /** Base directory for all artifacts */
  baseDir: string;
  /** Project name (used for directory organization) */
  projectName: string;
  /** Save intermediate pass outputs (default: true) */
  saveIntermediates?: boolean;
  /** Save Figma screenshots (default: true) */
  saveImages?: boolean;
  /** Update cross-run registries (default: true) */
  updateRegistries?: boolean;
}

/** Project-level metadata */
export interface ProjectManifest {
  manifestVersion: string;          // "1.0"
  projectName: string;
  createdAt: string;
  lastRunAt: string;
  totalRuns: number;
  totalStories: number;
  runs: RunReference[];             // Most recent first
}

/** Reference to a run (stored in project.json) */
export interface RunReference {
  runId: string;
  startedAt: string;
  storyCount: number;
  passesCompleted: string[];
  figmaFileKey?: string;
}

/** Run-level manifest */
export interface RunManifest {
  manifestVersion: string;
  runId: string;
  projectName: string;
  startedAt: string;
  completedAt?: string;
  mode: string;
  figmaSource?: {
    fileKey: string;
    nodeId?: string;
    url: string;
  };
  storyCount: number;
  passesCompleted: string[];
  qualitySummary: QualitySummary;
  artifacts: ArtifactEntry[];
  saveErrors?: string[];
}

/** Aggregated quality metrics */
export interface QualitySummary {
  averageScore: number;             // 0-5
  storiesApproved: number;
  storiesNeedingReview: number;
  fixesAutoApplied: number;
  fixesFlaggedForReview: number;
  refinementRoundsUsed: number;
}

/** Single artifact entry */
export interface ArtifactEntry {
  pass: string;                     // "discovery", "story", "interconnection", etc.
  type: 'json' | 'markdown' | 'png';
  path: string;                     // Relative to run dir
  sizeBytes: number;
  storyId?: string;
  componentId?: string;
}

/** Story registry entry (cross-run tracking) */
export interface StoryRegistryEntry {
  storyId: string;                  // Stable ID
  componentRef: string;             // Component reference
  level?: string;                   // atom/molecule/organism
  versions: StoryVersion[];
}

export interface StoryVersion {
  runId: string;
  runAt: string;
  qualityScore: number;
  path: string;                     // Relative path to story.md
}

/** Component library entry */
export interface ComponentLibraryEntry {
  componentId: string;              // Stable COMP-* ID
  productName: string;
  technicalName?: string;
  firstSeenRun: string;
  lastSeenRun: string;
  confidence: number;
  screenshotPath?: string;
}
```

### 2. New File: `src/utils/artifact-saver.ts`

```typescript
export class ArtifactSaver {
  private config: Required<ArtifactConfig>;
  private runId: string;
  private runDir: string;
  private projectDir: string;
  private manifest: RunManifest;
  private saveErrors: string[] = [];
  private imageBuffers: Map<string, Buffer> = new Map();

  constructor(config: ArtifactConfig) { ... }

  // Initialization
  async initialize(): Promise<void>                    // Create all directories

  // Pass 0: Discovery
  async saveSystemContext(context: SystemDiscoveryContext): Promise<void>
  async saveComponentGraph(graph: ComponentGraph): Promise<void>
  async savePlannedStories(stories: PlannedStory[]): Promise<void>

  // Assets: Images
  async saveFigmaFullPage(buffer: Buffer): Promise<void>
  async saveComponentScreenshot(componentId: string, name: string, buffer: Buffer): Promise<void>
  async saveComponentIndex(components: FigmaComponent[]): Promise<void>

  // Pass 1: Stories
  async saveStoryIterations(storyId: string, results: IterationResult[]): Promise<void>
  async saveStoryStructure(storyId: string, structure: StoryStructure): Promise<void>
  async saveStoryJudge(storyId: string, rubric: JudgeRubric): Promise<void>
  async saveStoryMarkdown(storyId: string, markdown: string): Promise<void>

  // Pass 2: Interconnections
  async saveInterconnections(results: Pass2InterconnectionResult): Promise<void>
  async saveRelationshipGraph(stories: StoryInterconnections[]): Promise<void>

  // Pass 2b: Consistency
  async saveConsistencyReport(report: GlobalConsistencyReport): Promise<void>
  async saveAppliedFixes(fixes: FixPatch[]): Promise<void>
  async saveFlaggedFixes(fixes: FixPatch[]): Promise<void>

  // Final
  async saveFinalBundle(result: SystemWorkflowResult): Promise<void>
  async saveAllStoriesMarkdown(stories: Array<{id: string, content: string}>): Promise<void>
  async saveQualitySummary(summary: QualitySummary): Promise<void>

  // Finalization
  async finalize(): Promise<void>                      // Save manifest, update registries

  // Registry updates
  private async updateProjectManifest(): Promise<void>
  private async updateStoryRegistry(stories: StoryRegistryEntry[]): Promise<void>
  private async updateComponentLibrary(components: ComponentLibraryEntry[]): Promise<void>
  private async updateGlobalIndex(): Promise<void>

  // Utilities
  getRunDir(): string
  getStoryDir(storyId: string): string
  private sanitizeId(id: string): string
  private async saveJSON(path: string, data: unknown): Promise<SaveResult>
  private async saveFile(path: string, content: string | Buffer): Promise<SaveResult>
}
```

**Error Handling**: All operations wrapped in try-catch. Errors logged and collected. Pipeline never fails due to artifact save errors.

### 3. CLI Changes: `src/cli.ts`

**Add to `CliArgs` interface** (line ~66):
```typescript
saveArtifacts?: string;   // Base directory for artifacts
project?: string;          // Project name (required with --save-artifacts)
```

**Add to `parseArgs`** (after line ~200):
```typescript
case '--save-artifacts':
  if (i + 1 < argv.length) {
    args.saveArtifacts = argv[++i];
  }
  break;
case '--project':
  if (i + 1 < argv.length) {
    args.project = argv[++i];
  }
  break;
```

**Add validation** (in main, before agent creation):
```typescript
if (args.saveArtifacts && !args.project) {
  console.error('Error: --project is required when using --save-artifacts');
  process.exit(1);
}
```

**Add to help text** (after line ~99):
```
--save-artifacts <dir>  Save pipeline artifacts to directory
--project <name>        Project name for artifact organization (required with --save-artifacts)
```

**Pass to agent config** (around line ~600):
```typescript
if (args.saveArtifacts && args.project) {
  partialConfig.artifactConfig = {
    baseDir: args.saveArtifacts,
    projectName: args.project,
  };
}
```

### 4. Config Changes: `src/agent/types.ts`

**Add to `UserStoryAgentConfig`** (after line 133):
```typescript
/** Optional artifact configuration for persisting pipeline outputs */
artifactConfig?: ArtifactConfig;
```

**Add import**:
```typescript
import type { ArtifactConfig } from '../utils/artifact-types.js';
```

### 5. Figma Utils Changes: `src/utils/figma-utils.ts`

**Modify `autoDetectFigmaComponents` return type** to include image buffers:
```typescript
export interface FigmaAutoDetectResult {
  components: FigmaComponent[];
  images: ImageBlock[];               // Existing
  imageBuffers?: Map<string, Buffer>; // NEW: for persistence
}
```

**Store buffers during download** (in `downloadFigmaScreenshot`):
```typescript
// After successful download, store buffer for potential persistence
result.imageBuffers.set(componentId, buffer);
```

### 6. Agent Integration: `src/agent/user-story-agent.ts`

**Add imports**:
```typescript
import { ArtifactSaver } from '../utils/artifact-saver.js';
import type { ArtifactConfig } from '../utils/artifact-types.js';
```

**Add class member**:
```typescript
private artifactSaver?: ArtifactSaver;
```

**Initialize in constructor**:
```typescript
if (config.artifactConfig) {
  this.artifactSaver = new ArtifactSaver(config.artifactConfig);
}
```

**Hook in `runSystemWorkflow`** (lines 1402-1579):
```typescript
// At start
await this.artifactSaver?.initialize();

// After Pass 0 (with images)
if (this.artifactSaver) {
  await this.artifactSaver.saveSystemContext(systemContext);
  await this.artifactSaver.saveComponentGraph(systemContext.componentGraph);
  if (systemContext.plannedStories) {
    await this.artifactSaver.savePlannedStories(systemContext.plannedStories);
  }
  // Save Figma images if available
  if (figmaResult?.imageBuffers) {
    for (const [id, buffer] of figmaResult.imageBuffers) {
      if (id === 'full-page') {
        await this.artifactSaver.saveFigmaFullPage(buffer);
      } else {
        const comp = figmaResult.components.find(c => c.id === id);
        await this.artifactSaver.saveComponentScreenshot(id, comp?.name ?? id, buffer);
      }
    }
    await this.artifactSaver.saveComponentIndex(figmaResult.components);
  }
}

// After each story completes Pass 1
for (const result of pass1Results) {
  const storyId = sanitizeStoryId(result.structure?.title ?? `story-${idx}`);
  await this.artifactSaver?.saveStoryIterations(storyId, result.iterationResults);
  await this.artifactSaver?.saveStoryStructure(storyId, result.structure);
  await this.artifactSaver?.saveStoryJudge(storyId, result.judgeResults?.pass1c);
  await this.artifactSaver?.saveStoryMarkdown(storyId, result.enhancedStory);
}

// After Pass 2
await this.artifactSaver?.saveInterconnections(pass2Results);
await this.artifactSaver?.saveRelationshipGraph(
  pass2Results.map(r => r.interconnections)
);

// After Pass 2b
await this.artifactSaver?.saveConsistencyReport(consistencyReport);
await this.artifactSaver?.saveAppliedFixes(appliedFixes);
await this.artifactSaver?.saveFlaggedFixes(flaggedFixes);

// Final outputs
await this.artifactSaver?.saveFinalBundle(result);
await this.artifactSaver?.saveAllStoriesMarkdown(result.stories);
await this.artifactSaver?.saveQualitySummary(computeQualitySummary(result));
await this.artifactSaver?.finalize();
```

### 7. Export: `src/index.ts`

```typescript
export { ArtifactSaver } from './utils/artifact-saver.js';
export type {
  ArtifactConfig,
  ProjectManifest,
  RunManifest,
  ArtifactEntry,
  QualitySummary,
  StoryRegistryEntry,
  ComponentLibraryEntry,
} from './utils/artifact-types.js';
```

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Project isolation** | Separate directories per project | Prevents story ID collisions across projects |
| **Run immutability** | Timestamped runs never modified | Enables diff between runs, audit trail |
| **Story-centric folders** | Each story gets own directory | All artifacts (iterations, structure, judge, md) co-located |
| **Image persistence** | Save Figma screenshots as PNG | Design reference preserved with stories |
| **Cross-run registries** | `story-registry.json`, `component-library.json` | Track story versions, component reuse |
| **Error handling** | Non-fatal, collect errors | Pipeline never fails due to artifact saves |
| **File format** | JSON + Markdown + PNG | Structured data + human-readable + visual |
| **Relationship graphs** | Separate JSON for visualization | Enables Mermaid/D3 rendering |
| **Quality summary** | Aggregated metrics | Quick assessment without reading all judge results |

---

## Usage Examples

**Basic usage**:
```bash
npm run agent -- --mode system-workflow \
  --mockup-images "https://figma.com/design/abc123" \
  --save-artifacts ./artifacts \
  --project "filter-app" \
  --debug
```

**Multiple projects**:
```bash
# Project 1
npm run agent -- --save-artifacts ./artifacts --project "checkout-flow" ...

# Project 2
npm run agent -- --save-artifacts ./artifacts --project "user-profile" ...

# Results:
# ./artifacts/projects/checkout-flow/runs/run-xxx/...
# ./artifacts/projects/user-profile/runs/run-xxx/...
# ./artifacts/index.json  (lists both projects)
```

**Inspect results**:
```bash
# View project history
cat ./artifacts/projects/filter-app/project.json

# View specific run
cat ./artifacts/projects/filter-app/runs/run-2026-02-06T.../manifest.json

# View story artifacts
ls ./artifacts/projects/filter-app/runs/run-.../stories/spinner-loading/

# View Figma screenshots
open ./artifacts/projects/filter-app/runs/run-.../assets/components/
```

---

## Verification

1. **Manual test with Figma**:
   ```bash
   npm run agent -- --mode system-workflow \
     --mockup-images "https://figma.com/design/YOUR_FILE_KEY" \
     --save-artifacts ./test-artifacts \
     --project "test-project" \
     --debug
   ```

2. **Verify directory structure**:
   ```bash
   tree ./test-artifacts/projects/test-project/
   # Should show: project.json, runs/, story-registry.json, component-library.json
   ```

3. **Verify images saved**:
   ```bash
   ls ./test-artifacts/projects/test-project/runs/run-*/assets/components/
   # Should show: *.png files for each component
   ```

4. **Verify JSON validity**:
   ```bash
   jq . ./test-artifacts/projects/test-project/runs/run-*/manifest.json
   jq . ./test-artifacts/projects/test-project/runs/run-*/discovery/system-context.json
   jq . ./test-artifacts/projects/test-project/story-registry.json
   ```

5. **Verify story artifacts**:
   ```bash
   # Check a story folder has all expected files
   ls ./test-artifacts/projects/test-project/runs/run-*/stories/*/
   # Should show: iterations.json, structure.json, judge.json, story.md
   ```

6. **Run existing tests** (ensure no regressions):
   ```bash
   npm test
   ```

7. **Add unit tests** for `ArtifactSaver`:
   - Directory creation (nested paths)
   - JSON serialization (handles cycles, bigints)
   - Image buffer writing
   - Error collection (non-fatal)
   - Manifest generation
   - Registry updates (merge with existing)
   - Project isolation (no cross-contamination)

---

## Estimated Scope

| Category | Estimate |
|----------|----------|
| **New files** | 2 (`artifact-types.ts`, `artifact-saver.ts`) |
| **New code** | ~400 lines |
| **Modified files** | 5 (`cli.ts`, `types.ts`, `user-story-agent.ts`, `figma-utils.ts`, `index.ts`) |
| **Modified code** | ~80 lines |
| **Tests needed** | ~150 lines (unit tests for ArtifactSaver) |

---

## Future Considerations (Out of Scope)

- **Artifact viewer CLI** (`npm run artifacts -- --project X --run Y`)
- **Diff between runs** (`npm run artifacts -- --diff run-A run-B`)
- **Export to other formats** (HTML report, PDF)
- **Cloud storage integration** (S3, GCS)
- **Artifact cleanup** (delete old runs, retention policy)
