/**
 * Unit tests for iteration-registry.ts
 *
 * Iterations are loaded from markdown prompts via initializeIterationPrompts();
 * tests call it in beforeEach so cache is populated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import {
  WORKFLOW_ORDER,
  getIterationsByCategory,
  getApplicableIterations,
  getIterationById,
  getAllIterations,
  getVisionCapableIterations,
  getIterations,
  initializeIterationPrompts,
} from '../../src/shared/iteration-registry.js';

const ITERATIONS_DIR = path.join(process.cwd(), 'src', 'prompts', 'iterations');

describe('iteration-registry', () => {
  beforeEach(async () => {
    await initializeIterationPrompts(ITERATIONS_DIR);
  });

  describe('Cache resolution after loadIterationsFromPrompts', () => {
    it('getAllIterations() returns 12 entries in WORKFLOW_ORDER order', () => {
      const iterations = getAllIterations();
      expect(iterations).toHaveLength(12);
      expect(iterations.map((i) => i.id)).toEqual([...WORKFLOW_ORDER]);
    });

    it('getIterations() returns same as getAllIterations when cache set', () => {
      const all = getAllIterations();
      const fromGet = getIterations();
      expect(fromGet).toHaveLength(all.length);
      expect(fromGet.map((i) => i.id)).toEqual(all.map((i) => i.id));
    });

    it('getIterationById returns entry with prompt and allowedPaths from file or fallback', () => {
      const iteration = getIterationById('user-roles');
      expect(iteration).toBeDefined();
      expect(iteration?.id).toBe('user-roles');
      expect(iteration?.name).toBe('User Roles Analysis');
      expect(iteration?.prompt).toBeDefined();
      expect(iteration?.prompt.length).toBeGreaterThan(0);
      expect(iteration?.allowedPaths).toBeDefined();
      expect(Array.isArray(iteration?.allowedPaths)).toBe(true);
      expect(iteration?.tokenEstimate).toBeGreaterThan(0);
    });

    it('getIterationById("invalid-id") returns undefined', () => {
      const iteration = getIterationById('invalid-id');
      expect(iteration).toBeUndefined();
    });

    it('all iterations have required fields', () => {
      const iterations = getAllIterations();
      for (const iteration of iterations) {
        expect(iteration.id).toBeDefined();
        expect(iteration.name).toBeDefined();
        expect(iteration.description).toBeDefined();
        expect(iteration.prompt).toBeDefined();
        expect(iteration.prompt.length).toBeGreaterThan(0);
        expect(iteration.category).toBeDefined();
        expect(iteration.order).toBeDefined();
        expect(
          iteration.applicableTo === 'all' || Array.isArray(iteration.applicableTo)
        ).toBe(true);
        expect(iteration.tokenEstimate).toBeGreaterThan(0);
        expect(iteration.allowedPaths).toBeDefined();
        expect(Array.isArray(iteration.allowedPaths)).toBe(true);
        expect(iteration.outputFormat).toBe('patches');
      }
    });
  });

  describe('getIterationsByCategory', () => {
    it("getIterationsByCategory('quality') returns [accessibility, performance, security] in that order", () => {
      const iterations = getIterationsByCategory('quality');
      expect(iterations).toHaveLength(3);
      expect(iterations[0].id).toBe('accessibility');
      expect(iterations[1].id).toBe('performance');
      expect(iterations[2].id).toBe('security');
    });

    it("getIterationsByCategory('i18n') returns [language-support, locale-formatting, cultural-appropriateness] in that order", () => {
      const iterations = getIterationsByCategory('i18n');
      expect(iterations).toHaveLength(3);
      expect(iterations[0].id).toBe('language-support');
      expect(iterations[1].id).toBe('locale-formatting');
      expect(iterations[2].id).toBe('cultural-appropriateness');
    });

    it("getIterationsByCategory('roles') returns [user-roles]", () => {
      const iterations = getIterationsByCategory('roles');
      expect(iterations).toHaveLength(1);
      expect(iterations[0].id).toBe('user-roles');
    });

    it("getIterationsByCategory('responsive') returns [responsive-web, responsive-native]", () => {
      const iterations = getIterationsByCategory('responsive');
      expect(iterations).toHaveLength(2);
      expect(iterations[0].id).toBe('responsive-web');
      expect(iterations[1].id).toBe('responsive-native');
    });
  });

  describe('getApplicableIterations', () => {
    it("getApplicableIterations('web') excludes responsive-native, includes 11 iterations", () => {
      const iterations = getApplicableIterations('web');
      expect(iterations).toHaveLength(11);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-native');
      expect(iterations.map((i) => i.id)).toContain('responsive-web');
    });

    it("getApplicableIterations('mobile-native') excludes responsive-web, includes 11 iterations", () => {
      const iterations = getApplicableIterations('mobile-native');
      expect(iterations).toHaveLength(11);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-web');
      expect(iterations.map((i) => i.id)).toContain('responsive-native');
    });

    it("getApplicableIterations('api') excludes both responsive iterations (10 iterations)", () => {
      const iterations = getApplicableIterations('api');
      expect(iterations).toHaveLength(10);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-web');
      expect(iterations.map((i) => i.id)).not.toContain('responsive-native');
    });

    it("getApplicableIterations('desktop') excludes responsive-native, includes 11 iterations", () => {
      const iterations = getApplicableIterations('desktop');
      expect(iterations).toHaveLength(11);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-native');
      expect(iterations.map((i) => i.id)).toContain('responsive-web');
    });
  });

  describe('getIterationById', () => {
    it("getIterationById('user-roles') returns correct iteration", () => {
      const iteration = getIterationById('user-roles');
      expect(iteration).toBeDefined();
      expect(iteration?.id).toBe('user-roles');
      expect(iteration?.name).toBeDefined();
      expect(iteration?.category).toBe('roles');
    });
  });

  describe('getAllIterations', () => {
    it('getAllIterations() returns all 12 in WORKFLOW_ORDER order', () => {
      const iterations = getAllIterations();
      expect(iterations).toHaveLength(12);
      expect(iterations.map((i) => i.id)).toEqual([...WORKFLOW_ORDER]);
    });
  });

  describe('getVisionCapableIterations', () => {
    it('Returns exactly 6 iterations with supportsVision=true', () => {
      const visionIterations = getVisionCapableIterations();
      expect(visionIterations).toHaveLength(6);
      for (const iteration of visionIterations) {
        expect(iteration.supportsVision).toBe(true);
      }
    });

    it('Returns the correct 6 vision-capable iterations in workflow order', () => {
      const visionIterations = getVisionCapableIterations();
      const visionIds = visionIterations.map((i) => i.id);
      expect(visionIds).toEqual([
        'interactive-elements',
        'validation',
        'accessibility',
        'performance',
        'responsive-web',
        'analytics',
      ]);
    });
  });
});
