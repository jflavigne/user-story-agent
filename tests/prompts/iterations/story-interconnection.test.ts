/**
 * Unit tests for story-interconnection prompt (USA-48): buildStoryInterconnectionPrompt,
 * formatSystemContext, formatAllStories.
 */

import { describe, it, expect } from 'vitest';
import {
  buildStoryInterconnectionPrompt,
  formatAllStories,
  formatSystemContext,
  type StoryForInterconnection,
} from '../../../src/prompts/iterations/story-interconnection.js';
import type { SystemDiscoveryContext } from '../../../src/shared/types.js';

function minimalSystemContext(): SystemDiscoveryContext {
  return {
    componentGraph: {
      components: {
        'COMP-LOGIN-BUTTON': {
          id: 'COMP-LOGIN-BUTTON',
          productName: 'Login Button',
          description: 'Primary login CTA',
        },
      },
      compositionEdges: [],
      coordinationEdges: [],
      dataFlows: [],
    },
    sharedContracts: {
      stateModels: [
        { id: 'C-STATE-AUTH', name: 'Auth', description: 'Auth state', owner: '', consumers: [] },
      ],
      eventRegistry: [
        { id: 'E-USER-AUTHENTICATED', name: 'user-authenticated', payload: {}, emitter: '', listeners: [] },
      ],
      standardStates: [],
      dataFlows: [{ id: 'DF-LOGIN-FLOW', source: 'COMP-LOGIN', target: 'COMP-DASH', description: 'Login to dashboard' }],
    },
    componentRoles: [],
    productVocabulary: {},
    timestamp: '2025-01-30T12:00:00Z',
  };
}

describe('story-interconnection prompt (USA-48)', () => {
  describe('formatSystemContext', () => {
    it('includes components, state models, events, and data flows', () => {
      const ctx = minimalSystemContext();
      const out = formatSystemContext(ctx);
      expect(out).toContain('### Components');
      expect(out).toContain('COMP-LOGIN-BUTTON');
      expect(out).toContain('Login Button');
      expect(out).toContain('### State Models');
      expect(out).toContain('C-STATE-AUTH');
      expect(out).toContain('### Events');
      expect(out).toContain('E-USER-AUTHENTICATED');
      expect(out).toContain('### Data Flows');
      expect(out).toContain('DF-LOGIN-FLOW');
    });

    it('handles empty sections with (none)', () => {
      const ctx: SystemDiscoveryContext = {
        ...minimalSystemContext(),
        componentGraph: { components: {}, compositionEdges: [], coordinationEdges: [], dataFlows: [] },
        sharedContracts: {
          stateModels: [],
          eventRegistry: [],
          standardStates: [],
          dataFlows: [],
        },
      };
      const out = formatSystemContext(ctx);
      expect(out).toContain('(none)');
    });
  });

  describe('formatAllStories', () => {
    it('formats id, title, and content excerpt', () => {
      const stories: StoryForInterconnection[] = [
        { id: 'USA-001', title: 'Login', content: 'As a user I want to log in so that I can access the app. This is a longer body that will be truncated at 200 chars. Adding more text here to ensure we exceed the 200 character limit and trigger the ellipsis. This should definitely be long enough now to see the truncation.' },
      ];
      const out = formatAllStories(stories);
      expect(out).toContain('USA-001');
      expect(out).toContain('Login');
      expect(out).toContain('As a user');
      expect(out).toContain('...');
    });

    it('does not add ellipsis when content is short', () => {
      const stories: StoryForInterconnection[] = [
        { id: 'USA-002', title: 'Short', content: 'Short content.' },
      ];
      const out = formatAllStories(stories);
      expect(out).not.toContain('...');
      expect(out).toContain('Short content.');
    });
  });

  describe('buildStoryInterconnectionPrompt', () => {
    it('returns full prompt with story, system context, and all stories', () => {
      const story = '# USA-001: Login\n\nAs a user I want to log in.';
      const allStories: StoryForInterconnection[] = [
        { id: 'USA-001', title: 'Login', content: story },
        { id: 'USA-002', title: 'Logout', content: 'As a user I want to log out.' },
      ];
      const ctx = minimalSystemContext();
      const prompt = buildStoryInterconnectionPrompt(story, allStories, ctx);

      expect(prompt).toContain('You are analyzing a user story to extract interconnection metadata');
      expect(prompt).toContain('## Story to Analyze');
      expect(prompt).toContain(story);
      expect(prompt).toContain('## System Context');
      expect(prompt).toContain('COMP-LOGIN-BUTTON');
      expect(prompt).toContain('## All Stories in Batch');
      expect(prompt).toContain('USA-001');
      expect(prompt).toContain('USA-002');
      expect(prompt).toContain('### 1. UI Mapping');
      expect(prompt).toContain('"uiMapping":');
      expect(prompt).toContain('"login button": "COMP-LOGIN-BUTTON"');
      expect(prompt).toContain('contractDependencies');
      expect(prompt).toContain('"contractDependencies": [');
      expect(prompt).toContain('C-STATE-USER');
      expect(prompt).toContain('E-USER-AUTHENTICATED');
      expect(prompt).toContain('ownership');
      expect(prompt).toContain('relatedStories');
      expect(prompt).toContain('"storyId":');
      expect(prompt).toContain('"relationship":');
      expect(prompt).toContain('"description":');
      expect(prompt).toContain('prerequisite');
      expect(prompt).toContain('parallel');
      expect(prompt).toContain('dependent');
      expect(prompt).not.toContain('needsManualReview');
      expect(prompt).toContain('Only use IDs that exist in the system context');
    });
  });
});
