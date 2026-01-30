/**
 * Unit tests for story-renderer.ts
 */

import { describe, it, expect } from 'vitest';
import { StoryRenderer } from '../../src/agent/story-renderer.js';
import type { StoryStructure, StoryInterconnections } from '../../src/shared/types.js';

const minimalStory: StoryStructure = {
  storyStructureVersion: '1',
  systemContextDigest: 'dig',
  generatedAt: '2025-01-01',
  title: 'Login',
  story: { asA: 'user', iWant: 'to log in', soThat: 'I can access' },
  userVisibleBehavior: [{ id: 'b1', text: 'See form' }],
  outcomeAcceptanceCriteria: [{ text: 'User can submit' }],
  systemAcceptanceCriteria: [],
  implementationNotes: {},
};

describe('StoryRenderer', () => {
  const renderer = new StoryRenderer();

  it('renders title and user story section', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('# Login');
    expect(md).toContain('As a **user**');
    expect(md).toContain('I want **to log in**');
    expect(md).toContain('so that **I can access**');
  });

  it('renders User-Visible Behavior and Outcome AC', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('## User-Visible Behavior');
    expect(md).toContain('[b1]');
    expect(md).toContain('See form');
    expect(md).toContain('## Outcome Acceptance Criteria');
    expect(md).toContain('User can submit');
  });

  it('includes structure version and digest in footer', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('Structure version: 1');
    expect(md).toContain('Context digest: dig');
  });

  it('escapes markdown in headings and inline', () => {
    const story: StoryStructure = {
      ...minimalStory,
      title: 'Fix #123',
      story: { asA: 'user', iWant: '**bold**', soThat: 'x' },
    };
    const md = renderer.toMarkdown(story);
    expect(md).toContain('# Fix 123');
    expect(md).toContain('\\*\\*bold\\*\\*');
  });

  it('appends interconnection metadata', () => {
    const interconnections: StoryInterconnections = {
      storyId: 'S1',
      uiMapping: { 'heart icon': 'Favorite Button' },
      contractDependencies: ['C-STATE-USER'],
      ownership: {
        ownsState: ['C-STATE-FAVORITES'],
        consumesState: ['C-STATE-USER'],
      },
      relatedStories: [
        { storyId: 'S2', relationship: 'prerequisite', description: 'Auth' },
      ],
    };
    const baseMd = '# Story\n\nBody.';
    const result = renderer.appendInterconnectionMetadata(baseMd, interconnections);
    expect(result).toContain('## Story ID');
    expect(result).toContain('S1');
    expect(result).toContain('## UI Mapping');
    expect(result).toContain('heart icon');
    expect(result).toContain('Favorite Button');
    expect(result).toContain('## Contract Dependencies');
    expect(result).toContain('C-STATE-USER');
    expect(result).toContain('## Ownership');
    expect(result).toContain('C-STATE-FAVORITES');
    expect(result).toContain('## Related Stories');
    expect(result).toContain('S2');
    expect(result).toContain('prerequisite');
    expect(result).toContain('Auth');
  });
});
