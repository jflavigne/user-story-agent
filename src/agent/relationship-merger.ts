/**
 * Relationship merger for Pass 1 refinement loop.
 * Handles merging discovered relationships into system context with conflict resolution.
 */

import type {
  SystemDiscoveryContext,
  Relationship,
  Component,
  StateModel,
  EventDefinition,
} from '../shared/types.js';
import { logger } from '../utils/logger.js';

export interface MergeResult {
  /** Updated system context with merged relationships */
  updatedContext: SystemDiscoveryContext;
  /** Number of relationships successfully merged */
  mergedCount: number;
  /** Relationships that were skipped (duplicates) */
  skipped: Relationship[];
  /** Relationships that require manual review (edit operations or validation failures) */
  manualReview: Array<{ relationship: Relationship; reason: string }>;
}

/**
 * Merges new relationships into system context.
 *
 * @param context - Current system context
 * @param relationships - New relationships to merge
 * @returns Merge result with updated context and counts
 */
export function mergeNewRelationships(
  context: SystemDiscoveryContext,
  relationships: Relationship[]
): MergeResult {
  // Clone context to avoid mutation
  const updatedContext: SystemDiscoveryContext = {
    ...context,
    componentGraph: {
      ...context.componentGraph,
      components: { ...context.componentGraph.components },
      compositionEdges: [...context.componentGraph.compositionEdges],
      coordinationEdges: [...context.componentGraph.coordinationEdges],
      dataFlows: [...context.componentGraph.dataFlows],
    },
    sharedContracts: {
      ...context.sharedContracts,
      stateModels: [...context.sharedContracts.stateModels],
      eventRegistry: [...context.sharedContracts.eventRegistry],
      standardStates: [...context.sharedContracts.standardStates],
      dataFlows: [...context.sharedContracts.dataFlows],
    },
    componentRoles: [...context.componentRoles],
    productVocabulary: { ...context.productVocabulary },
  };

  let mergedCount = 0;
  const skipped: Relationship[] = [];
  const manualReview: Array<{ relationship: Relationship; reason: string }> = [];

  for (const rel of relationships) {
    const result = mergeRelationship(updatedContext, rel);

    if (result.merged) {
      mergedCount++;
    } else if (result.skipped) {
      skipped.push(rel);
    } else if (result.manualReviewReason) {
      manualReview.push({ relationship: rel, reason: result.manualReviewReason });
    }
  }

  logger.info(
    `Merge summary: ${mergedCount} merged, ${skipped.length} skipped (duplicates), ` +
      `${manualReview.length} flagged for manual review`
  );

  return { updatedContext, mergedCount, skipped, manualReview };
}

/**
 * Internal result for single relationship merge attempt.
 */
interface MergeAttemptResult {
  merged: boolean;
  skipped: boolean;
  manualReviewReason?: string;
}

/**
 * Attempts to merge a single relationship into context.
 * Mutates updatedContext if merge succeeds.
 *
 * @param context - Context to mutate
 * @param rel - Relationship to merge
 * @returns Merge attempt result
 */
function mergeRelationship(
  context: SystemDiscoveryContext,
  rel: Relationship
): MergeAttemptResult {
  const { operation } = rel;

  // Handle edit operations: flag for manual review (add-only policy)
  if (operation === 'edit_node' || operation === 'edit_edge') {
    return {
      merged: false,
      skipped: false,
      manualReviewReason: `Edit operations require manual review (add-only policy)`,
    };
  }

  // Handle add_node: add component, state model, or event
  if (operation === 'add_node') {
    return mergeAddNode(context, rel);
  }

  // Handle add_edge: add composition/coordination edge or data flow
  if (operation === 'add_edge') {
    return mergeAddEdge(context, rel);
  }

  // Unknown operation
  return {
    merged: false,
    skipped: false,
    manualReviewReason: `Unknown operation: ${operation}`,
  };
}

/**
 * Merges an add_node relationship.
 */
function mergeAddNode(
  context: SystemDiscoveryContext,
  rel: Relationship
): MergeAttemptResult {
  const { type, id } = rel;
  const canonicalName = rel.canonicalName ?? rel.name;

  if (!id || !canonicalName) {
    return {
      merged: false,
      skipped: false,
      manualReviewReason: 'add_node missing required fields (id, canonicalName or name)',
    };
  }

  if (type === 'component') {
    // Check if component already exists
    if (context.componentGraph.components[id]) {
      return { merged: false, skipped: true };
    }

    // Add component
    const component: Component = {
      id,
      productName: canonicalName,
      description: '',
    };
    context.componentGraph.components[id] = component;
    return { merged: true, skipped: false };
  }

  if (type === 'stateModel') {
    // Check if state model already exists
    if (context.sharedContracts.stateModels.some((sm) => sm.id === id)) {
      return { merged: false, skipped: true };
    }

    // Add state model
    const stateModel: StateModel = {
      id,
      name: canonicalName,
      description: '',
      owner: '',
      consumers: [],
    };
    context.sharedContracts.stateModels.push(stateModel);
    return { merged: true, skipped: false };
  }

  if (type === 'event') {
    // Check if event already exists
    if (context.sharedContracts.eventRegistry.some((e) => e.id === id)) {
      return { merged: false, skipped: true };
    }

    // Add event
    const event: EventDefinition = {
      id,
      name: canonicalName,
      payload: {},
      emitter: '',
      listeners: [],
    };
    context.sharedContracts.eventRegistry.push(event);
    return { merged: true, skipped: false };
  }

  return {
    merged: false,
    skipped: false,
    manualReviewReason: `Unknown node type: ${type}`,
  };
}

/**
 * Merges an add_edge relationship.
 */
function mergeAddEdge(
  context: SystemDiscoveryContext,
  rel: Relationship
): MergeAttemptResult {
  const { name, source, target } = rel;

  if (!name || !source || !target) {
    return {
      merged: false,
      skipped: false,
      manualReviewReason: 'add_edge missing required fields (name, source, target)',
    };
  }

  // Validate entities exist
  const sourceExists = context.componentGraph.components[source];
  const targetExists = context.componentGraph.components[target];

  if (!sourceExists || !targetExists) {
    return {
      merged: false,
      skipped: false,
      manualReviewReason: `Entity references do not exist (source: ${source}, target: ${target})`,
    };
  }

  // Determine edge type from relationship name
  if (name === 'composed-of' || name === 'contains') {
    // Composition edge
    const edgeExists = context.componentGraph.compositionEdges.some(
      (e) => e.parent === source && e.child === target
    );
    if (edgeExists) {
      return { merged: false, skipped: true };
    }

    context.componentGraph.compositionEdges.push({
      parent: source,
      child: target,
    });
    return { merged: true, skipped: false };
  }

  if (name === 'coordinates-with' || name === 'communicates-with') {
    // Coordination edge (types use via, not protocol)
    const edgeExists = context.componentGraph.coordinationEdges.some(
      (e) => e.from === source && e.to === target && e.via === name
    );
    if (edgeExists) {
      return { merged: false, skipped: true };
    }

    context.componentGraph.coordinationEdges.push({
      from: source,
      to: target,
      via: name,
    });
    return { merged: true, skipped: false };
  }

  // Unknown edge type
  return {
    merged: false,
    skipped: false,
    manualReviewReason: `Unknown edge type: ${name}`,
  };
}
