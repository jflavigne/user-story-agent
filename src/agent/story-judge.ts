/**
 * LLM judge for user story quality with unified rubric.
 * All dimensions (section separation, correctness, testability, completeness)
 * plus relationship discovery in a single call.
 */

import type { ClaudeClient } from './claude-client.js';
import type {
  JudgeRubric,
  GlobalConsistencyReport,
  SystemDiscoveryContext,
} from '../shared/types.js';
import { JudgeRubricSchema, GlobalConsistencyReportSchema } from '../shared/schemas.js';
import { UNIFIED_STORY_JUDGE_RUBRIC } from '../prompts/judge-rubrics/unified-story-judge.js';
import { GLOBAL_CONSISTENCY_JUDGE_PROMPT } from '../prompts/judge-rubrics/global-consistency.js';
import { extractJSON } from '../shared/json-utils.js';
import { logger } from '../utils/logger.js';

/** Normalize sectionSeparation.violations: string[] → structured objects for schema */
function normalizeJudgeRubricRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  const sectionSeparation = obj.sectionSeparation;
  if (sectionSeparation && typeof sectionSeparation === 'object') {
    const ss = sectionSeparation as Record<string, unknown>;
    const violations = ss.violations;
    if (Array.isArray(violations)) {
      const normalized = violations.map((v) => {
        if (typeof v === 'string') {
          return { section: '', quote: v, suggestedRewrite: '' };
        }
        if (v && typeof v === 'object' && 'section' in v && 'quote' in v && 'suggestedRewrite' in v) {
          return v;
        }
        return { section: '', quote: String(v), suggestedRewrite: '' };
      });
      ss.violations = normalized;
    }
  }
  return obj;
}

/**
 * Parse and validate raw LLM output into JudgeRubric.
 * Normalizes violations (string[] → structured), relies on schema for score rounding (float → 0-5 literal).
 *
 * @param raw - Raw JSON from LLM (may have extra text stripped by extractJSON)
 * @returns Valid JudgeRubric
 * @throws Error when validation fails
 */
export function parseJudgeRubric(raw: unknown): JudgeRubric {
  const normalized = normalizeJudgeRubricRaw(raw);
  const parsed = JudgeRubricSchema.safeParse(normalized);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    logger.warn(`Judge rubric parse errors: ${JSON.stringify(flattened)}`);
    throw new Error(`Invalid judge rubric: ${parsed.error.message}`);
  }
  return parsed.data as JudgeRubric;
}

/** Normalize global consistency raw: ensure issues/fixes are arrays */
function normalizeGlobalConsistencyRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.issues)) obj.issues = [];
  if (!Array.isArray(obj.fixes)) obj.fixes = [];
  return obj;
}

/**
 * Parse and validate raw LLM output into GlobalConsistencyReport.
 *
 * @param raw - Raw JSON from LLM
 * @returns Valid GlobalConsistencyReport or null when validation fails
 */
export function parseGlobalConsistencyReport(raw: unknown): GlobalConsistencyReport | null {
  const normalized = normalizeGlobalConsistencyRaw(raw);
  const parsed = GlobalConsistencyReportSchema.safeParse(normalized);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    logger.warn(`Global consistency parse errors: ${JSON.stringify(flattened)}`);
    return null;
  }
  return parsed.data as GlobalConsistencyReport;
}

/**
 * LLM judge with unified rubric (all dimensions + relationship detection).
 */
export class StoryJudge {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new StoryJudge instance.
   *
   * @param claudeClient - Claude client for API calls
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Judges a single story against the rubric and system context.
   *
   * @param story - Full story markdown
   * @param systemContext - System discovery context (components, contracts, etc.)
   * @param rubric - Rubric prompt text (defaults to unified rubric)
   * @returns Parsed judge rubric (scores, recommendation, newRelationships, etc.)
   */
  async judgeStory(
    story: string,
    systemContext: SystemDiscoveryContext,
    rubric: string = UNIFIED_STORY_JUDGE_RUBRIC
  ): Promise<JudgeRubric> {
    logger.debug('StoryJudge: judging story');

    const contextBlob = this.formatSystemContext(systemContext);
    const userMessage = `## System context\n${contextBlob}\n\n## Story to evaluate\n${story}\n\nEvaluate and respond with a single JSON object (no markdown code fence).`;

    const response = await this.claudeClient.sendMessage({
      systemPrompt: rubric,
      messages: [{ role: 'user', content: userMessage }],
    });

    const json = extractJSON(response.content);
    if (!json || typeof json !== 'object') {
      throw new Error('No valid JSON in judge response');
    }

    return parseJudgeRubric(json);
  }

