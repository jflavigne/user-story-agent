/**
 * Tier 3 - Live vision iterations tests.
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

describe.skipIf(!RUN_LIVE || !HAS_API_KEY)('vision-iterations (live)', () => {
  let runId: string;

  beforeAll(() => {
    runId = generateRunId();
  });

  it('runs interactive-elements iteration with mockup image', async () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['interactive-elements'],
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: DEFAULT_MODEL,
      mockupImages: [{ path: 'tests/fixtures/figma-filter-components.png' }],
    };
    const agent = new UserStoryAgent(config);
    const result = await agent.processUserStory(
      'As a user I want to open a filter sheet and select options.'
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(typeof result.enhancedStory).toBe('string');
    expect(Array.isArray(result.appliedIterations)).toBe(true);
    expect(Array.isArray(result.iterationResults)).toBe(true);

    if (result.success && result.enhancedStory) {
      const componentCount = countComponentsMatchingSynonyms(result.enhancedStory);
      const anchorCount = countEvidenceAnchors(result.enhancedStory);
      expect(componentCount).toBeGreaterThanOrEqual(0);
      expect(anchorCount).toBeGreaterThanOrEqual(0);
    }

    const requestPayload = {
      systemPromptLength: 0,
      messages: [{ role: 'user', contentBlocks: ['text', 'image'] }],
    };
    const responseRaw = {
      success: result.success,
      enhancedStoryLength: result.enhancedStory?.length ?? 0,
      appliedIterations: result.appliedIterations,
      iterationResultsCount: result.iterationResults?.length ?? 0,
    };
    await saveArtifacts({
      runId,
      requestPayload,
      responseRaw,
      outputParsed: {
        success: result.success,
        enhancedStory: result.enhancedStory,
        appliedIterations: result.appliedIterations,
        iterationResults: result.iterationResults,
      },
      meta: {
        model: DEFAULT_MODEL,
        temperature: 0,
        timestamp: new Date().toISOString(),
        commitSha: process.env.GIT_SHA ?? undefined,
      },
    });
  });

  it('runs validation iteration with mockup image', async () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['validation'],
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: DEFAULT_MODEL,
      mockupImages: [{ path: 'tests/fixtures/figma-filter-components.png' }],
    };
    const agent = new UserStoryAgent(config);
    const result = await agent.processUserStory(
      'As a user I want to apply filters and see validation feedback.'
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(typeof result.enhancedStory).toBe('string');
  });

  it('runs accessibility iteration with mockup image', async () => {
    const config: UserStoryAgentConfig = {
      mode: 'individual',
      iterations: ['accessibility'],
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: DEFAULT_MODEL,
      mockupImages: [{ path: 'tests/fixtures/figma-filter-components.png' }],
    };
    const agent = new UserStoryAgent(config);
    const result = await agent.processUserStory(
      'As a user I want to use the filter UI with a screen reader.'
    );

    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(typeof result.enhancedStory).toBe('string');
  });
});
