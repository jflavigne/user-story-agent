/**
 * Unit tests for patch-orchestrator.ts
 */

import { describe, it, expect } from 'vitest';
import { PatchValidator, PatchOrchestrator } from '../../src/agent/patch-orchestrator.js';
import type { StoryStructure, SectionPatch } from '../../src/shared/types.js';

const baseStory: StoryStructure = {
  storyStructureVersion: '1',
  systemContextDigest: 'abc',
  generatedAt: '2025-01-01',
  title: 'Login',
  story: { asA: 'user', iWant: 'to log in', soThat: 'I can access the app' },
  userVisibleBehavior: [{ id: 'UVB-001', text: 'See login form' }],
  outcomeAcceptanceCriteria: [],
  systemAcceptanceCriteria: [],
  implementationNotes: {},
};

describe('PatchValidator', () => {
  const validator = new PatchValidator();

  it('validates add patch with path and item.text', () => {
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
      item: { text: 'x' },
      metadata: {},
    } as unknown as SectionPatch;
    const result = validator.validate(patch, baseStory);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Patch must have path and metadata.advisorId');
  });

  it('rejects replace without match.id or match.textEquals', () => {
    const patch: SectionPatch = {
      op: 'replace',
      path: 'userVisibleBehavior',
      item: { text: 'Updated' },
      metadata: { advisorId: 'test' },
    };
    const result = validator.validate(patch, baseStory);
    expect(result.valid).toBe(false);
  });

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

describe('PatchOrchestrator', () => {
  it('applies allowed add patch and updates metrics', () => {
    const orchestrator = new PatchOrchestrator();
    const patches: SectionPatch[] = [
      {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002', text: 'Submit' },
        metadata: { advisorId: 'adv' },
      },
    ];
    const { result, metrics } = orchestrator.applyPatches(baseStory, patches, ['userVisibleBehavior']);
    expect(metrics.totalPatches).toBe(1);
    expect(metrics.applied).toBe(1);
    expect(result.userVisibleBehavior).toHaveLength(2);
    expect(result.userVisibleBehavior[1].text).toBe('Submit');
  });

  it('rejects patch when path not in allowedPaths', () => {
    const orchestrator = new PatchOrchestrator();
    const patches: SectionPatch[] = [
      {
        op: 'add',
        path: 'openQuestions',
        item: { text: 'Q?' },
        metadata: { advisorId: 'adv' },
      },
    ];
    const { result, metrics } = orchestrator.applyPatches(baseStory, patches, ['userVisibleBehavior']);
    expect(metrics.rejectedPath).toBe(1);
    expect(metrics.applied).toBe(0);
    expect(result).toEqual(baseStory);
  });

  it('does not mutate original story', () => {
    const orchestrator = new PatchOrchestrator();
    const patches: SectionPatch[] = [
      {
        op: 'add',
        path: 'userVisibleBehavior',
        item: { id: 'UVB-002', text: 'New' },
        metadata: { advisorId: 'adv' },
      },
    ];
    orchestrator.applyPatches(baseStory, patches, ['userVisibleBehavior']);
    expect(baseStory.userVisibleBehavior).toHaveLength(1);
  });
});
