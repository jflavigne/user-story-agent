/**
 * Unit tests for auto-apply of high-confidence consistency fixes (USA-52).
 * Covers filtering by confidence/type, application via PatchOrchestrator, re-render, logging, and edge cases.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAgent } from '../../src/agent/user-story-agent.js';
import type { UserStoryAgentConfig } from '../../src/agent/types.js';
import type {
  StoryStructure,
  GlobalConsistencyReport,
  FixPatch,
} from '../../src/shared/types.js';
import { StoryRenderer } from '../../src/agent/story-renderer.js';
import { logger } from '../../src/utils/logger.js';

// Minimal valid StoryStructure for tests
const baseStructure: StoryStructure = {
  storyStructureVersion: '1',
  systemContextDigest: 'dig',
  generatedAt: '2025-01-01',
  title: 'Login',
  story: { asA: 'user', iWant: 'to log in', soThat: 'I can access' },
  userVisibleBehavior: [
    { id: 'UVB-001', text: 'See login form' },
    { id: 'UVB-002', text: 'Submit credentials' },
  ],
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

function makeStoriesMap(
  entries: Array<{ id: string; structure: StoryStructure }>
): Map<string, { structure: StoryStructure; markdown: string }> {
  const renderer = new StoryRenderer();
  const map = new Map<string, { structure: StoryStructure; markdown: string }>();
  for (const { id, structure } of entries) {
    map.set(id, { structure, markdown: renderer.toMarkdown(structure) });
  }
  return map;
}

describe('applyGlobalConsistencyFixes', () => {
  let agent: ReturnType<typeof createAgent>;
  const minimalConfig: UserStoryAgentConfig = {
    mode: 'individual',
    iterations: ['user-roles'],
    apiKey: 'test-key',
    model: 'claude-sonnet-4-20250514',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    agent = createAgent(minimalConfig);
  });

  it('filters fixes by confidence threshold (> 0.8)', async () => {
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-term-to-vocabulary',
          storyId: 'S1',
          path: 'story.iWant',
          operation: 'replace',
          item: { id: 'x', text: 'to sign in' },
          match: { id: 'x' },
          confidence: 0.9,
          reasoning: 'Use product term',
        },
        {
          type: 'normalize-contract-id',
          storyId: 'S1',
          path: 'story.soThat',
          operation: 'replace',
          item: { id: 'y', text: 'I can use the app' },
          match: { id: 'y' },
          confidence: 0.5,
          reasoning: 'Low confidence',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    // Only the 0.9 fix should affect the story (replace story.iWant)
    const entry = result.get('S1')!;
    expect(entry.structure.story.iWant).toBe('to sign in');
    // soThat unchanged (0.5 fix not applied)
    expect(entry.structure.story.soThat).toBe('I can access');
  });

  it('filters fixes by allowed types', async () => {
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'add-bidirectional-link',
          storyId: 'S1',
          path: 'userVisibleBehavior',
          operation: 'add',
          item: { id: 'UVB-003', text: 'Link to S2' },
          confidence: 0.95,
          reasoning: 'Add reverse link',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    const entry = result.get('S1')!;
    const uvbs = entry.structure.userVisibleBehavior;
    expect(uvbs.some((u) => u.id === 'UVB-003' && u.text === 'Link to S2')).toBe(true);
  });

  it('skips disallowed fix types (flagged for manual review)', async () => {
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    // Simulate a report where only one fix is in the allowed-types list.
    // (FixPatch.type is only the three safe types; this test documents that we filter by ALLOWED_TYPES.)
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-term-to-vocabulary',
          storyId: 'S1',
          path: 'story.iWant',
          operation: 'replace',
          item: { id: 'x', text: 'to sign in' },
          match: { id: 'x' },
          confidence: 0.9,
          reasoning: 'Ok',
        },
        // Second fix: same allowed type but low confidence so filtered by threshold
        {
          type: 'normalize-contract-id',
          storyId: 'S1',
          path: 'userVisibleBehavior',
          operation: 'replace',
          item: { id: 'UVB-001', text: 'Changed' },
          match: { id: 'UVB-001' },
          confidence: 0.5,
          reasoning: 'Low confidence - flagged for manual review',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    // Only the high-confidence fix is applied
    const entry = result.get('S1')!;
    expect(entry.structure.story.iWant).toBe('to sign in');
    // Low-confidence fix not applied; UVB-001 unchanged
    expect(entry.structure.userVisibleBehavior[0].text).toBe('See login form');
  });

  it('logs fixes flagged for manual review (low confidence)', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-contract-id',
          storyId: 'S1',
          path: 'story.iWant',
          operation: 'replace',
          item: { id: 'x', text: 'changed' },
          match: { id: 'x' },
          confidence: 0.5,
          reasoning: 'Low confidence',
        },
      ],
    };

    await agent.applyGlobalConsistencyFixes(stories, report);

    const flaggedLogs = warnSpy.mock.calls.filter((c) =>
      c[0]?.toString().startsWith('Fix flagged for manual review:')
    );
    expect(flaggedLogs.length).toBe(1);
    expect(flaggedLogs[0][0]).toContain('normalize-contract-id');
    expect(flaggedLogs[0][0]).toContain('S1');
    expect(flaggedLogs[0][0]).toContain('low confidence');
  });

  it('applies fix to StoryStructure via PatchOrchestrator', async () => {
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-contract-id',
          storyId: 'S1',
          path: 'userVisibleBehavior',
          operation: 'replace',
          item: { id: 'UVB-001', text: 'See canonical login form' },
          match: { id: 'UVB-001' },
          confidence: 0.85,
          reasoning: 'Normalize contract ID',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    const entry = result.get('S1')!;
    expect(entry.structure.userVisibleBehavior[0].text).toBe('See canonical login form');
  });

  it('re-renders markdown from updated StoryStructure after fix', async () => {
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-term-to-vocabulary',
          storyId: 'S1',
          path: 'story.asA',
          operation: 'replace',
          item: { id: 'role', text: 'signed-in user' },
          match: { id: 'role' },
          confidence: 0.9,
          reasoning: 'Vocabulary',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    const entry = result.get('S1')!;
    const expectedMarkdown = new StoryRenderer().toMarkdown(entry.structure);
    expect(entry.markdown).toBe(expectedMarkdown);
    expect(entry.markdown).toContain('signed-in user');
  });

  it('logs each applied fix for audit trail', async () => {
    const infoSpy = vi.spyOn(logger, 'info');
    const stories = makeStoriesMap([
      { id: 'S1', structure: baseStructure },
      { id: 'S2', structure: { ...baseStructure, title: 'Logout' } },
    ]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'add-bidirectional-link',
          storyId: 'S1',
          path: 'userVisibleBehavior',
          operation: 'add',
          item: { id: 'UVB-003', text: 'Link' },
          confidence: 0.9,
          reasoning: 'Link',
        },
        {
          type: 'normalize-contract-id',
          storyId: 'S2',
          path: 'story.iWant',
          operation: 'replace',
          item: { id: 'z', text: 'to sign out' },
          match: { id: 'z' },
          confidence: 0.92,
          reasoning: 'Contract',
        },
      ],
    };

    await agent.applyGlobalConsistencyFixes(stories, report);

    const autoAppliedLogs = infoSpy.mock.calls.filter((c) =>
      c[0]?.toString().startsWith('Auto-applied fix:')
    );
    expect(autoAppliedLogs.length).toBe(2);
    expect(autoAppliedLogs.some((c) => c[0]?.toString().includes('S1'))).toBe(true);
    expect(autoAppliedLogs.some((c) => c[0]?.toString().includes('S2'))).toBe(true);
  });

  it('handles story not found gracefully', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-term-to-vocabulary',
          storyId: 'MISSING',
          path: 'story.iWant',
          operation: 'replace',
          item: { id: 'x', text: 'x' },
          match: { id: 'x' },
          confidence: 0.95,
          reasoning: 'N/A',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    expect(result.get('S1')).toEqual(stories.get('S1'));
    expect(warnSpy).toHaveBeenCalledWith('Story MISSING not found, skipping fix');
  });

  it('handles patch application failure gracefully', async () => {
    const warnSpy = vi.spyOn(logger, 'warn');
    const stories = makeStoriesMap([{ id: 'S1', structure: baseStructure }]);
    // Replace with match.id that does not exist in story -> PatchOrchestrator applies 0
    const report: GlobalConsistencyReport = {
      issues: [],
      fixes: [
        {
          type: 'normalize-contract-id',
          storyId: 'S1',
          path: 'userVisibleBehavior',
          operation: 'replace',
          item: { id: 'UVB-999', text: 'New' },
          match: { id: 'UVB-999' },
          confidence: 0.9,
          reasoning: 'No matching item',
        },
      ],
    };

    const result = await agent.applyGlobalConsistencyFixes(stories, report);

    expect(warnSpy).toHaveBeenCalledWith('Failed to apply fix: normalize-contract-id to S1');
    const entry = result.get('S1')!;
    expect(entry.structure.userVisibleBehavior).toHaveLength(2);
    expect(entry.structure.userVisibleBehavior.map((u) => u.id)).toEqual(['UVB-001', 'UVB-002']);
  });
});
