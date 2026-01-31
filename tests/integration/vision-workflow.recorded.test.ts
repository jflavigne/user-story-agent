/**
 * Tier 2B - Recorded integration tests: vision workflow golden.
 * Load golden JSON, assert schema, synonym matching (>= 4), evidence anchors (>= 3).
 * No live API calls.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  countComponentsMatchingSynonyms,
  countEvidenceAnchors,
} from '../helpers/vision-test-utils.js';

const GOLDEN_PATH = path.resolve(
  process.cwd(),
  'tests/fixtures/goldens/vision-workflow.golden.json'
);

function gatherTextForAssertions(golden: {
  systemContext?: { componentGraph?: { components?: Record<string, { description?: string; productName?: string }> } };
  stories?: Array<{ content?: string }>;
}): string {
  const parts: string[] = [];
  const comps = golden.systemContext?.componentGraph?.components;
  if (comps && typeof comps === 'object') {
    for (const c of Object.values(comps)) {
      if (c.description) parts.push(c.description);
      if (c.productName) parts.push(c.productName);
    }
  }
  if (Array.isArray(golden.stories)) {
    for (const s of golden.stories) {
      if (s.content) parts.push(s.content);
    }
  }
  return parts.join(' ');
}

describe('vision-workflow (recorded)', () => {
  it('loads golden and has required structure', async () => {
    const raw = await fs.readFile(GOLDEN_PATH, 'utf-8');
    const golden = JSON.parse(raw);
    expect(golden.systemContext).toBeDefined();
    expect(golden.systemContext.componentGraph).toBeDefined();
    expect(golden.systemContext.componentGraph.components).toBeDefined();
    expect(golden.stories).toBeDefined();
    expect(Array.isArray(golden.stories)).toBe(true);
    expect(golden.stories.length).toBeGreaterThanOrEqual(1);
    expect(golden.stories[0].id).toBeDefined();
    expect(golden.stories[0].content).toBeDefined();
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
