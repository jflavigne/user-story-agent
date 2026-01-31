/**
 * Vision test helpers: synonym matcher, evidence anchor counter, artifact saver.
 * Used by unit, contract, integration, and live vision tests.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/** Component name -> list of acceptable synonyms (case-insensitive) */
export const COMPONENT_SYNONYM_MAP: Record<string, string[]> = {
  FilterSheet: ['filter sheet', 'bottom sheet', 'drawer', 'sheet'],
  FilterBar: ['filter bar', 'horizontal bar', 'toolbar', 'filter toolbar'],
  FilterGroup: ['filter group', 'accordion', 'expandable', 'collapsible'],
  FilterItem: ['filter item', 'checkbox', 'check box', 'option'],
  SpinnerLoading: ['spinner', 'loading indicator', 'progress indicator', 'loading'],
};

/** Evidence anchors (visual cues) for soft assertions */
export const EVIDENCE_ANCHORS = [
  'bottom sheet',
  'drawer',
  'sheet',
  'accordion',
  'expandable',
  'chevron',
  'checkbox',
  'checked',
  'unchecked',
  'spinner',
  'loading indicator',
  'close button',
  'x',
  'clear all',
  'apply button',
];

/**
 * Case-insensitive check: does text match ANY synonym for the given component?
 */
export function matchesComponentSynonym(componentName: string, text: string): boolean {
  const synonyms = COMPONENT_SYNONYM_MAP[componentName];
  if (!synonyms) return false;
  const lower = text.toLowerCase();
  return synonyms.some((s) => lower.includes(s.toLowerCase()));
}

/**
 * Count how many component names (from the synonym map) appear in the given text
 * when matched via any of their synonyms.
 */
export function countComponentsMatchingSynonyms(
  text: string,
  synonymMap: Record<string, string[]> = COMPONENT_SYNONYM_MAP
): number {
  let count = 0;
  for (const componentName of Object.keys(synonymMap)) {
    if (matchesComponentSynonym(componentName, text)) count += 1;
  }
  return count;
}

/**
 * Count how many evidence anchors appear in the given text (case-insensitive).
 */
export function countEvidenceAnchors(
  text: string,
  anchors: string[] = EVIDENCE_ANCHORS
): number {
  const lower = text.toLowerCase();
  return anchors.filter((a) => lower.includes(a.toLowerCase())).length;
}

export interface ArtifactMeta {
  model: string;
  temperature: number;
  inputTokens?: number;
  outputTokens?: number;
  imageHash?: string;
  commitSha?: string;
  timestamp: string;
}

export interface SaveArtifactsOptions {
  runId: string;
  requestPayload: unknown;
  responseRaw: unknown;
  outputParsed: unknown;
  meta: ArtifactMeta;
  baseDir?: string;
}

const DEFAULT_BASE_DIR = 'tests/fixtures/runs';

/**
 * Save live test artifacts to tests/fixtures/runs/<run-id>/.
 * Sanitizes request payload (strip large base64 data for readability).
 */
export async function saveArtifacts(options: SaveArtifactsOptions): Promise<string> {
  const baseDir = options.baseDir ?? path.resolve(process.cwd(), DEFAULT_BASE_DIR);
  const runDir = path.join(baseDir, options.runId);
  await fs.mkdir(runDir, { recursive: true });

  const sanitize = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k === 'data' && typeof v === 'string' && v.length > 100) {
        out[k] = `[base64 truncated, ${v.length} chars]`;
      } else {
        out[k] = sanitize(v);
      }
    }
    return out;
  };

  await fs.writeFile(
    path.join(runDir, 'request.payload.json'),
    JSON.stringify(sanitize(options.requestPayload), null, 2)
  );
  await fs.writeFile(
    path.join(runDir, 'response.raw.json'),
    JSON.stringify(options.responseRaw, null, 2)
  );
  await fs.writeFile(
    path.join(runDir, 'output.parsed.json'),
    JSON.stringify(options.outputParsed, null, 2)
  );
  await fs.writeFile(
    path.join(runDir, 'meta.json'),
    JSON.stringify(options.meta, null, 2)
  );

  return runDir;
}

/**
 * Generate a short run ID for artifact directories (timestamp + random).
 */
export function generateRunId(): string {
  const t = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const r = Math.random().toString(36).slice(2, 8);
  return `run-${t}-${r}`;
}
