/**
 * Shared type definitions for the User Story Agent
 */

/**
 * All valid iteration categories
 */
export const ITERATION_CATEGORIES = [
  'roles',
  'elements',
  'validation',
  'quality',
  'responsive',
  'i18n',
  'analytics',
  'post-processing',
] as const;

/**
 * Category for grouping related iterations
 */
export type IterationCategory = (typeof ITERATION_CATEGORIES)[number];

/**
 * Definition for an iteration that can be applied to user stories
 */
export interface IterationDefinition {
  /** Unique identifier for the iteration */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this iteration does */
  description: string;
  /** Prompt template to use for this iteration */
  prompt: string;
  /** Category this iteration belongs to */
  category: IterationCategory;
  /** Optional description of when this iteration applies */
  applicableWhen?: string;
  /** Order for processing (lower numbers first) */
  order: number;
  /** Section paths this iteration is allowed to modify (patch-based scope) */
  allowedPaths?: PatchPath[];
  /** Output format: 'patches' for section-scoped advisors */
  outputFormat?: 'patches';
  /** Whether this iteration supports vision analysis (images) */
  supportsVision?: boolean;
}

/**
 * Context information about the product being developed
 */
export interface ProductContext {
  /** Name of the product */
  productName: string;
  /** Type of product (e.g., "web app", "mobile app", "API") */
  productType: string;
  /** Information about the client */
  clientInfo: string;
  /** Target audience description */
  targetAudience: string;
  /** List of key features */
  keyFeatures: string[];
  /** Business context and goals */
  businessContext: string;
  /** Optional specific requirements */
  specificRequirements?: string;
  /** Optional internationalization requirements */
  i18nRequirements?: string;
}

/**
 * Mode in which the agent operates
 */
export type AgentMode = 'individual' | 'workflow' | 'interactive' | 'system-workflow';

/**
 * Metadata for a user story
 */
export interface StoryMetadata {
  /** Story title */
  title: string;
  /** Story description */
  description: string;
  /** List of acceptance criteria */
  acceptanceCriteria: string[];
  /** Optional additional notes */
  additionalNotes?: string;
}

// ---------------------------------------------------------------------------
// Phase 1: User Story Generation System - Core Infrastructure Types
// ---------------------------------------------------------------------------

/**
 * List item with required id (e.g. acceptance criterion, behavior bullet)
 */
export interface Item {
  /** Unique identifier (e.g., "AC-OUT-001", "UVB-002") */
  id: string;
  /** Display text */
  text: string;
  /** Optional tags for categorization */
  tags?: string[];
  /** Advisor that created this item */
  sourceAdvisor?: string;
}

/**
 * Implementation notes grouped by concern (all required arrays)
 */
export interface ImplementationNotes {
  stateOwnership: Item[];
  dataFlow: Item[];
  apiContracts: Item[];
  loadingStates: Item[];
  performanceNotes: Item[];
  securityNotes: Item[];
  telemetryNotes: Item[];
}

/**
 * UI element to component mapping entry
 */
export interface UIMappingItem {
  /** Unique identifier */
  id: string;
  /** Product term (e.g., "heart icon", "save button") */
  productTerm: string;
  /** Component name from System Context */
  componentName: string;
  /** Optional stable contract ID from System Context */
  contractId?: string;
}

/**
 * Valid patch paths for section-scoped advisors
 */
export type PatchPath =
  | 'story.asA'
  | 'story.iWant'
  | 'story.soThat'
  | 'userVisibleBehavior'
  | 'outcomeAcceptanceCriteria'
  | 'systemAcceptanceCriteria'
  | 'implementationNotes.stateOwnership'
  | 'implementationNotes.dataFlow'
  | 'implementationNotes.apiContracts'
  | 'implementationNotes.loadingStates'
  | 'implementationNotes.performanceNotes'
  | 'implementationNotes.securityNotes'
  | 'implementationNotes.telemetryNotes'
  | 'uiMapping'
  | 'openQuestions'
  | 'edgeCases'
  | 'nonGoals';

/**
 * Single patch from an advisor (mechanical section scope)
 */
export interface SectionPatch {
  op: 'add' | 'replace' | 'remove';
  path: PatchPath;
  item?: Item;
  /** For replace/remove: match by id or exact text */
  match?: { id?: string; textEquals?: string };
  metadata: { advisorId: string; reasoning?: string };
}

/**
 * Output from an advisor (patches only)
 */
export interface AdvisorOutput {
  patches: SectionPatch[];
}

/**
 * Result of validating a single patch
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * Structured story data (single source of truth for rendering)
 */
export interface StoryStructure {
  storyStructureVersion: string;
  systemContextDigest: string;
  generatedAt: string;
  title: string;
  story: { asA: string; iWant: string; soThat: string };
  userVisibleBehavior: Item[];
  outcomeAcceptanceCriteria: Item[];
  systemAcceptanceCriteria: Item[];
  implementationNotes: ImplementationNotes;
  uiMapping?: UIMappingItem[];
  openQuestions?: Item[];
  edgeCases?: Item[];
  nonGoals?: Item[];
}

// ---------------------------------------------------------------------------
// Judge rubric and reports
// ---------------------------------------------------------------------------

/**
 * Unified judge rubric (all dimensions + relationship discovery)
 */
