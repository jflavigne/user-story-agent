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
