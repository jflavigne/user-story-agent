/**
 * Unit tests for iteration-registry.ts
 */

import { describe, it, expect } from 'vitest';
import {
  ITERATION_REGISTRY,
  WORKFLOW_ORDER,
  getIterationsByCategory,
  getApplicableIterations,
  getIterationById,
  getAllIterations,
} from '../../src/shared/iteration-registry.js';

describe('iteration-registry', () => {
  describe('Registry structure', () => {
    it('ITERATION_REGISTRY contains exactly 12 iterations', () => {
      const registryKeys = Object.keys(ITERATION_REGISTRY);
      expect(registryKeys).toHaveLength(12);
    });

    it('WORKFLOW_ORDER contains exactly 12 IDs', () => {
      expect(WORKFLOW_ORDER).toHaveLength(12);
    });

    it('WORKFLOW_ORDER matches registry keys', () => {
      const registryKeys = Object.keys(ITERATION_REGISTRY);
      const workflowOrderSet = new Set(WORKFLOW_ORDER);
      const registryKeysSet = new Set(registryKeys);

      expect(workflowOrderSet.size).toBe(registryKeysSet.size);
      expect(workflowOrderSet.size).toBe(12);

      // Check that all workflow order IDs exist in registry
      for (const id of WORKFLOW_ORDER) {
        expect(registryKeys).toContain(id);
      }

      // Check that all registry keys are in workflow order
      for (const key of registryKeys) {
        expect(WORKFLOW_ORDER).toContain(key);
      }
    });

    it('All iterations in registry have required fields', () => {
      for (const [id, iteration] of Object.entries(ITERATION_REGISTRY)) {
        expect(iteration).toBeDefined();
        expect(iteration.id).toBe(id);
        expect(iteration.name).toBeDefined();
        expect(typeof iteration.name).toBe('string');
        expect(iteration.name.length).toBeGreaterThan(0);
        expect(iteration.description).toBeDefined();
        expect(typeof iteration.description).toBe('string');
        expect(iteration.description.length).toBeGreaterThan(0);
        expect(iteration.prompt).toBeDefined();
        expect(typeof iteration.prompt).toBe('string');
        expect(iteration.prompt.length).toBeGreaterThan(0);
        expect(iteration.category).toBeDefined();
        expect(typeof iteration.category).toBe('string');
        expect(iteration.order).toBeDefined();
        expect(typeof iteration.order).toBe('number');
        expect(iteration.applicableTo).toBeDefined();
        expect(
          iteration.applicableTo === 'all' || Array.isArray(iteration.applicableTo)
        ).toBe(true);
        expect(iteration.tokenEstimate).toBeDefined();
        expect(typeof iteration.tokenEstimate).toBe('number');
        expect(iteration.tokenEstimate).toBeGreaterThan(0);
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
    it("getApplicableIterations('web') excludes responsive-native, includes all others (11 iterations)", () => {
      const iterations = getApplicableIterations('web');
      expect(iterations).toHaveLength(11);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-native');
      expect(iterations.map((i) => i.id)).toContain('responsive-web');
    });

    it("getApplicableIterations('mobile-native') excludes responsive-web, includes all others (11 iterations)", () => {
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

    it("getApplicableIterations('desktop') excludes responsive-native, includes all others (11 iterations)", () => {
      const iterations = getApplicableIterations('desktop');
      expect(iterations).toHaveLength(11);
      expect(iterations.map((i) => i.id)).not.toContain('responsive-native');
      expect(iterations.map((i) => i.id)).toContain('responsive-web');
    });
  });

  describe('getIterationById', () => {
    it("getIterationById('user-roles') returns correct iteration with id='user-roles'", () => {
      const iteration = getIterationById('user-roles');
      expect(iteration).toBeDefined();
      expect(iteration?.id).toBe('user-roles');
      expect(iteration?.name).toBeDefined();
      expect(iteration?.category).toBe('roles');
    });

    it("getIterationById('invalid-id') returns undefined", () => {
      const iteration = getIterationById('invalid-id');
      expect(iteration).toBeUndefined();
    });
  });

  describe('getAllIterations', () => {
    it('getAllIterations() returns all 12 in WORKFLOW_ORDER order', () => {
      const iterations = getAllIterations();
      expect(iterations).toHaveLength(12);
      expect(iterations.map((i) => i.id)).toEqual([...WORKFLOW_ORDER]);
    });
  });
});
