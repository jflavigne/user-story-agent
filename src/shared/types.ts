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
] as const;

/**
 * Category for grouping related iterations
 */
export type IterationCategory = typeof ITERATION_CATEGORIES[number];

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
export type AgentMode = 'individual' | 'workflow' | 'interactive';

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
