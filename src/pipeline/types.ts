/**
 * Core types for the Figma Intake Pipeline.
 *
 * Note: PlannedStory type (story seeds for multi-pass generation) is defined in:
 * - user-story-agent/src/shared/types.ts (canonical source)
 * - Re-exported from src/pipeline/story-adapter.ts (adapter implementation)
 *
 * PlannedStory represents INPUT to UserStoryAgent (seed, order, componentRef, level).
 * It is NOT the final story output (which has id, title, description, acceptanceCriteria).
 */

import type { ImageBlockParam } from "@anthropic-ai/sdk/resources";

/** Re-export ComponentRow from table-parser for convenience */
export type { ComponentRow } from "../figma/table-parser.js";

import { z } from "zod";

/** Minimal ImageInput shape for UserStoryAgent mockupImages (path, url, base64, mediaType). */
export interface ImageInput {
  path?: string;
  url?: string;
  base64?: string;
  mediaType?: string;
}

/** Minimal FigmaComponent shape returned by autoDetectFigmaComponents. */
export interface FigmaComponentStub {
  id: string;
  name: string;
  key: string;
  type: string;
  description?: string;
  confidence: number;
  signals: string[];
}

/** Result of autoDetectFigmaComponents (images + components). */
export interface FigmaDetectResult {
  images: ImageBlockParam[];
  components: FigmaComponentStub[];
}

/** Minimal agent config for orchestration (mode, apiKey, mockupImages, productContext). */
export interface OrchestratorAgentConfig {
  mode: "system-workflow";
  apiKey: string;
  mockupImages?: ImageInput[];
  productContext?: {
    productName: string;
    productType: string;
    clientInfo: string;
    targetAudience: string;
    keyFeatures: string[];
    businessContext: string;
    specificRequirements?: string;
  };
}

/** Agent instance shape: runSystemWorkflow(seeds, refs?). */
export interface OrchestratorAgentInstance {
  runSystemWorkflow(
    stories: string[],
    referenceDocuments?: string[]
  ): Promise<SystemWorkflowResultStub>;
}

/** Result of orchestrate(): workflow result plus component images for markdown embedding. */
export interface OrchestratorResult {
  result: SystemWorkflowResultStub;
  componentImages: Map<string, ImageInput[]>;
}

/** Minimal SystemWorkflowResult for orchestrator return type. */
export interface SystemWorkflowResultStub {
  systemContext: unknown;
  stories: Array<{
    id: string;
    /** Omitted or null when outputDir is used (streamed to disk). */
    content?: string | null;
    /** Set when outputDir is used. */
    filepath?: string;
    /** Set when outputDir is used. */
    hasTechnicalRef?: boolean;
    structure?: unknown;
    interconnections: unknown;
    judgeResults?: unknown;
    needsManualReview?: { reason: string; score: number };
  }>;
  consistencyReport: { issues: unknown[]; fixes: unknown[] };
  metadata: {
    passesCompleted: string[];
    refinementRounds: number;
    fixesApplied: number;
    fixesFlaggedForReview: number;
    titleGenerationFailures?: number;
    planMessage?: string;
    totalComponents?: number;
  };
  relationships?: unknown[];
}

/** Dependencies for orchestrator (injectable for tests). */
export interface OrchestratorDeps {
  autoDetectFigmaComponents: (
    figmaUrl: string,
    accessToken: string
  ) => Promise<FigmaDetectResult>;
  UserStoryAgent: new (
    config: OrchestratorAgentConfig
  ) => OrchestratorAgentInstance;
}

/** Options for orchestrate(). */
export interface OrchestratorOptions {
  /** Anthropic API key for UserStoryAgent. */
  apiKey: string;
  /** Figma file URL for downloading component screenshots (enables vision when with figmaToken). */
  figmaUrl?: string;
  /** Figma access token; when undefined, vision is disabled (text-only mode). */
  figmaToken?: string;
  /** Injected dependencies (required; pass mocks in tests). */
  deps: OrchestratorDeps;
  /** When set, each story is saved to this directory immediately and only metadata is retained (id, filepath, hasTechnicalRef). */
  outputDir?: string;
  /** Optional image cache to avoid redundant downloads. */
  cache?: import("../cache/figma-image-cache.js").FigmaImageCache;
}

/**
 * Functional Discovery Brief: Pass 0 structured output.
 * Extracts implementation-relevant information from component mockups.
 * Separates observed, inferred, and unknown to prevent hallucination.
 * Allows uncertainty - use "unknown" rather than inventing precision.
 */
export interface FunctionalDiscoveryBrief {
  /** Component classification and boundaries */
  classification: {
    canonicalNameSuggestion: string; // Can differ from CSV if CSV name doesn't match visual
    csvName?: string; // Original CSV name for reference
    componentType: "atom" | "molecule" | "organism" | "screen";
    uiCategory: "button" | "input" | "form" | "modal" | "list" | "navigation" | "grid" | "container" | "layout" | "media" | "text" | "icon" | "other";
    boundaries: string; // What's included/excluded in this component
    basis: "observed" | "inferred"; // How certain are we
  };

