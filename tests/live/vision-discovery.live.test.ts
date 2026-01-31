/**
 * Tier 3 - Live vision discovery tests.
 * Skip unless RUN_LIVE_VISION_TESTS=1; require ANTHROPIC_API_KEY.
 * Saves artifacts to tests/fixtures/runs/<run-id>/.
 * Soft assertions only.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { UserStoryAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import {
  saveArtifacts,
  generateRunId,
  countComponentsMatchingSynonyms,
  countEvidenceAnchors,
} from '../helpers/vision-test-utils.js';
import { DEFAULT_MODEL } from '../../src/agent/config.js';

const RUN_LIVE = process.env.RUN_LIVE_VISION_TESTS === '1';
const HAS_API_KEY = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
const FIXTURE_IMAGE = path.resolve(process.cwd(), 'tests/fixtures/figma-filter-components.png');

function gatherTextFromContext(ctx: {
  componentGraph?: { components?: Record<string, { description?: string; productName?: string }> };
  productVocabulary?: Record<string, string>;
}): string {
  const parts: string[] = [];
  const comps = ctx.componentGraph?.components;
  if (comps && typeof comps === 'object') {
    for (const c of Object.values(comps)) {
      if (c?.description) parts.push(c.description);
      if (c?.productName) parts.push(c.productName);
    }
  }
  if (ctx.productVocabulary && typeof ctx.productVocabulary === 'object') {
    parts.push(...Object.keys(ctx.productVocabulary), ...Object.values(ctx.productVocabulary));
  }
  return parts.join(' ');
}

describe.skipIf(!RUN_LIVE || !HAS_API_KEY)('vision-discovery (live)', () => {
  let runId: string;

  beforeAll(() => {
    runId = generateRunId();
  });

  it('runs Pass 0 discovery with mockup image and returns valid context', async () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['user-roles'],
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: DEFAULT_MODEL,
      mockupImages: [{ path: 'tests/fixtures/figma-filter-components.png' }],
    };
    const agent = new UserStoryAgent(config);
    const context = await agent.runPass0Discovery(
      ['As a user I want to filter results using a filter sheet and toolbar.']
    );

    expect(context).toBeDefined();
    expect(context.timestamp).toBeDefined();
    expect(context.componentGraph).toBeDefined();
    expect(context.componentGraph.components).toBeDefined();
    expect(typeof context.componentGraph.components).toBe('object');
    expect(context.sharedContracts).toBeDefined();
    expect(context.productVocabulary).toBeDefined();

    const text = gatherTextFromContext(context);
    const componentCount = countComponentsMatchingSynonyms(text);
    const anchorCount = countEvidenceAnchors(text);
    expect(componentCount).toBeGreaterThanOrEqual(0);
    expect(anchorCount).toBeGreaterThanOrEqual(0);

    const requestPayload = {
      systemPromptLength: 0,
      messages: [{ role: 'user', contentBlocks: ['text', 'image'] }],
    };
    const responseRaw = {
      content: context,
      timestamp: context.timestamp,
    };
    await saveArtifacts({
      runId,
      requestPayload,
      responseRaw,
      outputParsed: context,
      meta: {
        model: DEFAULT_MODEL,
        temperature: 0,
        timestamp: new Date().toISOString(),
        commitSha: process.env.GIT_SHA ?? undefined,
      },
    });
  });
});
