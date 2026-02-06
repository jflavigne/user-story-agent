/**
 * ArtifactSaver: persists pipeline outputs to disk with organized directory structure.
 * All operations are non-fatal; errors are collected and never fail the pipeline.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ArtifactConfig,
  ProjectManifest,
  RunManifest,
  RunReference,
  ArtifactEntry,
  QualitySummary,
} from './artifact-types.js';
import type { SystemDiscoveryContext, ComponentGraph, PlannedStory, GlobalConsistencyReport, FixPatch, StoryInterconnections } from '../shared/types.js';
import type { StoryStructure, JudgeRubric } from '../shared/types.js';
import type { IterationResult } from '../agent/state/story-state.js';
import type { Pass2InterconnectionResult, SystemWorkflowResult } from '../agent/types.js';
import type { FigmaComponent } from './figma-utils.js';

const MANIFEST_VERSION = '1.0';

/** Internal result type for save operations */
interface SaveResult {
  path?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Saves pipeline artifacts to a structured directory. Supports multiple projects,
 * timestamped runs, image preservation, and cross-run registries.
 */
export class ArtifactSaver {
  private config: Required<ArtifactConfig>;
  private runId: string;
  private runDir: string;
  private projectDir: string;
  private manifest: RunManifest;
  private saveErrors: string[] = [];

  constructor(config: ArtifactConfig) {
    this.config = {
      baseDir: config.baseDir,
      projectName: config.projectName,
      saveIntermediates: config.saveIntermediates ?? true,
      saveImages: config.saveImages ?? true,
      updateRegistries: config.updateRegistries ?? true,
    };
    this.runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    this.projectDir = path.join(this.config.baseDir, 'projects', this.sanitizeId(this.config.projectName));
    this.runDir = path.join(this.projectDir, 'runs', this.runId);
    this.manifest = {
      manifestVersion: MANIFEST_VERSION,
      runId: this.runId,
      projectName: this.config.projectName,
      startedAt: new Date().toISOString(),
      mode: 'system-workflow',
      storyCount: 0,
      passesCompleted: [],
      qualitySummary: {
        averageScore: 0,
        storiesApproved: 0,
        storiesNeedingReview: 0,
        fixesAutoApplied: 0,
        fixesFlaggedForReview: 0,
        refinementRoundsUsed: 0,
      },
      artifacts: [],
    };
  }

  /** Returns the run directory path. */
  getRunDir(): string {
    return this.runDir;
  }

  /** Returns the story subdirectory for a given story ID. */
  getStoryDir(storyId: string): string {
    return path.join(this.runDir, 'stories', this.sanitizeId(storyId));
  }

