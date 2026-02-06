/**
 * Artifact types for persisting pipeline outputs
 */

/** Configuration for artifact saving */
export interface ArtifactConfig {
  baseDir: string;
  projectName: string;
  saveIntermediates?: boolean;
  saveImages?: boolean;
  updateRegistries?: boolean;
}

/** Project-level metadata */
export interface ProjectManifest {
  manifestVersion: string;
  projectName: string;
  createdAt: string;
  lastRunAt: string;
  totalRuns: number;
  totalStories: number;
  runs: RunReference[];
}

/** Reference to a run */
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
  figmaSource?: { fileKey: string; nodeId?: string; url: string };
  storyCount: number;
  passesCompleted: string[];
  qualitySummary: QualitySummary;
  artifacts: ArtifactEntry[];
  saveErrors?: string[];
}

/** Quality metrics */
export interface QualitySummary {
  averageScore: number;
  storiesApproved: number;
  storiesNeedingReview: number;
  fixesAutoApplied: number;
  fixesFlaggedForReview: number;
  refinementRoundsUsed: number;
}

/** Artifact entry */
export interface ArtifactEntry {
  pass: string;
  type: 'json' | 'markdown' | 'png';
  path: string;
  sizeBytes: number;
  storyId?: string;
  componentId?: string;
}

/** Story registry entry */
export interface StoryRegistryEntry {
  storyId: string;
  componentRef: string;
  level?: string;
  versions: StoryVersion[];
}

export interface StoryVersion {
  runId: string;
  runAt: string;
  qualityScore: number;
  path: string;
}

/** Component library entry */
export interface ComponentLibraryEntry {
  componentId: string;
  productName: string;
  technicalName?: string;
  firstSeenRun: string;
  lastSeenRun: string;
  confidence: number;
  screenshotPath?: string;
}

export interface SaveResult {
  success: boolean;
  path: string;
  sizeBytes?: number;
  error?: string;
}