export interface JudgeRubric {
  sectionSeparation: {
    score: 0 | 1 | 2 | 3 | 4 | 5;
    reasoning: string;
    violations?: Array<{
      section: string;
      quote: string;
      suggestedRewrite: string;
    }>;
  };
  correctnessVsSystemContext: {
    score: 0 | 1 | 2 | 3 | 4 | 5;
    reasoning: string;
    hallucinations?: string[];
  };
  testability: {
    outcomeAC: { score: 0 | 1 | 2 | 3 | 4 | 5; reasoning: string };
    systemAC: { score: 0 | 1 | 2 | 3 | 4 | 5; reasoning: string };
  };
  completeness: {
    score: 0 | 1 | 2 | 3 | 4 | 5;
    reasoning: string;
    missingElements?: string[];
  };
  overallScore: 0 | 1 | 2 | 3 | 4 | 5;
  recommendation: 'approve' | 'rewrite' | 'manual-review';

  // Integrated relationship discovery
  newRelationships: Relationship[];
  needsSystemContextUpdate: boolean;
  confidenceByRelationship: Record<string, number>;
}

/**
 * Global consistency report across multiple stories
 */
export interface GlobalConsistencyReport {
  issues: ConsistencyIssue[];
  fixes: FixPatch[];
}

/**
 * Consistency issue found across stories
 */
export interface ConsistencyIssue {
  description: string;
  suggestedFixType: string;
  confidence: number;
  affectedStories: string[];
}

/**
 * Patch to fix consistency issue
 */
export interface FixPatch {
  type: 'add-bidirectional-link' | 'normalize-contract-id' | 'normalize-term-to-vocabulary';
  storyId: string;
  path: PatchPath;
  operation: 'add' | 'replace';
  item?: Item;
  match?: { id?: string };
  confidence: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// System discovery context (for judge / rewriter)
// ---------------------------------------------------------------------------

/**
 * Pass 0 LLM output: mentions and canonical names only (no IDs).
 * IDs are minted by ID Registry (USA-45).
 */
export interface SystemDiscoveryMentions {
  mentions: {
    components: string[];
    stateModels: string[];
    events: string[];
  };
  canonicalNames: Record<string, string[]>;
  evidence: Record<string, string>;
  vocabulary: Record<string, string>;
}

/**
 * System discovery context passed to judge and rewriter
 */
export interface SystemDiscoveryContext {
  componentGraph: ComponentGraph;
  sharedContracts: SharedContracts;
  componentRoles: ComponentRole[];
  productVocabulary: Record<string, string>;  // technical → product
  timestamp: string;
  referenceDocuments?: string[];
}

/**
 * Component/feature graph for system context
 */
export interface ComponentGraph {
  components: Record<string, Component>;
  compositionEdges: CompositionEdge[];
  coordinationEdges: CoordinationEdge[];
  dataFlows: DataFlow[];
}

/**
 * Component in the system
 */
export interface Component {
  id: string;  // Stable ID (e.g., "COMP-LOGIN-FORM")
  productName: string;
  technicalName?: string;
  description: string;
  children?: string[];
  dataSources?: string[];
  emittedEvents?: string[];
  consumedEvents?: string[];
}

/**
 * Parent-child composition edge
 */
export interface CompositionEdge {
  parent: string;
  child: string;
}

/**
 * Coordination edge (event/callback)
 */
export interface CoordinationEdge {
  from: string;
  to: string;
  via: string;  // event or callback name
}

/**
 * Shared contracts (APIs, events) known to the system
 */
export interface SharedContracts {
  stateModels: StateModel[];
  eventRegistry: EventDefinition[];
  standardStates: StandardState[];
  dataFlows: DataFlow[];
}

/**
 * State model owned by a component
 */
export interface StateModel {
  id: string;  // Stable ID: C-STATE-{NAME}
  name: string;
  description: string;
  owner: string;  // Component ID
  consumers: string[];  // Component IDs
}

/**
 * Event definition in the event registry
 */
export interface EventDefinition {
  id: string;  // Stable ID: E-{EVENT-NAME}
  name: string;
  payload: Record<string, string>;
  emitter: string;  // Component ID
  listeners: string[];  // Component IDs
}

/**
 * Data flow between components
 */
export interface DataFlow {
  id: string;  // Stable ID: DF-{FLOW-NAME}
  source: string;
  target: string;
  description: string;
}

/**
 * Standard UI state (loading, error, etc.)
 */
export interface StandardState {
  type: 'loading' | 'error' | 'empty' | 'success';
  description: string;
}

/**
 * Component role description
 */
export interface ComponentRole {
  componentId: string;
  role: string;
  description: string;
}

/**
 * Relationship between stories or components (discovered by judge)
 */
export interface Relationship {
  id: string;
  type: 'component' | 'event' | 'stateModel' | 'dataFlow';
  operation: 'add_node' | 'add_edge' | 'edit_node' | 'edit_edge';
  name: string;
  evidence: string;
  /** Display name for add_node (component/stateModel/event) - USA-47 */
  canonicalName?: string;
  /** Optional confidence score (0-1) for refinement loop filtering (USA-46) */
  confidence?: number;
  contractId?: string;
  emitter?: string;
  listeners?: string[];
  source?: string;
  target?: string;
}

// --- Story Interconnection types ---

/**
 * Pass 2 metadata: relationships and cross-references
 */
export interface StoryInterconnections {
  storyId: string;
  uiMapping: Record<string, string>;  // product term → component name
  contractDependencies: string[];  // Stable contract IDs
  ownership: {
    ownsState?: string[];
    consumesState?: string[];
    emitsEvents?: string[];
    listensToEvents?: string[];
  };
  relatedStories: RelatedStory[];
}

/**
 * Related story reference
 */
export interface RelatedStory {
  storyId: string;
  relationship: 'prerequisite' | 'parallel' | 'dependent' | 'related';
  description: string;
}

/**
 * Re-exports schema types for convenience
 */
export type { ChangeApplied, IterationOutput } from './schemas.js';
