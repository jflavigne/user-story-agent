/**
 * Unit tests for relationship-merger.ts
 */

import { describe, it, expect } from 'vitest';
import { mergeNewRelationships } from '../../src/agent/relationship-merger.js';
import type { SystemDiscoveryContext, Relationship } from '../../src/shared/types.js';

function buildMinimalContext(): SystemDiscoveryContext {
  return {
    componentGraph: {
      components: {
        'COMP-LOGIN': { id: 'COMP-LOGIN', productName: 'Login Button', description: '' },
        'COMP-AUTH': { id: 'COMP-AUTH', productName: 'Auth Service', description: '' },
      },
      compositionEdges: [],
      coordinationEdges: [],
      dataFlows: [],
    },
    sharedContracts: {
      stateModels: [],
      eventRegistry: [],
      standardStates: [],
      dataFlows: [],
    },
    componentRoles: [],
    productVocabulary: {},
    timestamp: new Date().toISOString(),
  };
}

describe('RelationshipMerger', () => {
  describe('add_node operations', () => {
    it('should add new component node', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'COMP-USER-PROFILE',
          type: 'component',
          operation: 'add_node',
          name: 'add-component',
          canonicalName: 'User Profile',
          evidence: 'Story mentions profile',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.updatedContext.componentGraph.components['COMP-USER-PROFILE']).toBeDefined();
      expect(result.skipped).toHaveLength(0);
      expect(result.manualReview).toHaveLength(0);
    });

    it('should skip duplicate component node', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'COMP-LOGIN',
          type: 'component',
          operation: 'add_node',
          name: 'add-component',
          canonicalName: 'Login Button',
          evidence: 'Already exists',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.manualReview).toHaveLength(0);
    });

    it('should add new state model node', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'C-STATE-USER',
          type: 'stateModel',
          operation: 'add_node',
          name: 'add-state-model',
          canonicalName: 'User State',
          evidence: 'Story mentions user state',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.updatedContext.sharedContracts.stateModels).toHaveLength(1);
      expect(result.updatedContext.sharedContracts.stateModels[0].id).toBe('C-STATE-USER');
    });

    it('should add new event node', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'E-AUTH',
          type: 'event',
          operation: 'add_node',
          name: 'add-event',
          canonicalName: 'user-authenticated',
          evidence: 'Story mentions authentication event',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.updatedContext.sharedContracts.eventRegistry).toHaveLength(1);
      expect(result.updatedContext.sharedContracts.eventRegistry[0].id).toBe('E-AUTH');
    });
  });

  describe('add_edge operations', () => {
    it('should add composition edge when entities exist', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'add_edge',
          name: 'composed-of',
          source: 'COMP-LOGIN',
          target: 'COMP-AUTH',
          evidence: 'Login contains auth',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.updatedContext.componentGraph.compositionEdges).toHaveLength(1);
      expect(result.updatedContext.componentGraph.compositionEdges[0]).toEqual({
        parent: 'COMP-LOGIN',
        child: 'COMP-AUTH',
      });
    });

    it('should add coordination edge when entities exist', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'add_edge',
          name: 'coordinates-with',
          source: 'COMP-LOGIN',
          target: 'COMP-AUTH',
          evidence: 'Login coordinates with auth',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.updatedContext.componentGraph.coordinationEdges).toHaveLength(1);
      expect(result.updatedContext.componentGraph.coordinationEdges[0]).toEqual({
        from: 'COMP-LOGIN',
        to: 'COMP-AUTH',
        via: 'coordinates-with',
      });
    });

    it('should flag for manual review when entity does not exist', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'add_edge',
          name: 'coordinates-with',
          source: 'COMP-LOGIN',
          target: 'COMP-NONEXISTENT',
          evidence: 'Invalid target',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(0);
      expect(result.manualReview).toHaveLength(1);
      expect(result.manualReview[0].reason).toContain('Entity references do not exist');
    });

    it('should skip duplicate edge', () => {
      const context = buildMinimalContext();
      context.componentGraph.coordinationEdges.push({
        from: 'COMP-LOGIN',
        to: 'COMP-AUTH',
        via: 'coordinates-with',
      });

      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'add_edge',
          name: 'coordinates-with',
          source: 'COMP-LOGIN',
          target: 'COMP-AUTH',
          evidence: 'Duplicate',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
    });
  });

  describe('edit operations', () => {
    it('should flag edit_node for manual review', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'edit_node',
          name: 'update-component',
          canonicalName: 'Login Button Updated',
          evidence: 'Name changed',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(0);
      expect(result.manualReview).toHaveLength(1);
      expect(result.manualReview[0].reason).toContain('Edit operations require manual review');
    });

    it('should flag edit_edge for manual review', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'REL-001',
          type: 'component',
          operation: 'edit_edge',
          name: 'update-edge',
          source: 'COMP-LOGIN',
          target: 'COMP-AUTH',
          evidence: 'Protocol changed',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(0);
      expect(result.manualReview).toHaveLength(1);
      expect(result.manualReview[0].reason).toContain('Edit operations require manual review');
    });
  });

  describe('batch merging', () => {
    it('should merge multiple valid relationships', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        {
          id: 'COMP-PROFILE',
          type: 'component',
          operation: 'add_node',
          name: 'add-component',
          canonicalName: 'User Profile',
          evidence: 'Story 1',
        },
        {
          id: 'REL-001',
          type: 'component',
          operation: 'add_edge',
          name: 'coordinates-with',
          source: 'COMP-LOGIN',
          target: 'COMP-AUTH',
          evidence: 'Story 2',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(2);
      expect(Object.keys(result.updatedContext.componentGraph.components)).toHaveLength(3);
      expect(result.updatedContext.componentGraph.coordinationEdges).toHaveLength(1);
    });

    it('should handle mixed valid/duplicate/manual-review relationships', () => {
      const context = buildMinimalContext();
      const relationships: Relationship[] = [
        // Valid
        {
          id: 'COMP-PROFILE',
          type: 'component',
          operation: 'add_node',
          name: 'add-component',
          canonicalName: 'User Profile',
          evidence: 'New',
        },
        // Duplicate
        {
          id: 'COMP-LOGIN',
          type: 'component',
          operation: 'add_node',
          name: 'add-component',
          canonicalName: 'Login Button',
          evidence: 'Exists',
        },
        // Manual review (edit)
        {
          id: 'REL-EDIT',
          type: 'component',
          operation: 'edit_node',
          name: 'update',
          canonicalName: 'Updated',
          evidence: 'Edit',
        },
      ];

      const result = mergeNewRelationships(context, relationships);

      expect(result.mergedCount).toBe(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.manualReview).toHaveLength(1);
    });
  });
});
