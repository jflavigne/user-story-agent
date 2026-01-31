/**
 * Tier 2B - Recorded integration tests: vision discovery golden.
 * Load golden JSON, assert schema, synonym matching (>= 4), evidence anchors (>= 3).
 * No live API calls.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { SystemDiscoveryMentionsSchema } from '../../src/shared/schemas.js';
import {
  countComponentsMatchingSynonyms,
  countEvidenceAnchors,
} from '../helpers/vision-test-utils.js';

const GOLDEN_PATH = path.resolve(
  process.cwd(),
  'tests/fixtures/goldens/vision-discovery.golden.json'
);

function gatherTextForAssertions(golden: {
  mentions?: { components?: string[] };
  evidence?: Record<string, string>;
  vocabulary?: Record<string, string>;
}): string {
  const parts: string[] = [];
  if (golden.mentions?.components?.length) {
    parts.push(golden.mentions.components.join(' '));
  }
  if (golden.evidence) {
    parts.push(...Object.values(golden.evidence));
  }
  if (golden.vocabulary) {
    parts.push(...Object.keys(golden.vocabulary), ...Object.values(golden.vocabulary));
  }
  return parts.join(' ');
}

describe('vision-discovery (recorded)', () => {
  it('loads golden and has required schema fields', async () => {
    const raw = await fs.readFile(GOLDEN_PATH, 'utf-8');
    const json = JSON.parse(raw);
    const parsed = SystemDiscoveryMentionsSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const data = parsed.data;
    expect(data.mentions).toBeDefined();
    expect(data.mentions.components).toBeDefined();
    expect(Array.isArray(data.mentions.components)).toBe(true);
    expect(data.canonicalNames).toBeDefined();
    expect(data.evidence).toBeDefined();
    expect(data.vocabulary).toBeDefined();
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