  /**
   * Creates all artifact directories for this run.
   */
  async initialize(): Promise<void> {
    const dirs = [
      path.join(this.runDir, 'discovery'),
      path.join(this.runDir, 'assets', 'components'),
      path.join(this.runDir, 'stories'),
      path.join(this.runDir, 'interconnections'),
      path.join(this.runDir, 'consistency'),
      path.join(this.runDir, 'final'),
    ];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.saveErrors.push(`mkdir ${dir}: ${msg}`);
      }
    }
  }

  /** Pass 0: save full system discovery context. */
  async saveSystemContext(context: SystemDiscoveryContext): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'discovery/system-context.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), context);
    if (res.path) this.addArtifact('discovery', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 0: save component graph only. */
  async saveComponentGraph(graph: ComponentGraph): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'discovery/component-graph.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), graph);
    if (res.path) this.addArtifact('discovery', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 0: save planned stories. */
  async savePlannedStories(stories: PlannedStory[]): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'discovery/planned-stories.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), stories);
    if (res.path) this.addArtifact('discovery', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Save full-page Figma screenshot. */
  async saveFigmaFullPage(buffer: Buffer): Promise<void> {
    if (!this.config.saveImages) return;
    const rel = 'assets/figma-full-page.png';
    const res = await this.saveFile(path.join(this.runDir, rel), buffer);
    if (res.path) this.addArtifact('assets', 'png', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Save a single component screenshot. */
  async saveComponentScreenshot(componentId: string, name: string, buffer: Buffer): Promise<void> {
    if (!this.config.saveImages) return;
    const safeName = this.sanitizeId(name || componentId) + '.png';
    const rel = path.join('assets', 'components', safeName);
    const res = await this.saveFile(path.join(this.runDir, rel), buffer);
    if (res.path) this.addArtifact('assets', 'png', res.path, res.sizeBytes ?? 0, undefined, componentId);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Save component index (metadata + confidence). */
  async saveComponentIndex(components: FigmaComponent[]): Promise<void> {
    const rel = 'assets/component-index.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), components);
    if (res.path) this.addArtifact('assets', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 1: save iteration results for one story. */
  async saveStoryIterations(storyId: string, results: IterationResult[]): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const storyDir = this.getStoryDir(storyId);
    try {
      await fs.mkdir(storyDir, { recursive: true });
    } catch {
      // ignore
    }
    const rel = path.join('stories', this.sanitizeId(storyId), 'iterations.json');
    const res = await this.saveJSON(path.join(this.runDir, rel), results);
    if (res.path) this.addArtifact('story', 'json', res.path, res.sizeBytes ?? 0, storyId);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 1: save story structure. */
  async saveStoryStructure(storyId: string, structure: StoryStructure): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const storyDir = this.getStoryDir(storyId);
    try {
      await fs.mkdir(storyDir, { recursive: true });
    } catch {
      // ignore
    }
    const rel = path.join('stories', this.sanitizeId(storyId), 'structure.json');
    const res = await this.saveJSON(path.join(this.runDir, rel), structure);
    if (res.path) this.addArtifact('story', 'json', res.path, res.sizeBytes ?? 0, storyId);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 1: save judge rubric. */
  async saveStoryJudge(storyId: string, rubric: JudgeRubric): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const storyDir = this.getStoryDir(storyId);
    try {
      await fs.mkdir(storyDir, { recursive: true });
    } catch {
      // ignore
    }
    const rel = path.join('stories', this.sanitizeId(storyId), 'judge.json');
    const res = await this.saveJSON(path.join(this.runDir, rel), rubric);
    if (res.path) this.addArtifact('story', 'json', res.path, res.sizeBytes ?? 0, storyId);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 1: save final story markdown. */
  async saveStoryMarkdown(storyId: string, markdown: string): Promise<void> {
    const storyDir = this.getStoryDir(storyId);
    try {
      await fs.mkdir(storyDir, { recursive: true });
    } catch {
      // ignore
    }
    const rel = path.join('stories', this.sanitizeId(storyId), 'story.md');
    const res = await this.saveFile(path.join(this.runDir, rel), markdown);
    if (res.path) this.addArtifact('story', 'markdown', res.path, res.sizeBytes ?? 0, storyId);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 2: save interconnections by story. */
  async saveInterconnections(results: Pass2InterconnectionResult): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'interconnections/by-story.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), results);
    if (res.path) this.addArtifact('interconnection', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 2: save relationship graph (for visualization). */
  async saveRelationshipGraph(stories: StoryInterconnections[]): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'interconnections/relationship-graph.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), stories);
    if (res.path) this.addArtifact('interconnection', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 2b: save global consistency report. */
  async saveConsistencyReport(report: GlobalConsistencyReport): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'consistency/report.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), report);
    if (res.path) this.addArtifact('consistency', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 2b: save applied fixes. */
  async saveAppliedFixes(fixes: FixPatch[]): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'consistency/applied-fixes.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), fixes);
    if (res.path) this.addArtifact('consistency', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Pass 2b: save fixes flagged for review. */
  async saveFlaggedFixes(fixes: FixPatch[]): Promise<void> {
    if (!this.config.saveIntermediates) return;
    const rel = 'consistency/flagged-for-review.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), fixes);
    if (res.path) this.addArtifact('consistency', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Final: save full workflow result bundle. */
  async saveFinalBundle(result: SystemWorkflowResult): Promise<void> {
    this.manifest.storyCount = result.stories.length;
    this.manifest.passesCompleted = result.metadata.passesCompleted ?? [];
    const rel = 'final/bundle.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), result);
    if (res.path) this.addArtifact('final', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Final: save concatenated all-stories markdown. */
  async saveAllStoriesMarkdown(stories: Array<{ id: string; content: string }>): Promise<void> {
    const content = stories.map((s) => `# ${s.id}\n\n${s.content}`).join('\n\n---\n\n');
    const rel = 'final/all-stories.md';
    const res = await this.saveFile(path.join(this.runDir, rel), content);
    if (res.path) this.addArtifact('final', 'markdown', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /** Final: save quality summary. */
  async saveQualitySummary(summary: QualitySummary): Promise<void> {
    this.manifest.qualitySummary = summary;
    const rel = 'final/quality-summary.json';
    const res = await this.saveJSON(path.join(this.runDir, rel), summary);
    if (res.path) this.addArtifact('final', 'json', res.path, res.sizeBytes ?? 0);
    if (res.error) this.saveErrors.push(res.error);
  }

  /**
   * Writes run manifest and updates project/registries. Call once at end of pipeline.
   */
  async finalize(): Promise<void> {
    this.manifest.completedAt = new Date().toISOString();
    if (this.saveErrors.length > 0) {
      this.manifest.saveErrors = [...this.saveErrors];
    }
    const manifestPath = path.join(this.runDir, 'manifest.json');
    try {
      const json = JSON.stringify(this.manifest, null, 2);
      await fs.writeFile(manifestPath, json, 'utf-8');
    } catch (err) {
      this.saveErrors.push(`manifest: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!this.config.updateRegistries) return;

    try {
      await this.updateProjectManifest();
    } catch (err) {
      this.saveErrors.push(`updateProjectManifest: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      await this.updateGlobalIndex();
    } catch (err) {
      this.saveErrors.push(`updateGlobalIndex: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private addArtifact(
    pass: string,
    type: ArtifactEntry['type'],
    relativePath: string,
    sizeBytes: number,
    storyId?: string,
    componentId?: string
  ): void {
    this.manifest.artifacts.push({
      pass,
      type,
      path: relativePath.replace(/\\/g, '/'),
      sizeBytes,
      storyId,
      componentId,
    });
  }

  private async updateProjectManifest(): Promise<void> {
    const projectJsonPath = path.join(this.projectDir, 'project.json');
    const ref: RunReference = {
      runId: this.runId,
      startedAt: this.manifest.startedAt,
      storyCount: this.manifest.storyCount,
      passesCompleted: this.manifest.passesCompleted,
      figmaFileKey: this.manifest.figmaSource?.fileKey,
    };

    let project: ProjectManifest;
    try {
      const raw = await fs.readFile(projectJsonPath, 'utf-8');
      project = JSON.parse(raw) as ProjectManifest;
    } catch {
      project = {
        manifestVersion: MANIFEST_VERSION,
        projectName: this.config.projectName,
        createdAt: this.manifest.startedAt,
        lastRunAt: this.manifest.startedAt,
        totalRuns: 0,
        totalStories: 0,
        runs: [],
      };
    }

    project.lastRunAt = this.manifest.completedAt ?? this.manifest.startedAt;
    project.totalRuns += 1;
    project.totalStories += this.manifest.storyCount;
    project.runs.unshift(ref);
    const runsToKeep = 100;
    if (project.runs.length > runsToKeep) {
      project.runs = project.runs.slice(0, runsToKeep);
    }

    await fs.mkdir(path.dirname(projectJsonPath), { recursive: true });
    await fs.writeFile(projectJsonPath, JSON.stringify(project, null, 2), 'utf-8');
  }

  private async updateGlobalIndex(): Promise<void> {
    const indexPath = path.join(this.config.baseDir, 'index.json');
    interface IndexEntry {
      projectName: string;
      path: string;
      totalRuns: number;
      lastRunAt: string;
    }
    let index: { projects: IndexEntry[] } = { projects: [] };
    try {
      const raw = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(raw) as { projects: IndexEntry[] };
    } catch {
      // no existing index
    }
    const projectPath = path.relative(this.config.baseDir, this.projectDir);
    const existing = index.projects.find((p) => p.projectName === this.config.projectName);
    const entry: IndexEntry = {
      projectName: this.config.projectName,
      path: projectPath.replace(/\\/g, '/'),
      totalRuns: existing ? existing.totalRuns + 1 : 1,
      lastRunAt: this.manifest.completedAt ?? this.manifest.startedAt,
    };
    index.projects = index.projects.filter((p) => p.projectName !== this.config.projectName);
    index.projects.unshift(entry);
    await fs.mkdir(path.dirname(indexPath), { recursive: true });
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  private sanitizeId(id: string): string {
    return id
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'unnamed';
  }

  private async saveJSON(filePath: string, data: unknown): Promise<SaveResult> {
    try {
      const json = JSON.stringify(data, null, 2);
      return await this.saveFile(filePath, json);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async saveFile(filePath: string, content: string | Buffer): Promise<SaveResult> {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, typeof content === 'string' ? 'utf-8' : undefined);
      const rel = path.relative(this.runDir, filePath).replace(/\\/g, '/');
      return { path: rel, sizeBytes: Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content, 'utf-8') };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }
}
