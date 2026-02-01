/**
 * Unit tests for story-planner (USA-78)
 */

import { describe, it, expect } from 'vitest';
import {
  inferLevelFromSectionName,
  displayNameFromSectionName,
  planStoriesFromFigmaSections,
  buildWorkContextSummary,
  buildWorkContextSummaryFromSystemContext,
} from '../../src/agent/story-planner.js';
import type { FigmaSectionForPlanning } from '../../src/utils/figma-utils.js';
import type { SystemDiscoveryContext } from '../../src/shared/types.js';

describe('Story Planner (USA-78)', () => {
  describe('inferLevelFromSectionName', () => {
    it('returns atom for ATOM - prefix', () => {
      expect(inferLevelFromSectionName('ATOM - SpinnerLoading')).toBe('atom');
      expect(inferLevelFromSectionName('atom - Button')).toBe('atom');
    });

    it('returns molecule for MOL - prefix', () => {
      expect(inferLevelFromSectionName('MOL - FilterItem')).toBe('molecule');
      expect(inferLevelFromSectionName('MOL - FilterGroup ✅')).toBe('molecule');
    });

    it('returns organism for ORG - prefix', () => {
      expect(inferLevelFromSectionName('ORG - FilterSheet ✅')).toBe('organism');
      expect(inferLevelFromSectionName('ORG - FilterBar ✅')).toBe('organism');
    });

    it('returns organism when no prefix', () => {
      expect(inferLevelFromSectionName('FilterBar')).toBe('organism');
      expect(inferLevelFromSectionName('Login Screen')).toBe('organism');
    });
  });

  describe('displayNameFromSectionName', () => {
    it('strips level prefix and trailing markers', () => {
      expect(displayNameFromSectionName('ORG - FilterSheet ✅')).toBe('FilterSheet');
      expect(displayNameFromSectionName('MOL - FilterItem')).toBe('FilterItem');
      expect(displayNameFromSectionName('ATOM - SpinnerLoading')).toBe('SpinnerLoading');
    });

    it('returns name unchanged when no prefix', () => {
      expect(displayNameFromSectionName('FilterBar')).toBe('FilterBar');
    });
  });

  describe('planStoriesFromFigmaSections', () => {
    it('returns empty array when no sections', () => {
      expect(planStoriesFromFigmaSections([])).toEqual([]);
    });

    it('sorts bottom-up: atom → molecule → organism', () => {
      const sections: FigmaSectionForPlanning[] = [
        { id: '1', name: 'ORG - FilterSheet ✅' },
        { id: '2', name: 'ATOM - SpinnerLoading' },
        { id: '3', name: 'MOL - FilterItem' },
      ];
      const planned = planStoriesFromFigmaSections(sections);
      expect(planned).toHaveLength(3);
      expect(planned[0].order).toBe(1);
      expect(planned[0].level).toBe('atom');
      expect(planned[0].componentRef).toBe('SpinnerLoading');
      expect(planned[1].level).toBe('molecule');
      expect(planned[2].level).toBe('organism');
    });

    it('assigns order 1..n and builds seeds', () => {
      const sections: FigmaSectionForPlanning[] = [
        { id: '1', name: 'ATOM - SpinnerLoading' },
        { id: '2', name: 'MOL - FilterItem' },
      ];
      const planned = planStoriesFromFigmaSections(sections);
      expect(planned[0].seed).toContain('loading');
      expect(planned[0].order).toBe(1);
      expect(planned[1].seed).toContain('filter');
      expect(planned[1].order).toBe(2);
    });

    it('uses long description as seed when provided', () => {
      const sections: FigmaSectionForPlanning[] = [
        {
          id: '1',
          name: 'ORG - FilterSheet ✅',
          description:
            'A mobile-exclusive bottom sheet for task-based filtering. It nests FilterGroup molecules.',
        },
      ];
      const planned = planStoriesFromFigmaSections(sections);
      expect(planned).toHaveLength(1);
      expect(planned[0].seed.length).toBeGreaterThan(20);
      expect(planned[0].seed.toLowerCase()).toMatch(/user|mobile|filter|sheet/);
    });
  });

  describe('buildWorkContextSummary', () => {
    it('includes product name when productContext provided', () => {
      const summary = buildWorkContextSummary(
        { productName: 'Component Inventory', productType: 'web', clientInfo: '', targetAudience: '', keyFeatures: [], businessContext: '' },
        undefined,
        []
      );
      expect(summary).toContain('Component Inventory');
    });

    it('includes component list and order when plannedStories provided', () => {
      const planned = [
        { seed: 'User sees loading.', order: 1, componentRef: 'SpinnerLoading', level: 'atom' as const },
        { seed: 'User toggles filter.', order: 2, componentRef: 'FilterItem', level: 'molecule' as const },
      ];
      const summary = buildWorkContextSummary(null, planned, []);
      expect(summary).toContain('SpinnerLoading');
      expect(summary).toContain('FilterItem');
      expect(summary).toContain('bottom-up');
      expect(summary).toContain('SpinnerLoading → FilterItem');
    });

    it('uses componentNames when no plannedStories', () => {
      const summary = buildWorkContextSummary(null, undefined, ['Login', 'Profile']);
      expect(summary).toContain('Login');
      expect(summary).toContain('Profile');
    });

    it('returns product name when only productContext (no plannedStories or componentNames)', () => {
      const summary = buildWorkContextSummary(
        { productName: 'App', productType: 'web', clientInfo: '', targetAudience: '', keyFeatures: [], businessContext: '' },
        undefined,
        []
      );
      expect(summary).toContain('App');
    });
  });

  describe('buildWorkContextSummaryFromSystemContext', () => {
    it('uses component names from componentGraph', () => {
      const ctx: SystemDiscoveryContext = {
        componentGraph: {
          components: {
            'COMP-A': { id: 'COMP-A', productName: 'Login Button', description: '' },
            'COMP-B': { id: 'COMP-B', productName: 'Profile', description: '' },
          },
          compositionEdges: [],
          coordinationEdges: [],
          dataFlows: [],
        },
        sharedContracts: { stateModels: [], eventRegistry: [], standardStates: [], dataFlows: [] },
        componentRoles: [],
        productVocabulary: {},
        timestamp: new Date().toISOString(),
      };
      const summary = buildWorkContextSummaryFromSystemContext({ productName: 'App', productType: 'web', clientInfo: '', targetAudience: '', keyFeatures: [], businessContext: '' }, ctx);
      expect(summary).toContain('Login Button');
      expect(summary).toContain('Profile');
    });
  });
});
