/**
 * Zod schemas for validating structured output from Claude API
 */

import { z } from 'zod';

/**
 * Schema for a single change applied during an iteration
 */
export const ChangeAppliedSchema = z.object({
  /** Category of the change (e.g., "validation", "accessibility") */
  category: z.string().min(1),
  /** Description of what was changed */
  description: z.string().min(1),
  /** Optional location where the change was applied */
  location: z.string().optional(),
});

/**
 * Schema for the complete iteration output from Claude
 */
export const IterationOutputSchema = z.object({
  /** The complete enhanced user story text (required, non-empty) */
  enhancedStory: z.string().min(1),
  /** Array of changes that were applied during this iteration */
  changesApplied: z.array(ChangeAppliedSchema),
  /** Optional confidence score (0-1) indicating how confident Claude is in the output */
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Type derived from ChangeAppliedSchema
 */
export type ChangeApplied = z.infer<typeof ChangeAppliedSchema>;

/**
 * Type derived from IterationOutputSchema
 */
export type IterationOutput = z.infer<typeof IterationOutputSchema>;

/**
 * Schema for a single verification issue found during evaluation
 */
export const VerificationIssueSchema = z.object({
  /** Severity level of the issue */
  severity: z.enum(['error', 'warning', 'info']),
  /** Category of the issue (e.g., "coherence", "relevance") */
  category: z.string().min(1),
  /** Description of the issue */
  description: z.string().min(1),
  /** Optional suggestion for how to fix the issue */
  suggestion: z.string().optional(),
});

/**
 * Schema for the complete verification result from the evaluator
 */
export const VerificationResultSchema = z.object({
  /** Whether the verification passed */
  passed: z.boolean(),
  /** Quality score from 0.0 to 1.0 */
  score: z.number().min(0).max(1),
  /** Brief explanation of the evaluation */
  reasoning: z.string().min(1),
  /** Array of issues found during verification */
  issues: z.array(VerificationIssueSchema),
});

/**
 * Type derived from VerificationIssueSchema
 */
export type VerificationIssue = z.infer<typeof VerificationIssueSchema>;

/**
 * Type derived from VerificationResultSchema
 */
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ---------------------------------------------------------------------------
// Phase 1: Item, patches, advisor output
// ---------------------------------------------------------------------------

export const ItemSchema = z.object({
  id: z.string(),
  text: z.string(),
});

export const ImplementationNotesSchema = z.object({
  stateOwnership: z.array(ItemSchema),
  dataFlow: z.array(ItemSchema),
  apiContracts: z.array(ItemSchema),
  loadingStates: z.array(ItemSchema),
  performanceNotes: z.array(ItemSchema),
  securityNotes: z.array(ItemSchema),
  telemetryNotes: z.array(ItemSchema),
}).strict();

export const UIMappingItemSchema = z.object({
  id: z.string(),
  productTerm: z.string(),
  componentName: z.string(),
  contractId: z.string().optional(),
});

export const PatchPathSchema = z.enum([
  'story.asA', 'story.iWant', 'story.soThat', 'userVisibleBehavior',
  'outcomeAcceptanceCriteria', 'systemAcceptanceCriteria',
  'implementationNotes.stateOwnership', 'implementationNotes.dataFlow',
  'implementationNotes.apiContracts', 'implementationNotes.loadingStates',
  'implementationNotes.performanceNotes', 'implementationNotes.securityNotes',
  'implementationNotes.telemetryNotes', 'uiMapping', 'openQuestions',
  'edgeCases', 'nonGoals',
]);

export const SectionPatchSchema = z.object({
  op: z.enum(['add', 'replace', 'remove']),
  path: PatchPathSchema,
  item: ItemSchema.optional(),
  match: z
    .object({ id: z.string().optional(), textEquals: z.string().optional() })
    .refine((data) => !!data.id || !!data.textEquals, {
      message: 'match must have at least one of id or textEquals',
    })
    .optional(),
  metadata: z.object({ advisorId: z.string(), reasoning: z.string().optional() }),
});

export const AdvisorOutputSchema = z.object({
  patches: z.array(SectionPatchSchema),
  rawSummary: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Phase 1: Relationship, interconnections, global report
// ---------------------------------------------------------------------------

export const RelationshipSchema = z.object({
  id: z.string(),
  type: z.enum(['component', 'event', 'stateModel', 'dataFlow']),
  operation: z.enum(['add_node', 'add_edge', 'edit_node', 'edit_edge']),
  name: z.string(),
  evidence: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  contractId: z.string().optional(),
  emitter: z.string().optional(),
  listeners: z.array(z.string()).optional(),
  source: z.string().optional(),
  target: z.string().optional(),
});

export const RelatedStorySchema = z.object({
  storyId: z.string(),
  relationship: z.enum(['prerequisite', 'parallel', 'dependent', 'related']),
  description: z.string(),
});

export const StoryInterconnectionsSchema = z.object({
  storyId: z.string(),
  uiMapping: z.record(z.string(), z.string()),
  contractDependencies: z.array(z.string()),
  ownership: z.object({
    ownsState: z.array(z.string()).optional(),
    consumesState: z.array(z.string()).optional(),
    emitsEvents: z.array(z.string()).optional(),
    listensToEvents: z.array(z.string()).optional(),
  }),
  relatedStories: z.array(RelatedStorySchema),
});

export const ConsistencyIssueSchema = z.object({
  description: z.string(),
  suggestedFixType: z.string(),
  confidence: z.number().min(0).max(1),
  affectedStories: z.array(z.string()),
});

export const FixPatchSchema = z.object({
  type: z.enum(['add-bidirectional-link', 'normalize-contract-id', 'normalize-term-to-vocabulary']),
  storyId: z.string(),
  path: PatchPathSchema,
  operation: z.enum(['add', 'replace']),
  item: ItemSchema.optional(),
  match: z
    .object({ id: z.string().optional() })
    .refine((data) => !!data.id, { message: 'match must have id when provided' })
    .optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const GlobalConsistencyReportSchema = z.object({
  issues: z.array(ConsistencyIssueSchema),
  fixes: z.array(FixPatchSchema),
});

// ---------------------------------------------------------------------------
// System discovery: StateModel, EventDefinition, DataFlow, StandardState, ComponentRole
// ---------------------------------------------------------------------------

export const StateModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  owner: z.string(),
  consumers: z.array(z.string()),
});

export const EventDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  payload: z.record(z.string(), z.string()),
  emitter: z.string(),
  listeners: z.array(z.string()),
});

export const DataFlowSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  description: z.string(),
});

