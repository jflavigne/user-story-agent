/**
 * Reusable test harness for patch-based iterations (USA-37, USA-38).
 *
 * Verifies:
 * - Mock advisor response (patches) uses only allowed paths
 * - PatchOrchestrator applies patches successfully
 * - Renderer output changes in the correct sections
 * - Out-of-scope patches are rejected
 */

import { describe, it, expect } from 'vitest';
import { PatchOrchestrator } from '../../../src/agent/patch-orchestrator.js';
import { StoryRenderer } from '../../../src/agent/story-renderer.js';
import { getIterationById } from '../../../src/shared/iteration-registry.js';
import type {
  StoryStructure,
  SectionPatch,
  AdvisorOutput,
  PatchPath,
} from '../../../src/shared/types.js';

/** Minimal story fixture with full implementationNotes for renderer */
const baseStory: StoryStructure = {
  storyStructureVersion: '1',
  systemContextDigest: 'abc',
  generatedAt: '2025-01-01',
  title: 'Login',
  story: { asA: 'user', iWant: 'to log in', soThat: 'I can access the app' },
  userVisibleBehavior: [{ id: 'UVB-001', text: 'See login form' }],
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

/**
 * Reusable harness: apply patches for an iteration and assert metrics and renderer changes.
 * USA-38 can call this with other iteration IDs and mock patches.
 */
export function runPatchBasedIterationHarness(
  iterationId: string,
  advisorOutput: AdvisorOutput,
  initialStory: StoryStructure
): {
  result: StoryStructure;
  markdownBefore: string;
  markdownAfter: string;
  applied: number;
  rejectedPath: number;
  rejectedValidation: number;
} {
  const entry = getIterationById(iterationId);
  if (!entry?.allowedPaths?.length) {
    throw new Error(`Iteration ${iterationId} has no allowedPaths`);
  }

  const orchestrator = new PatchOrchestrator();
  const renderer = new StoryRenderer();

  const markdownBefore = renderer.toMarkdown(initialStory);
  const { result, metrics } = orchestrator.applyPatches(
    initialStory,
    advisorOutput.patches,
    entry.allowedPaths
  );
  const markdownAfter = renderer.toMarkdown(result);

  return {
    result,
    markdownBefore,
    markdownAfter,
    applied: metrics.applied,
    rejectedPath: metrics.rejectedPath,
    rejectedValidation: metrics.rejectedValidation,
  };
}

/**
 * Asserts that every patch path is in the allowed set (for mock data validation).
 */
export function assertOnlyAllowedPaths(
  patches: SectionPatch[],
  allowedPaths: PatchPath[]
): void {
  const allowedSet = new Set(allowedPaths);
  for (const p of patches) {
    expect(allowedSet.has(p.path), `Patch path "${p.path}" must be one of ${allowedPaths.join(', ')}`).toBe(true);
  }
}

describe('patch-based iteration harness (reusable for USA-38)', () => {
  const orchestrator = new PatchOrchestrator();
  const renderer = new StoryRenderer();

  describe('interactive-elements', () => {
    const iterationId = 'interactive-elements';
    const allowedPaths = getIterationById(iterationId)?.allowedPaths ?? [];

    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockResponse: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'userVisibleBehavior',
            item: { id: 'UVB-002', text: 'User can tap Submit button' },
            metadata: { advisorId: 'interactive-elements', reasoning: 'Button documented' },
          },
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-001', text: 'Submit button shows loading state while authenticating' },
            metadata: { advisorId: 'interactive-elements', reasoning: 'Interaction state' },
          },
        ],
      };

      assertOnlyAllowedPaths(mockResponse.patches, allowedPaths);

      const { result, markdownBefore, markdownAfter, applied, rejectedPath } =
        runPatchBasedIterationHarness(iterationId, mockResponse, baseStory);

      expect(applied).toBe(2);
      expect(rejectedPath).toBe(0);

      expect(result.userVisibleBehavior).toHaveLength(2);
      expect(result.userVisibleBehavior[1].id).toBe('UVB-002');
      expect(result.userVisibleBehavior[1].text).toBe('User can tap Submit button');

      expect(result.outcomeAcceptanceCriteria).toHaveLength(1);
      expect(result.outcomeAcceptanceCriteria[0].id).toBe('AC-OUT-001');
      expect(result.outcomeAcceptanceCriteria[0].text).toContain('loading state');

      expect(markdownBefore).not.toContain('User can tap Submit button');
      expect(markdownAfter).toContain('User can tap Submit button');
      expect(markdownAfter).toContain('Submit button shows loading state');
      expect(markdownAfter).toContain('## User-Visible Behavior');
      expect(markdownAfter).toContain('## Acceptance Criteria (Outcome)');
    });

    it('rejects out-of-scope patches (path not in allowedPaths)', () => {
      const patchesWithOutOfScope: SectionPatch[] = [
        {
          op: 'add',
          path: 'userVisibleBehavior',
          item: { id: 'UVB-002', text: 'Allowed' },
          metadata: { advisorId: 'interactive-elements' },
        },
        {
          op: 'add',
          path: 'systemAcceptanceCriteria',
          item: { id: 'AC-SYS-001', text: 'Not allowed for interactive-elements' },
          metadata: { advisorId: 'interactive-elements' },
        },
      ];

      const { result, metrics } = orchestrator.applyPatches(baseStory, patchesWithOutOfScope, allowedPaths);

      expect(metrics.totalPatches).toBe(2);
      expect(metrics.applied).toBe(1);
      expect(metrics.rejectedPath).toBe(1);
      expect(metrics.rejectedReasons.some((r) => r.includes('Path not allowed'))).toBe(true);

      expect(result.userVisibleBehavior).toHaveLength(2);
      expect(result.systemAcceptanceCriteria).toHaveLength(0);
    });

    it('renderer output changes only in userVisibleBehavior and outcomeAcceptanceCriteria', () => {
      const mockResponse: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-001', text: 'Button has focus visible state' },
            metadata: { advisorId: 'interactive-elements' },
          },
        ],
      };

      const { markdownBefore, markdownAfter } = runPatchBasedIterationHarness(
        iterationId,
        mockResponse,
        baseStory
      );

      const beforeSections = {
        uvb: markdownBefore.indexOf('## User-Visible Behavior'),
        outcome: markdownBefore.indexOf('## Acceptance Criteria (Outcome)'),
        system: markdownBefore.indexOf('## Acceptance Criteria (System)'),
      };
      const afterSections = {
        uvb: markdownAfter.indexOf('## User-Visible Behavior'),
        outcome: markdownAfter.indexOf('## Acceptance Criteria (Outcome)'),
        system: markdownAfter.indexOf('## Acceptance Criteria (System)'),
      };

      expect(beforeSections.outcome).toBeGreaterThan(-1);
      expect(afterSections.outcome).toBeGreaterThan(-1);
      expect(markdownAfter).toContain('Button has focus visible state');
      expect(markdownBefore).not.toContain('Button has focus visible state');
      expect(markdownAfter).toContain('# Login');
      expect(markdownAfter).toContain('As a user');
    });
  });
});
