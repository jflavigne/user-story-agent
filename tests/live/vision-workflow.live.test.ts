/**
 * Tier 3 - Live vision workflow tests.
 * Skip unless RUN_LIVE_VISION_TESTS=1; require ANTHROPIC_API_KEY.
 * Saves artifacts to tests/fixtures/runs/<run-id>/.
 * Soft assertions only.
 */

import { describe, it, expect, beforeAll } from 'vitest';
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

function gatherTextFromWorkflow(result: {
  systemContext?: { componentGraph?: { components?: Record<string, { description?: string; productName?: string }> } };
  stories?: Array<{ content?: string }>;
}): string {
  const parts: string[] = [];
  const comps = result.systemContext?.componentGraph?.components;
  if (comps && typeof comps === 'object') {
    for (const c of Object.values(comps)) {
      if (c?.description) parts.push(c.description);
      if (c?.productName) parts.push(c.productName);
    }
  }
  if (Array.isArray(result.stories)) {
    for (const s of result.stories) {
      if (s?.content) parts.push(s.content);
    }
  }
  return parts.join(' ');
}

describe.skipIf(!RUN_LIVE || !HAS_API_KEY)('vision-workflow (live)', () => {
  let runId: string;

  beforeAll(() => {
    runId = generateRunId();
  });

  it('runs system workflow with mockup image', async () => {
    const config: UserStoryAgentConfig = {
      mode: 'system-workflow',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: DEFAULT_MODEL,
      productContext: { productType: 'web' },
      mockupImages: [{ path: 'tests/fixtures/figma-filter-components.png' }],
    };
    const agent = new UserStoryAgent(config);
    const result = await agent.runSystemWorkflow([
      'As a user I want to open a filter drawer, use accordion sections and checkboxes, then apply or clear all.',
    ]);

    expect(result).toBeDefined();
    expect(result.systemContext).toBeDefined();
    expect(result.systemContext.componentGraph).toBeDefined();
    expect(result.stories).toBeDefined();
    expect(Array.isArray(result.stories)).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(Array.isArray(result.metadata.passesCompleted)).toBe(true);

    const text = gatherTextFromWorkflow(result);
    const componentCount = countComponentsMatchingSynonyms(text);
    const anchorCount = countEvidenceAnchors(text);
    expect(componentCount).toBeGreaterThanOrEqual(0);
    expect(anchorCount).toBeGreaterThanOrEqual(0);

    const requestPayload = {
      systemWorkflow: true,
      storiesCount: 1,
      hasMockupImage: true,
    };
    const responseRaw = {
      systemContext: result.systemContext,
      storiesCount: result.stories?.length ?? 0,
      metadata: result.metadata,
    };
    await saveArtifacts({
      runId,
      requestPayload,
      responseRaw,
      outputParsed: {
        systemContext: result.systemContext,
        stories: result.stories,
        metadata: result.metadata,
      },
      meta: {
        model: DEFAULT_MODEL,
        temperature: 0,
        timestamp: new Date().toISOString(),
        commitSha: process.env.GIT_SHA ?? undefined,
      },
    });
  });
});