export const StandardStateSchema = z.object({
  type: z.enum(['loading', 'error', 'empty', 'success']),
  description: z.string(),
});

export const ComponentRoleSchema = z.object({
  componentId: z.string(),
  role: z.string(),
  description: z.string(),
});

// ---------------------------------------------------------------------------
// Component graph: Component, CompositionEdge, CoordinationEdge, ComponentGraph
// ---------------------------------------------------------------------------

export const ComponentSchema = z.object({
  id: z.string(),
  productName: z.string(),
  technicalName: z.string().optional(),
  description: z.string(),
  children: z.array(z.string()).optional(),
  dataSources: z.array(z.string()).optional(),
  emittedEvents: z.array(z.string()).optional(),
  consumedEvents: z.array(z.string()).optional(),
});

export const CompositionEdgeSchema = z.object({
  parent: z.string(),
  child: z.string(),
});

export const CoordinationEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  via: z.string(),
});

export const ComponentGraphSchema = z.object({
  components: z.record(z.string(), ComponentSchema),
  compositionEdges: z.array(CompositionEdgeSchema),
  coordinationEdges: z.array(CoordinationEdgeSchema),
  dataFlows: z.array(DataFlowSchema),
});

export const SharedContractsSchema = z.object({
  stateModels: z.array(StateModelSchema),
  eventRegistry: z.array(EventDefinitionSchema),
  standardStates: z.array(StandardStateSchema),
  dataFlows: z.array(DataFlowSchema),
});

