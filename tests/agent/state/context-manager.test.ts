/**
 * Unit tests for context-manager.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ContextManager,
  createContextManager,
  buildContextPrompt,
  updateContext,
  resetContext,
  type ContextPromptOptions,
} from '../../../src/agent/state/context-manager.js';
import {
  createInitialState,
  type StoryState,
  type IterationResult,
} from '../../../src/agent/state/story-state.js';
import type {
  ProductContext,
  StoryMetadata,
  SystemDiscoveryContext,
} from '../../../src/shared/types.js';

describe('ContextManager', () => {
  let manager: ContextManager;
  let basicState: StoryState;
  let productContext: ProductContext;

  beforeEach(() => {
    manager = new ContextManager();
    basicState = createInitialState('As a user, I want to login');
    productContext = {
      productName: 'TestApp',
      productType: 'web app',
      clientInfo: 'Test Client',
      targetAudience: 'General users',
      keyFeatures: ['Feature 1', 'Feature 2'],
      businessContext: 'Test business context',
    };
  });

  describe('buildContextPrompt', () => {
    it('builds basic context prompt with minimal state', () => {
      const prompt = manager.buildContextPrompt(basicState);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('includes product context when available', () => {
      const state: StoryState = {
        ...basicState,
        productContext,
      };
      const prompt = manager.buildContextPrompt(state);
      
      expect(prompt).toContain('TestApp');
      expect(prompt).toContain('web app');
      expect(prompt).toContain('General users');
      expect(prompt).toContain('Test business context');
    });

    it('includes story metadata when available', () => {
      const metadata: StoryMetadata = {
        title: 'Login Feature',
        description: 'User login functionality',
        acceptanceCriteria: ['Criterion 1'],
      };
      const state: StoryState = {
        ...basicState,
        metadata,
      };
      const prompt = manager.buildContextPrompt(state);
      
      expect(prompt).toContain('**Story Focus:** Login Feature');
      expect(prompt).toContain('User login functionality');
    });

    it('includes applied iterations in enhancements section', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation'],
      };
      const prompt = manager.buildContextPrompt(state);
      
      expect(prompt).toContain('**Applied Enhancements:**');
      expect(prompt).toContain('User Roles Analysis');
      expect(prompt).toContain('Validation Rules');
    });

    it('includes carrying statement when iterations are applied', () => {
      const metadata: StoryMetadata = {
        title: 'Login Feature',
        description: 'User login',
        acceptanceCriteria: [],
      };
      const state: StoryState = {
        ...basicState,
        metadata,
        appliedIterations: ['user-roles'],
      };
      const prompt = manager.buildContextPrompt(state);
      
      expect(prompt).toContain('As a reminder');
      expect(prompt).toContain('Login Feature');
    });

    it('respects maxDetailedIterations option', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation', 'accessibility', 'performance', 'security', 'responsive-web'],
      };
      const options: ContextPromptOptions = {
        maxDetailedIterations: 3,
      };
      const prompt = manager.buildContextPrompt(state, options);
      
      // Should show only last 3 iterations
      const lines = prompt.split('\n');
      const enhancementLines = lines.filter(line => line.startsWith('- **'));
      expect(enhancementLines.length).toBeLessThanOrEqual(4); // 3 iterations + "... and X more"
    });

    it('includes full history when includeFullHistory is true', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation', 'accessibility', 'performance', 'security'],
      };
      const options: ContextPromptOptions = {
        includeFullHistory: true,
      };
      const prompt = manager.buildContextPrompt(state, options);
      
      // Should show all iterations
      expect(prompt).toContain('User Roles Analysis');
      expect(prompt).toContain('Validation Rules');
      expect(prompt).toContain('Accessibility Requirements');
      expect(prompt).toContain('Performance Requirements');
      expect(prompt).toContain('Security Requirements');
      expect(prompt).not.toContain('... and');
    });

    it('handles unknown iteration IDs gracefully', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['unknown-iteration-id'],
      };
      const prompt = manager.buildContextPrompt(state);
      
      expect(prompt).toContain('unknown-iteration-id');
      expect(prompt).toContain('Applied');
    });

    it('includes system context when provided', () => {
      const systemContext: SystemDiscoveryContext = {
        timestamp: '2025-01-30T12:00:00Z',
        componentGraph: {
          components: {
            'COMP-LOGIN': {
              id: 'COMP-LOGIN',
              productName: 'Login Form',
              description: 'Handles user authentication',
              technicalName: 'LoginForm',
            },
          },
          compositionEdges: [{ parent: 'App', child: 'COMP-LOGIN' }],
          coordinationEdges: [],
          dataFlows: [],
        },
        sharedContracts: {
          stateModels: [],
          eventRegistry: [],
          standardStates: [],
          dataFlows: [],
        },
        componentRoles: [
          { componentId: 'COMP-LOGIN', role: 'auth', description: 'Owns login flow' },
        ],
        productVocabulary: { btn: 'button', fld: 'field' },
      };
      const state: StoryState = { ...basicState, productContext };
      const prompt = manager.buildContextPrompt(state, {}, systemContext);

      expect(prompt).toContain('**System Context:**');
      expect(prompt).toContain('Timestamp: 2025-01-30T12:00:00Z');
      expect(prompt).toContain('Component graph:');
      expect(prompt).toContain('COMP-LOGIN');
      expect(prompt).toContain('Login Form');
      expect(prompt).toContain('Handles user authentication');
      expect(prompt).toContain('Component roles:');
      expect(prompt).toContain('auth');
      expect(prompt).toContain('Product vocabulary:');
      expect(prompt).toContain('btn → button');
      expect(prompt).toContain('fld → field');
    });

    it('works without systemContext (optional)', () => {
      const state: StoryState = { ...basicState, productContext };
      const prompt = manager.buildContextPrompt(state);

      expect(prompt).not.toContain('**System Context:**');
      expect(prompt).toContain('TestApp');
      expect(prompt).toContain('We are working on a user story');
    });

    it('formats system context as human-readable text (not raw JSON)', () => {
      const systemContext: SystemDiscoveryContext = {
        timestamp: '2025-01-30T12:00:00Z',
        componentGraph: {
          components: {
            A: {
              id: 'A',
              productName: 'Comp A',
              description: 'Description A',
            },
          },
          compositionEdges: [{ parent: 'Root', child: 'A' }],
          coordinationEdges: [],
          dataFlows: [],
        },
        sharedContracts: {
          stateModels: [
            { id: 'S1', name: 'State1', description: 'State desc', owner: 'A', consumers: [] },
          ],
          eventRegistry: [],
          standardStates: [],
          dataFlows: [],
        },
        componentRoles: [{ componentId: 'A', role: 'owner', description: 'Owns state' }],
        productVocabulary: { x: 'X term' },
      };
      const state: StoryState = { ...basicState };
      const prompt = manager.buildContextPrompt(state, {}, systemContext);

      expect(prompt).toContain('**System Context:**');
      expect(prompt).toContain('Component graph:');
      expect(prompt).toContain('Shared contracts:');
      expect(prompt).toContain('Component roles:');
      expect(prompt).toContain('Product vocabulary:');
      expect(prompt).toContain('Timestamp:');
      expect(prompt).not.toMatch(/\s*"componentGraph"\s*:/);
      expect(prompt).not.toMatch(/\s*"sharedContracts"\s*:/);
      expect(prompt).not.toMatch(/\{\s*"components"\s*:/);
    });
  });

  describe('updateContext', () => {
    it('adds iteration to applied list', () => {
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: basicState.currentStory,
        outputStory: 'Enhanced story with roles',
        changesApplied: [{ category: 'roles', description: 'Added user roles' }],
        timestamp: new Date().toISOString(),
      };
      
      const { state: updatedState, updateSummary } = manager.updateContext(basicState, result);
      
      expect(updatedState.appliedIterations).toContain('user-roles');
      expect(updatedState.appliedIterations.length).toBe(1);
      expect(updatedState.currentStory).toBe('Enhanced story with roles');
      expect(updatedState.iterationResults.length).toBe(1);
      expect(updateSummary).toContain('Applied');
    });

    it('updates current story with output', () => {
      const result: IterationResult = {
        iterationId: 'validation',
        inputStory: basicState.currentStory,
        outputStory: 'Story with validation',
        changesApplied: [{ category: 'validation', description: 'Added validation' }],
        timestamp: new Date().toISOString(),
      };
      
      const { state: updatedState } = manager.updateContext(basicState, result);
      
      expect(updatedState.currentStory).toBe('Story with validation');
      expect(updatedState.originalStory).toBe(basicState.originalStory); // Preserved
    });

    it('preserves original story', () => {
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: basicState.currentStory,
        outputStory: 'Modified story',
        changesApplied: [],
        timestamp: new Date().toISOString(),
      };
      
      const { state: updatedState } = manager.updateContext(basicState, result);
      
      expect(updatedState.originalStory).toBe(basicState.originalStory);
      expect(updatedState.originalStory).not.toBe(updatedState.currentStory);
    });

    it('adds iteration result to history', () => {
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: 'Input story',
        outputStory: 'Output story',
        changesApplied: [
          { category: 'validation', description: 'Change 1' },
          { category: 'accessibility', description: 'Change 2' },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };
      
      const { state: updatedState } = manager.updateContext(basicState, result);
      
      expect(updatedState.iterationResults).toHaveLength(1);
      expect(updatedState.iterationResults[0]).toEqual(result);
    });

    it('handles duplicate iteration IDs (does not add twice)', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles'],
      };
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: 'Input',
        outputStory: 'Output',
        changesApplied: [],
        timestamp: new Date().toISOString(),
      };
      
      const { state: updatedState, updateSummary } = manager.updateContext(state, result);
      
      expect(updatedState.appliedIterations).toHaveLength(1);
      expect(updatedState.iterationResults.length).toBeGreaterThan(0);
      expect(updateSummary).toContain('Updated existing');
    });

    it('returns meaningful update summary', () => {
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: 'Input',
        outputStory: 'Output',
        changesApplied: [],
        timestamp: new Date().toISOString(),
      };
      
      const { updateSummary } = manager.updateContext(basicState, result);
      
      expect(updateSummary).toBeDefined();
      expect(typeof updateSummary).toBe('string');
      expect(updateSummary.length).toBeGreaterThan(0);
    });
  });

  describe('resetContext', () => {
    it('creates fresh state when no parameters provided', () => {
      const newState = manager.resetContext();
      
      expect(newState.originalStory).toBe('');
      expect(newState.currentStory).toBe('');
      expect(newState.appliedIterations).toEqual([]);
      expect(newState.iterationResults).toEqual([]);
      expect(newState.productContext).toBeNull();
      expect(newState.metadata).toBeNull();
    });

    it('preserves product context when provided', () => {
      const newState = manager.resetContext(undefined, productContext);
      
      expect(newState.productContext).toEqual(productContext);
      expect(newState.appliedIterations).toEqual([]);
    });

    it('creates initial state from story string', () => {
      const story = 'As a user, I want to login';
      const newState = manager.resetContext(story);
      
      expect(newState.originalStory).toBe(story);
      expect(newState.currentStory).toBe(story);
      expect(newState.appliedIterations).toEqual([]);
    });

    it('creates initial state with both story and product context', () => {
      const story = 'As a user, I want to login';
      const newState = manager.resetContext(story, productContext);
      
      expect(newState.originalStory).toBe(story);
      expect(newState.currentStory).toBe(story);
      expect(newState.productContext).toEqual(productContext);
      expect(newState.appliedIterations).toEqual([]);
    });

    it('clears all iterations and results', () => {
      // resetContext() without args always returns fresh empty state
      // regardless of what previous state looked like
      const newState = manager.resetContext();
      
      expect(newState.appliedIterations).toEqual([]);
      expect(newState.iterationResults).toEqual([]);
    });

    it('handles null product context', () => {
      const newState = manager.resetContext(undefined, null);
      
      expect(newState.productContext).toBeNull();
    });
  });

  describe('buildCarryingStatement', () => {
    it('returns empty string when no iterations applied', () => {
      const statement = manager.buildCarryingStatement(basicState);
      expect(statement).toBe('');
    });

    it('builds statement with iteration names', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles'],
      };
      const statement = manager.buildCarryingStatement(state);
      
      expect(statement).toContain('As a reminder');
      expect(statement).toContain('user story');
      expect(statement).toContain('1 iteration');
    });

    it('uses metadata title when available', () => {
      const metadata: StoryMetadata = {
        title: 'Login Feature',
        description: 'User login',
        acceptanceCriteria: [],
      };
      const state: StoryState = {
        ...basicState,
        metadata,
        appliedIterations: ['user-roles'],
      };
      const statement = manager.buildCarryingStatement(state);
      
      expect(statement).toContain('Login Feature');
    });

    it('handles multiple iterations', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation', 'accessibility'],
      };
      const statement = manager.buildCarryingStatement(state);
      
      expect(statement).toContain('3 iterations');
      expect(statement).toContain('User Roles Analysis');
      expect(statement).toContain('Validation Rules');
    });

    it('uses plural form for multiple iterations', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation'],
      };
      const statement = manager.buildCarryingStatement(state);
      
      expect(statement).toContain('iterations');
      expect(statement).toMatch(/\d+ iterations/);
    });

    it('uses singular form for single iteration', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles'],
      };
      const statement = manager.buildCarryingStatement(state);
      
      expect(statement).toContain('1 iteration');
      expect(statement).not.toContain('iterations');
    });
  });

  describe('buildConclusionSummary', () => {
    it('returns empty string when no iterations applied', () => {
      const summary = manager.buildConclusionSummary(basicState);
      expect(summary).toBe('');
    });

    it('builds summary with iteration count and names', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles'],
      };
      const summary = manager.buildConclusionSummary(state);
      
      expect(summary).toContain('Summary:');
      expect(summary).toContain('1 iteration');
      expect(summary).toContain('User Roles Analysis');
    });

    it('handles multiple iterations', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation', 'accessibility'],
      };
      const summary = manager.buildConclusionSummary(state);
      
      expect(summary).toContain('3 iterations');
      expect(summary).toContain('User Roles Analysis');
      expect(summary).toContain('Validation Rules');
      expect(summary).toContain('Accessibility Requirements');
    });

    it('uses plural form for multiple iterations', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles', 'validation'],
      };
      const summary = manager.buildConclusionSummary(state);
      
      expect(summary).toContain('iterations');
    });

    it('uses singular form for single iteration', () => {
      const state: StoryState = {
        ...basicState,
        appliedIterations: ['user-roles'],
      };
      const summary = manager.buildConclusionSummary(state);
      
      expect(summary).toContain('1 iteration');
      expect(summary).not.toContain('iterations');
    });
  });

  describe('createContextManager', () => {
    it('creates a new ContextManager instance', () => {
      const manager = createContextManager();
      expect(manager).toBeInstanceOf(ContextManager);
    });
  });

  describe('Standalone functions', () => {
    it('buildContextPrompt works as standalone function', () => {
      const prompt = buildContextPrompt(basicState);
      expect(prompt).toBeDefined();
      expect(typeof prompt).toBe('string');
    });

    it('buildContextPrompt accepts optional systemContext as third argument', () => {
      const systemContext: SystemDiscoveryContext = {
        timestamp: '2025-01-30T12:00:00Z',
        componentGraph: {
          components: {},
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
        productVocabulary: { term: 'Product Term' },
      };
      const prompt = buildContextPrompt(basicState, undefined, systemContext);
      expect(prompt).toContain('**System Context:**');
      expect(prompt).toContain('Product vocabulary:');
      expect(prompt).toContain('term → Product Term');
    });

    it('updateContext works as standalone function', () => {
      const result: IterationResult = {
        iterationId: 'user-roles',
        inputStory: basicState.currentStory,
        outputStory: 'Enhanced story',
        changesApplied: [],
        timestamp: new Date().toISOString(),
      };
      
      const { state, updateSummary } = updateContext(basicState, result);
      
      expect(state.appliedIterations).toContain('user-roles');
      expect(updateSummary).toBeDefined();
    });

    it('resetContext works as standalone function', () => {
      const newState = resetContext('Test story', productContext);
      
      expect(newState.originalStory).toBe('Test story');
      expect(newState.productContext).toEqual(productContext);
    });
  });
});