  /** User actions and emitted events */
  userActions: Array<{
    action: string; // e.g., "Click primary button"
    trigger: string; // e.g., "Mouse click, Enter key, Space bar"
    emittedEvent: string | "unknown"; // e.g., "onApply(filters)" or "unknown"
    outcome: string; // What happens after action
    basis: "observed" | "inferred"; // Seen in mockup or assumed
  }>;

  /** State model and transitions */
  stateModel: {
    states: Array<{ state: string; basis: "observed" | "inferred" }>; // e.g., [{ state: "default", basis: "observed" }]
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      basis: "observed" | "inferred";
    }>;
    dataRequirements: string[]; // What data drives state changes
  };

  /** Data contract / likely props */
  dataContract: {
    likelyProps: Array<{
      propName: string;
      propType: string | "unknown"; // TypeScript-style type or "unknown"
      purpose: string;
      required: boolean | "unknown"; // Allow uncertainty
      basis: "observed" | "inferred";
    }>;
    likelyEvents: Array<{
      eventName: string;
      signature: string | "unknown"; // e.g., "(filters: Filter[]) => void" or "unknown"
      purpose: string;
      basis: "observed" | "inferred";
    }>;
  };

  /** Accessibility and keyboard expectations */
  accessibility: {
    ariaRole: string | "unknown"; // Allow unknown
    keyboardNav: string[]; // e.g., ["Tab to focus", "Enter to activate"]
    screenReaderExpectations: string;
    focusManagement: string;
    basis: "observed" | "inferred" | "standard-pattern"; // Can be standard practice
  };

  /** Edge cases observed or inferred */
  edgeCases: Array<{
    case: string; // e.g., "Empty state", "Long text overflow"
    basis: "observed" | "inferred" | "both"; // Allow "both" for ambiguous cases
  }>;

  /** Assumptions and open questions */
  assumptionsAndQuestions: {
    assumptions: Array<{
      assumption: string; // What we're assuming based on visuals
      reasoning: string; // Why this assumption
    }>;
    openQuestions: string[]; // What's unclear from mockups - CRITICAL to populate
  };

  /** Evidence anchors */
  evidenceAnchors: {
    primaryImage: string; // Description of primary evidence
    contextImages: string[]; // Descriptions of context evidence
    confidence: "high" | "medium" | "low"; // Confidence in this analysis
  };

  /** Warnings and uncertainties */
  warnings: string[]; // Place to express "this is unclear" without breaking schema

  /** Raw mentions (lightweight 0A) - defer mapping until multi-component context */
  rawMentions?: string[]; // Component names seen but not fully analyzed
  // Note: NO canonicalMapping yet - that's a cross-component problem, defer to later pass
}

/**
 * Zod schema that MATCHES the FunctionalDiscoveryBrief TypeScript interface.
 * CRITICAL: Keep this in sync with the interface - one source of truth.
 */
export const FunctionalDiscoveryBriefSchema = z.object({
  classification: z.object({
    canonicalNameSuggestion: z.string(),
    csvName: z.string().optional(),
    componentType: z.enum(["atom", "molecule", "organism", "screen"]),
    uiCategory: z.enum(["button", "input", "form", "modal", "list", "navigation", "grid", "container", "layout", "media", "text", "icon", "other"]),
    boundaries: z.string(),
    basis: z.enum(["observed", "inferred"]),
  }),
  userActions: z.array(
    z.object({
      action: z.string(),
      trigger: z.string(),
      emittedEvent: z.union([z.string(), z.literal("unknown")]),
      outcome: z.string(),
      basis: z.enum(["observed", "inferred"]),
    })
  ),
  stateModel: z.object({
    states: z.array(
      z.object({
        state: z.string(),
        basis: z.enum(["observed", "inferred"]),
      })
    ),
    transitions: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        trigger: z.string(),
        basis: z.enum(["observed", "inferred"]),
      })
    ),
    dataRequirements: z.array(z.string()),
  }),
  dataContract: z.object({
    likelyProps: z.array(
      z.object({
        propName: z.string(),
        propType: z.union([z.string(), z.literal("unknown")]),
        purpose: z.string(),
        required: z.union([z.boolean(), z.literal("unknown")]),
        basis: z.enum(["observed", "inferred"]),
      })
    ),
    likelyEvents: z.array(
      z.object({
        eventName: z.string(),
        signature: z.union([z.string(), z.literal("unknown")]),
        purpose: z.string(),
        basis: z.enum(["observed", "inferred"]),
      })
    ),
  }),
  accessibility: z.object({
    ariaRole: z.union([z.string(), z.literal("unknown")]),
    keyboardNav: z.array(z.string()),
    screenReaderExpectations: z.string(),
    focusManagement: z.string(),
    basis: z.enum(["observed", "inferred", "standard-pattern"]),
  }),
  edgeCases: z.array(
    z.object({
      case: z.string(),
      basis: z.enum(["observed", "inferred", "both"]),
    })
  ),
  assumptionsAndQuestions: z.object({
    assumptions: z.array(
      z.object({
        assumption: z.string(),
        reasoning: z.string(),
      })
    ),
    openQuestions: z.array(z.string()),
  }),
  evidenceAnchors: z.object({
    primaryImage: z.string(),
    contextImages: z.array(z.string()),
    confidence: z.enum(["high", "medium", "low"]),
  }),
  warnings: z.array(z.string()),
  rawMentions: z.array(z.string()).optional(),
});