  /**
   * Judges global consistency across multiple stories (e.g. issues, fixes).
   *
   * @param stories - Array of story markdown strings
   * @param systemContext - System discovery context
   * @returns Global consistency report (issues, fixes)
   */
  async judgeGlobalConsistency(
    stories: string[],
    systemContext: SystemDiscoveryContext
  ): Promise<GlobalConsistencyReport> {
    logger.debug(`StoryJudge: judging global consistency (${stories.length} stories)`);

    const contextBlob = this.formatSystemContext(systemContext);
    const storiesBlob = stories
      .map((s, i) => `### Story ${i + 1}\n${s}`)
      .join('\n\n');
    const userMessage = `## System context\n${contextBlob}\n\n## Stories\n${storiesBlob}\n\nAssess consistency across these stories. Respond with only the GlobalConsistencyReport JSON (no markdown fence, no extra text).`;

    const response = await this.claudeClient.sendMessage({
      systemPrompt: GLOBAL_CONSISTENCY_JUDGE_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const json = extractJSON(response.content);
    if (!json || typeof json !== 'object') {
      return {
        issues: [{ description: 'Failed to parse consistency response', suggestedFixType: 'unknown', confidence: 0, affectedStories: [] }],
        fixes: [],
      };
    }

    const report = parseGlobalConsistencyReport(json);
    if (report) return report;
    return {
      issues: [{ description: 'Invalid consistency response', suggestedFixType: 'unknown', confidence: 0, affectedStories: [] }],
      fixes: [],
    };
  }

  private formatSystemContext(ctx: SystemDiscoveryContext): string {
    const parts: string[] = [];
    if (ctx.timestamp) parts.push(`Timestamp: ${ctx.timestamp}`);
    const components = ctx.componentGraph ? Object.values(ctx.componentGraph.components) : [];
    if (components.length) {
      parts.push('Components: ' + components.map((c) => `${c.id} (${c.productName})`).join(', '));
    }
    const compEdges = ctx.componentGraph?.compositionEdges ?? [];
    if (compEdges.length) {
      parts.push('Composition: ' + compEdges.map((e) => `${e.parent}→${e.child}`).join(', '));
    }
    const coordEdges = ctx.componentGraph?.coordinationEdges ?? [];
    if (coordEdges.length) {
      parts.push('Coordination: ' + coordEdges.map((e) => `${e.from}→${e.to} (${e.via})`).join(', '));
    }
    const dataFlows = ctx.componentGraph?.dataFlows ?? [];
    if (dataFlows.length) {
      parts.push('Data flows: ' + dataFlows.map((d) => `${d.source}→${d.target}`).join(', '));
    }
    const stateModels = ctx.sharedContracts?.stateModels ?? [];
    if (stateModels.length) {
      parts.push('State models: ' + stateModels.map((s) => s.id).join(', '));
    }
    const eventRegistry = ctx.sharedContracts?.eventRegistry ?? [];
    if (eventRegistry.length) {
      parts.push('Events: ' + eventRegistry.map((e) => e.id).join(', '));
    }
    const standardStates = ctx.sharedContracts?.standardStates ?? [];
    if (standardStates.length) {
      parts.push('Standard states: ' + standardStates.map((s) => s.type).join(', '));
    }
    const contractDataFlows = ctx.sharedContracts?.dataFlows ?? [];
    if (contractDataFlows.length) {
      parts.push('Contract data flows: ' + contractDataFlows.map((d) => d.id).join(', '));
    }
    if (ctx.componentRoles?.length) {
      parts.push('Roles: ' + ctx.componentRoles.map((r) => `${r.componentId}: ${r.role}`).join(', '));
    }
    const vocabEntries = ctx.productVocabulary ? Object.entries(ctx.productVocabulary) : [];
    if (vocabEntries.length) {
      parts.push('Vocabulary: ' + vocabEntries.map(([k, v]) => `${k}→${v}`).join(', '));
    }
    if (ctx.referenceDocuments?.length) {
      parts.push('Reference documents: ' + ctx.referenceDocuments.length + ' item(s)');
    }
    return parts.length > 0 ? parts.join('\n') : '(no system context)';
  }
}
