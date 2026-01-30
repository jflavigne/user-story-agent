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
  rejectedReasons: string[];
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
    rejectedReasons: metrics.rejectedReasons,
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

  describe('user-roles iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'replace',
            path: 'story.asA',
            item: { id: 'role-1', text: 'registered user' },
            metadata: { advisorId: 'user-roles' },
          },
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'Role-specific access criterion' },
            metadata: { advisorId: 'user-roles' },
          },
        ],
      };
      const allowedPaths = getIterationById('user-roles')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('user-roles', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.story.asA).toBe('registered user');
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('registered user');
      expect(result.markdownAfter).toContain('Role-specific access criterion');
    });
  });

  describe('validation iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'Email format validated on blur' },
            metadata: { advisorId: 'validation' },
          },
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'System shows error for invalid email' },
            metadata: { advisorId: 'validation' },
          },
        ],
      };
      const allowedPaths = getIterationById('validation')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('validation', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Email format validated on blur');
      expect(result.markdownAfter).toContain('System shows error for invalid email');
    });
  });

  describe('accessibility iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'All controls focusable via keyboard' },
            metadata: { advisorId: 'accessibility' },
          },
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Focus order follows visual order' },
            metadata: { advisorId: 'accessibility' },
          },
        ],
      };
      const allowedPaths = getIterationById('accessibility')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('accessibility', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('All controls focusable via keyboard');
      expect(result.markdownAfter).toContain('Focus order follows visual order');
    });
  });

  describe('performance iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Page shows skeleton within 200ms' },
            metadata: { advisorId: 'performance' },
          },
          {
            op: 'add',
            path: 'implementationNotes.performanceNotes',
            item: { id: 'IMPL-PERF-001', text: 'LCP target under 2.5s' },
            metadata: { advisorId: 'performance' },
          },
        ],
      };
      const allowedPaths = getIterationById('performance')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('performance', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.implementationNotes.performanceNotes).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Page shows skeleton within 200ms');
      expect(result.markdownAfter).toContain('LCP target under 2.5s');
    });
  });

  describe('security iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Login form served over HTTPS' },
            metadata: { advisorId: 'security' },
          },
          {
            op: 'add',
            path: 'implementationNotes.securityNotes',
            item: { id: 'IMPL-SEC-001', text: 'Sensitive fields not logged' },
            metadata: { advisorId: 'security' },
          },
        ],
      };
      const allowedPaths = getIterationById('security')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('security', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.implementationNotes.securityNotes).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Login form served over HTTPS');
      expect(result.markdownAfter).toContain('Sensitive fields not logged');
    });
  });

  describe('responsive-web iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'userVisibleBehavior',
            item: { id: 'UVB-NEW', text: 'Hamburger menu on viewport under 768px' },
            metadata: { advisorId: 'responsive-web' },
          },
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Touch targets at least 44px' },
            metadata: { advisorId: 'responsive-web' },
          },
        ],
      };
      const allowedPaths = getIterationById('responsive-web')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('responsive-web', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.userVisibleBehavior).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Hamburger menu on viewport under 768px');
      expect(result.markdownAfter).toContain('Touch targets at least 44px');
    });
  });

  describe('responsive-native iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'userVisibleBehavior',
            item: { id: 'UVB-NEW', text: 'Biometric auth option on supported devices' },
            metadata: { advisorId: 'responsive-native' },
          },
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Offline queue syncs when online' },
            metadata: { advisorId: 'responsive-native' },
          },
        ],
      };
      const allowedPaths = getIterationById('responsive-native')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('responsive-native', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.userVisibleBehavior).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Biometric auth option on supported devices');
      expect(result.markdownAfter).toContain('Offline queue syncs when online');
    });
  });

  describe('language-support iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'UI language switch persists across sessions' },
            metadata: { advisorId: 'language-support' },
          },
        ],
      };
      const allowedPaths = getIterationById('language-support')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('language-support', mockOutput, baseStory);
      expect(result.applied).toBe(1);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.markdownAfter).toContain('UI language switch persists across sessions');
    });
  });

  describe('locale-formatting iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'Dates shown in user locale format' },
            metadata: { advisorId: 'locale-formatting' },
          },
        ],
      };
      const allowedPaths = getIterationById('locale-formatting')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('locale-formatting', mockOutput, baseStory);
      expect(result.applied).toBe(1);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.markdownAfter).toContain('Dates shown in user locale format');
    });
  });

  describe('cultural-appropriateness iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'outcomeAcceptanceCriteria',
            item: { id: 'AC-OUT-NEW', text: 'Icons avoid culture-specific gestures' },
            metadata: { advisorId: 'cultural-appropriateness' },
          },
        ],
      };
      const allowedPaths = getIterationById('cultural-appropriateness')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('cultural-appropriateness', mockOutput, baseStory);
      expect(result.applied).toBe(1);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.outcomeAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.markdownAfter).toContain('Icons avoid culture-specific gestures');
    });
  });

  describe('analytics iteration', () => {
    it('applies mock advisor patches and only allowed paths are used', () => {
      const mockOutput: AdvisorOutput = {
        patches: [
          {
            op: 'add',
            path: 'systemAcceptanceCriteria',
            item: { id: 'AC-SYS-NEW', text: 'Submit events tracked with context' },
            metadata: { advisorId: 'analytics' },
          },
          {
            op: 'add',
            path: 'implementationNotes.telemetryNotes',
            item: { id: 'IMPL-TEL-001', text: 'No PII in event payloads' },
            metadata: { advisorId: 'analytics' },
          },
        ],
      };
      const allowedPaths = getIterationById('analytics')?.allowedPaths ?? [];
      assertOnlyAllowedPaths(mockOutput.patches, allowedPaths);
      const result = runPatchBasedIterationHarness('analytics', mockOutput, baseStory);
      expect(result.applied).toBe(2);
      expect(result.rejectedPath).toBe(0);
      expect(result.result.systemAcceptanceCriteria).toContainEqual(mockOutput.patches[0].item);
      expect(result.result.implementationNotes.telemetryNotes).toContainEqual(mockOutput.patches[1].item);
      expect(result.markdownAfter).toContain('Submit events tracked with context');
      expect(result.markdownAfter).toContain('No PII in event payloads');
    });
  });
});
