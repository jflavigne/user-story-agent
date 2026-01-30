/**
 * Unit tests for patch-validator.ts
 */

import { describe, it, expect } from 'vitest';
import {
  PatchValidator,
  getExpectedIdPrefix,
  isDuplicateId,
  isStoryLinePath,
  MAX_TEXT_LENGTH,
} from '../../src/agent/patch-validator.js';
import type { StoryStructure, SectionPatch, PatchPath } from '../../src/shared/types.js';

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

describe('getExpectedIdPrefix', () => {
  const prefixCases: Array<{ path: PatchPath; expected: string | null }> = [
    { path: 'story.asA', expected: null },
    { path: 'story.iWant', expected: null },
    { path: 'story.soThat', expected: null },
    { path: 'userVisibleBehavior', expected: 'UVB-' },
    { path: 'outcomeAcceptanceCriteria', expected: 'AC-OUT-' },
    { path: 'systemAcceptanceCriteria', expected: 'AC-SYS-' },
    { path: 'implementationNotes.stateOwnership', expected: 'IMPL-STATE-' },
    { path: 'implementationNotes.dataFlow', expected: 'IMPL-FLOW-' },
    { path: 'implementationNotes.apiContracts', expected: 'IMPL-API-' },
    { path: 'implementationNotes.loadingStates', expected: 'IMPL-LOAD-' },
    { path: 'implementationNotes.performanceNotes', expected: 'IMPL-PERF-' },
    { path: 'implementationNotes.securityNotes', expected: 'IMPL-SEC-' },
    { path: 'implementationNotes.telemetryNotes', expected: 'IMPL-TEL-' },
    { path: 'uiMapping', expected: 'UI-MAP-' },
    { path: 'openQuestions', expected: 'QUESTION-' },
    { path: 'edgeCases', expected: 'EDGE-' },
    { path: 'nonGoals', expected: 'NON-GOAL-' },
  ];

  it.each(prefixCases)('returns $expected for path $path', ({ path, expected }) => {
    expect(getExpectedIdPrefix(path)).toBe(expected);
  });
});

describe('isStoryLinePath', () => {
  it('returns true for story.asA, story.iWant, story.soThat', () => {
    expect(isStoryLinePath('story.asA')).toBe(true);
    expect(isStoryLinePath('story.iWant')).toBe(true);
    expect(isStoryLinePath('story.soThat')).toBe(true);
  });

  it('returns false for array paths', () => {
    expect(isStoryLinePath('userVisibleBehavior')).toBe(false);
    expect(isStoryLinePath('outcomeAcceptanceCriteria')).toBe(false);
    expect(isStoryLinePath('openQuestions')).toBe(false);
  });
});

describe('isDuplicateId', () => {
  it('returns true when id exists in path array', () => {
    expect(isDuplicateId('UVB-001', 'userVisibleBehavior', baseStory)).toBe(true);
  });

  it('returns false when id does not exist in path array', () => {
    expect(isDuplicateId('UVB-002', 'userVisibleBehavior', baseStory)).toBe(false);
  });

  it('returns false when path array is empty or missing', () => {
    expect(isDuplicateId('AC-OUT-001', 'outcomeAcceptanceCriteria', baseStory)).toBe(false);
    expect(isDuplicateId('QUESTION-001', 'openQuestions', baseStory)).toBe(false);
  });
});

describe('PatchValidator', () => {
  const validator = new PatchValidator();

  describe('required fields', () => {
    it('validates add patch with path, item.id, item.text and metadata.advisorId', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002', text: 'Submit credentials' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });

    it('rejects patch without metadata.advisorId', () => {
      const patch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002', text: 'x' },
        metadata: {},
      } as unknown as SectionPatch;
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Patch must have path and metadata.advisorId');
    });

    it('rejects add without item.id for array path', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: '', text: 'Some text' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('item.id'))).toBe(true);
    });

    it('rejects add without item.text for array path', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002', text: '   ' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('item.text'))).toBe(true);
    });

    it('accepts story line replace with only item.text', () => {
      const patch: SectionPatch = {
        op: 'replace',
        path: 'story.asA',
        item: { id: 'ignored', text: 'logged-in user' },
        match: { textEquals: 'user' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });
  });

  describe('ID format and prefix', () => {
    it('rejects id that does not match expected prefix for path', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'AC-OUT-001', text: 'Wrong prefix' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('UVB-') && e.includes('userVisibleBehavior'))).toBe(
        true
      );
    });

    it('rejects id with invalid characters', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002!', text: 'Invalid id' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('alphanumeric'))).toBe(true);
    });

    it('accepts id with expected prefix for outcomeAcceptanceCriteria', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'outcomeAcceptanceCriteria',
        item: { id: 'AC-OUT-001', text: 'User sees confirmation' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });

    it('accepts id with expected prefix for implementationNotes paths', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'implementationNotes.stateOwnership',
        item: { id: 'IMPL-STATE-001', text: 'Client owns form state' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });
  });

  describe('duplicate IDs', () => {
    it('rejects duplicate id on add', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-001', text: 'Duplicate' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('Duplicate'))).toBe(true);
    });
  });

  describe('text length bounds', () => {
    it('rejects item.text longer than MAX_TEXT_LENGTH', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: {
          id: 'UVB-002',
          text: 'x'.repeat(MAX_TEXT_LENGTH + 1),
        },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes(`${MAX_TEXT_LENGTH}`))).toBe(true);
    });

    it('accepts item.text exactly MAX_TEXT_LENGTH', () => {
      const patch: SectionPatch = {
        op: 'add',
        path: 'userVisibleBehavior',
        item: {
          id: 'UVB-002',
          text: 'x'.repeat(MAX_TEXT_LENGTH),
        },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });

    it('rejects story line text longer than MAX_TEXT_LENGTH', () => {
      const patch: SectionPatch = {
        op: 'replace',
        path: 'story.asA',
        item: { id: 'x', text: 'y'.repeat(MAX_TEXT_LENGTH + 1) },
        match: { textEquals: 'user' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes(`${MAX_TEXT_LENGTH}`))).toBe(true);
    });
  });

  describe('replace/remove match', () => {
    it('rejects replace without match.id or match.textEquals', () => {
      const patch: SectionPatch = {
        op: 'replace',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-001', text: 'Updated' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('match'))).toBe(true);
    });

    it('rejects replace when no matching item in array', () => {
      const patch: SectionPatch = {
        op: 'replace',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-001', text: 'Updated' },
        match: { id: 'UVB-999' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.includes('No matching item'))).toBe(true);
    });

    it('accepts replace when match.id exists in array', () => {
      const patch: SectionPatch = {
        op: 'replace',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-001', text: 'Updated text' },
        match: { id: 'UVB-001' },
        metadata: { advisorId: 'test' },
      };
      const result = validator.validate(patch, baseStory);
      expect(result.valid).toBe(true);
    });

    it('rejects remove on story line paths (asA, iWant, soThat)', () => {
      for (const path of ['story.asA', 'story.iWant', 'story.soThat'] as const) {
        const patch: SectionPatch = {
          op: 'remove',
          path,
          metadata: { advisorId: 'test' },
        };
        const result = validator.validate(patch, baseStory);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'remove operation not supported on story line paths (use replace instead)'
        );
      }
    });
  });
});
