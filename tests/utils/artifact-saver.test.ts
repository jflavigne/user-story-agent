/**
 * Unit tests for ArtifactSaver incremental saving and API logging.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ArtifactSaver } from '../../src/utils/artifact-saver.js';
import type { StoryStructure } from '../../src/shared/types.js';

describe('ArtifactSaver - Incremental Saving', () => {
  let tmpDir: string;
  let saver: ArtifactSaver;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'artifact-test-'));
    saver = new ArtifactSaver({ baseDir: tmpDir, projectName: 'test' });
    await saver.initialize();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('saves story incrementally after each completion', async () => {
    const mockStructure: StoryStructure = {
      storyStructureVersion: '1.0',
      systemContextDigest: '',
      generatedAt: new Date().toISOString(),
      title: 'Test Story',
      story: { asA: 'user', iWant: 'to test', soThat: 'it works' },
      userVisibleBehavior: [],
      outcomeAcceptanceCriteria: [],
      systemAcceptanceCriteria: [],
      implementationNotes: {
        stateOwnership: [],
        dataFlow: [],
        apiContracts: [],
        loadingStates: [],
        performanceNotes: [],
        securityNotes: [],
        telemetryNotes: [],
      },
    };
    const mockResult = {
      enhancedStory: '# Test Story\n\nAs a user...',
      structure: mockStructure,
      iterationResults: [
        {
          iterationId: 'user-roles',
          inputStory: '',
          outputStory: 'test',
          changesApplied: [],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await saver.saveStoryIncremental('button', 1, mockResult);

    const runDir = saver.getRunDir();
    const storyDir = path.join(runDir, 'stories', 'button', 'round-1');

    const storyMd = await fs.readFile(path.join(storyDir, 'story.md'), 'utf-8');
    expect(storyMd).toContain('# Test Story');

    const structure = JSON.parse(
      await fs.readFile(path.join(storyDir, 'structure.json'), 'utf-8')
    );
    expect(structure.title).toBe('Test Story');

    const iterations = JSON.parse(
      await fs.readFile(path.join(storyDir, 'iterations.json'), 'utf-8')
    );
    expect(iterations).toHaveLength(1);
  });

  it('saves API request/response pairs', async () => {
    await saver.saveAPIRequest('req-123', {
      model: 'haiku',
      systemPromptLength: 1000,
      userMessageLength: 500,
      timestamp: new Date().toISOString(),
    });

    await saver.saveAPIResponse('req-123', {
      model: 'haiku',
      inputTokens: 250,
      outputTokens: 100,
      contentLength: 500,
      timestamp: new Date().toISOString(),
    });

    const runDir = saver.getRunDir();
    const apiDir = path.join(runDir, 'api-calls');

    const reqExists = await fs
      .access(path.join(apiDir, 'req-req-123.json'))
      .then(() => true)
      .catch(() => false);
    const respExists = await fs
      .access(path.join(apiDir, 'resp-req-123.json'))
      .then(() => true)
      .catch(() => false);

    expect(reqExists).toBe(true);
    expect(respExists).toBe(true);
  });

  it('handles partial results gracefully', async () => {
    const mockResult = {
      enhancedStory: '# Partial Story',
    };

    await saver.saveStoryIncremental('partial', 1, mockResult);

    const runDir = saver.getRunDir();
    const storyDir = path.join(runDir, 'stories', 'partial', 'round-1');

    const storyMd = await fs.readFile(path.join(storyDir, 'story.md'), 'utf-8');
    expect(storyMd).toContain('# Partial Story');

    const structureExists = await fs
      .access(path.join(storyDir, 'structure.json'))
      .then(() => true)
      .catch(() => false);
    expect(structureExists).toBe(false);
  });
});
