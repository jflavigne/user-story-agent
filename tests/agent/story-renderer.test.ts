/**
 * Unit tests for story-renderer.ts
 */

import { describe, it, expect } from 'vitest';
import { StoryRenderer } from '../../src/agent/story-renderer.js';
import type { StoryStructure, StoryInterconnections, ImplementationNotes } from '../../src/shared/types.js';

const minimalStory: StoryStructure = {
  storyStructureVersion: '1',
  systemContextDigest: 'dig',
  generatedAt: '2025-01-01',
  title: 'Login',
  story: { asA: 'user', iWant: 'to log in', soThat: 'I can access' },
  userVisibleBehavior: [{ id: 'b1', text: 'See form' }],
  outcomeAcceptanceCriteria: [{ id: 'ac1', text: 'User can submit' }],
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

describe('StoryRenderer', () => {
  const renderer = new StoryRenderer();

  it('renders title and story lines (canonical template)', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('# Login');
    expect(md).toContain('As a user');
    expect(md).toContain('I want to log in');
    expect(md).toContain('So that I can access');
  });

  it('renders all required sections in canonical order', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('## User-Visible Behavior');
    expect(md).toContain('## Acceptance Criteria (Outcome)');
    expect(md).toContain('## Acceptance Criteria (System)');
    expect(md).toContain('## Implementation Notes');
  });

  it('renders User-Visible Behavior and Acceptance Criteria items', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).toContain('[b1]');
    expect(md).toContain('See form');
    expect(md).toContain('User can submit');
  });

  it('produces identical markdown for same StoryStructure (determinism)', () => {
    const a = renderer.toMarkdown(minimalStory);
    const b = renderer.toMarkdown(minimalStory);
    expect(a).toBe(b);
    expect(a).toBe(renderer.toMarkdown(minimalStory));
  });

  it('does not include footer (no structure version / digest in body)', () => {
    const md = renderer.toMarkdown(minimalStory);
    expect(md).not.toContain('Structure version:');
    expect(md).not.toContain('Context digest:');
    expect(md).not.toContain('---');
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

  it('renders all implementation note subsections in fixed order', () => {
    const notes: ImplementationNotes = {
      stateOwnership: [{ id: 's1', text: 'Local form state' }],
      dataFlow: [{ id: 'd1', text: 'Submit to API' }],
      apiContracts: [{ id: 'a1', text: 'POST /auth' }],
      loadingStates: [{ id: 'l1', text: 'Skeleton on load' }],
      performanceNotes: [{ id: 'p1', text: 'Debounce search' }],
      securityNotes: [{ id: 'sec1', text: 'HTTPS only' }],
      telemetryNotes: [{ id: 't1', text: 'Log login attempt' }],
    };
    const story: StoryStructure = { ...minimalStory, implementationNotes: notes };
    const md = renderer.toMarkdown(story);
    expect(md).toContain('### State ownership');
    expect(md).toContain('Local form state');
    expect(md).toContain('### Data flow');
    expect(md).toContain('Submit to API');
    expect(md).toContain('### API contracts');
    expect(md).toContain('POST /auth');
    expect(md).toContain('### Loading states');
    expect(md).toContain('Skeleton on load');
    expect(md).toContain('### Performance');
    expect(md).toContain('Debounce search');
    expect(md).toContain('### Security');
    expect(md).toContain('HTTPS only');
    expect(md).toContain('### Telemetry');
    expect(md).toContain('Log login attempt');
    // Subsection order must be fixed for determinism
    const stateIdx = md.indexOf('### State ownership');
    const dataIdx = md.indexOf('### Data flow');
    const apiIdx = md.indexOf('### API contracts');
    const loadIdx = md.indexOf('### Loading states');
    const perfIdx = md.indexOf('### Performance');
    const secIdx = md.indexOf('### Security');
    const telIdx = md.indexOf('### Telemetry');
    expect(stateIdx).toBeLessThan(dataIdx);
    expect(dataIdx).toBeLessThan(apiIdx);
    expect(apiIdx).toBeLessThan(loadIdx);
    expect(loadIdx).toBeLessThan(perfIdx);
    expect(perfIdx).toBeLessThan(secIdx);
    expect(secIdx).toBeLessThan(telIdx);
  });

  it('includes optional sections when present (UI Mapping, Open Questions, Edge Cases, Non-Goals)', () => {
    const story: StoryStructure = {
      ...minimalStory,
      uiMapping: [{ id: 'u1', productTerm: 'heart icon', componentName: 'FavoriteButton' }],
      openQuestions: [{ id: 'q1', text: 'Auth provider?' }],
      edgeCases: [{ id: 'e1', text: 'Network offline' }],
      nonGoals: [{ id: 'n1', text: 'SSO' }],
    };
    const md = renderer.toMarkdown(story);
    expect(md).toContain('## UI Mapping');
    expect(md).toContain('heart icon');
    expect(md).toContain('FavoriteButton');
    expect(md).toContain('## Open Questions');
    expect(md).toContain('Auth provider?');
    expect(md).toContain('## Edge Cases');
    expect(md).toContain('Network offline');
    expect(md).toContain('## Non-Goals');
    expect(md).toContain('SSO');
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