/** Pass 0 LLM output: mentions and canonical names only (no IDs) */
export const SystemDiscoveryMentionsSchema = z.object({
  mentions: z.object({
    components: z.array(z.string()),
    stateModels: z.array(z.string()),
    events: z.array(z.string()),
  }),
  canonicalNames: z.record(z.string(), z.array(z.string())),
  evidence: z.record(z.string(), z.string()),
  vocabulary: z.record(z.string(), z.string()),
});

export const SystemDiscoveryContextSchema = z.object({
  componentGraph: ComponentGraphSchema,
  sharedContracts: SharedContractsSchema,
  componentRoles: z.array(ComponentRoleSchema),
  productVocabulary: z.record(z.string(), z.string()),
  timestamp: z.string(),
  referenceDocuments: z.array(z.string()).optional(),
});

/** @deprecated Use ComponentSchema */
export const ComponentGraphNodeSchema = ComponentSchema;

export const StoryStructureSchema = z.object({
  storyStructureVersion: z.string(),
  systemContextDigest: z.string(),
  generatedAt: z.string(),
  title: z.string(),
  story: z.object({ asA: z.string(), iWant: z.string(), soThat: z.string() }),
  userVisibleBehavior: z.array(ItemSchema),
  outcomeAcceptanceCriteria: z.array(ItemSchema),
  systemAcceptanceCriteria: z.array(ItemSchema),
  implementationNotes: ImplementationNotesSchema,
  uiMapping: z.array(UIMappingItemSchema).optional(),
  openQuestions: z.array(ItemSchema).optional(),
  edgeCases: z.array(ItemSchema).optional(),
  nonGoals: z.array(ItemSchema).optional(),
});

// ---------------------------------------------------------------------------
// Phase 1: Judge rubric (LLM output)
// ---------------------------------------------------------------------------

/** Score 0-5 as literal type for rubric dimensions */
const scoreLiteralSchema = z
  .number()
  .min(0)
  .max(5)
  .transform((n): 0 | 1 | 2 | 3 | 4 | 5 => Math.round(n) as 0 | 1 | 2 | 3 | 4 | 5);

export const SectionSeparationViolationSchema = z.object({
  section: z.string(),
  quote: z.string(),
  suggestedRewrite: z.string(),
});

export const SectionSeparationDimensionSchema = z.object({
  score: scoreLiteralSchema,
  reasoning: z.string(),
  violations: z.array(SectionSeparationViolationSchema).optional(),
});

export const CorrectnessDimensionSchema = z.object({
  score: scoreLiteralSchema,
  reasoning: z.string(),
  hallucinations: z.array(z.string()).optional(),
});

const TestabilitySubSchema = z.object({
  score: scoreLiteralSchema,
  reasoning: z.string(),
});

export const TestabilityDimensionSchema = z.object({
  outcomeAC: TestabilitySubSchema,
  systemAC: TestabilitySubSchema,
});

export const CompletenessDimensionSchema = z.object({
  score: scoreLiteralSchema,
  reasoning: z.string(),
  missingElements: z.array(z.string()).optional(),
});

/**
 * Schema for the unified story judge rubric (LLM response)
 */
export const JudgeRubricSchema = z.object({
  sectionSeparation: SectionSeparationDimensionSchema,
  correctnessVsSystemContext: CorrectnessDimensionSchema,
  testability: TestabilityDimensionSchema,
  completeness: CompletenessDimensionSchema,
  overallScore: scoreLiteralSchema,
  recommendation: z.enum(['approve', 'rewrite', 'manual-review']),
  newRelationships: z.array(RelationshipSchema),
  needsSystemContextUpdate: z.boolean(),
  confidenceByRelationship: z.record(z.string(), z.number().min(0).max(1)),
});
