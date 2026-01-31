/**
 * Tier 2B - Recorded integration tests: vision iterations golden.
 * Load golden JSON, assert schema, synonym matching (>= 4), evidence anchors (>= 3).
 * No live API calls.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IterationOutputSchema } from '../../src/shared/schemas.js';
import {
  countComponentsMatchingSynonyms,
  countEvidenceAnchors,
} from '../helpers/vision-test-utils.js';

const GOLDEN_PATH = path.resolve(
  process.cwd(),
  'tests/fixtures/goldens/vision-iterations.golden.json'
);

function gatherTextForAssertions(golden: { enhancedStory?: string; changesApplied?: Array<{ description?: string }> }): string {
  const parts: string[] = [];
  if (golden.enhancedStory) parts.push(golden.enhancedStory);
  if (Array.isArray(golden.changesApplied)) {
    for (const c of golden.changesApplied) {
      if (c.description) parts.push(c.description);
    }
  }
  return parts.join(' ');
}

describe('vision-iterations (recorded)', () => {
  it('loads golden and has required schema fields', async () => {
    const raw = await fs.readFile(GOLDEN_PATH, 'utf-8');
    const json = JSON.parse(raw);
    const parsed = IterationOutputSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const data = parsed.data;
    expect(data.enhancedStory).toBeDefined();
    expect(data.enhancedStory.length).toBeGreaterThan(0);
    expect(Array.isArray(data.changesApplied)).toBe(true);
  });

  it('has at least 4 components matching synonym map', async () => {
    const raw = await fs.readFile(GOLDEN_PATH, 'utf-8');
    const golden = JSON.parse(raw);
    const text = gatherTextForAssertions(golden);
    const count = countComponentsMatchingSynonyms(text);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('has at least 3 evidence anchors', async () => {
    const raw = await fs.readFile(GOLDEN_PATH, 'utf-8');
    const golden = JSON.parse(raw);
    const text = gatherTextForAssertions(golden);
    const count = countEvidenceAnchors(text);
    expect(count).toBeGreaterThanOrEqual(3);
  });
});
